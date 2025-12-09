import { ai } from "../services/geminiService";
import { SESSION_SCHEMA } from "../schemas/sessionSchema";
import { PromptComposer } from "./PromptComposer";
import { RetryPolicy } from "./RetryPolicy";
import { SessionData, SessionRequest, GeneratedImage, Organizer, ResourceUpdateCallback } from "../types";
import { Type, Schema } from "@google/genai";
import { slugify } from "../utils/normalization";
import { Prompts } from "../prompts";
import { ExternalResourceResolver } from "./ExternalResourceResolver";

export class SessionGenerator {
    private static retryPolicy = new RetryPolicy();
    private static textModelId = "gemini-2.5-flash";
    private static imageModelId = "gemini-2.5-flash-image";

    /**
     * LEGACY: Blocking generation.
     */
    static async generate(request: SessionRequest): Promise<SessionData> {
        return this.generateWithCallback(request);
    }

    /**
     * NON-BLOCKING: Returns session immediately after text generation.
     * Resources (images, diagrams, external links) are generated in background.
     */
    static async generateWithCallback(
        request: SessionRequest,
        onResourceUpdate?: ResourceUpdateCallback
    ): Promise<SessionData> {
        const fullPrompt = PromptComposer.compose(request);

        // FLOW A: Text Pipeline - Generate Structure (~10-15s)
        let sessionData = await this.generateTextSession(fullPrompt);

        // Defense in Depth: Validate IDs and Structure  
        sessionData = this.validateSessionData(sessionData);

        // Mark all images as loading initially
        if (sessionData.resources?.images) {
            sessionData.resources.images = sessionData.resources.images.map(img => ({
                ...img,
                isLoading: true
            }));
        }

        // FLOW B: Resources Pipeline - Background (fire-and-forget)
        this.enrichResourcesBackground(sessionData, request, onResourceUpdate);

        return sessionData; // Return immediately
    }

    static async recoverImages(data: SessionData): Promise<SessionData> {
        if (!data.resources || !data.resources.images) return data;

        const newData = { ...data };
        newData.resources = { ...data.resources };
        newData.resources.images = [...data.resources.images];

        const imagePromises = newData.resources.images.map(async (img) => {
            if (img.base64Data) return img;
            try {
                const base64 = await this.generateImage(img.prompt);
                return { ...img, base64Data: base64, isLoading: false };
            } catch (e) {
                console.error(`Failed to recover image: ${img.title}`, e);
                return img;
            }
        });

        newData.resources.images = await Promise.all(imagePromises);
        return newData;
    }

    static async regenerateSection(
        currentData: SessionData,
        sectionKey: keyof SessionData,
        instructions: string
    ): Promise<any> {
        let partialSchema: any;

        if (SESSION_SCHEMA.properties && SESSION_SCHEMA.properties[sectionKey]) {
            partialSchema = {
                type: Type.OBJECT,
                properties: {
                    [sectionKey]: SESSION_SCHEMA.properties[sectionKey]
                },
                required: [sectionKey]
            };
        } else {
            throw new Error("Invalid section key for regeneration");
        }

        const prompt = PromptComposer.composeRegeneration(
            String(sectionKey),
            currentData[sectionKey],
            instructions
        );

        return this.retryPolicy.execute(async () => {
            const response = await ai.models.generateContent({
                model: this.textModelId,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: partialSchema
                }
            });

            const jsonText = response.text;
            if (!jsonText) throw new Error("Empty regeneration response");
            const parsed = JSON.parse(jsonText);
            return parsed[sectionKey];
        });
    }

    // --- Private Helpers ---

    private static async generateTextSession(prompt: string): Promise<SessionData> {
        return this.retryPolicy.execute(async () => {
            const response = await ai.models.generateContent({
                model: this.textModelId,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: SESSION_SCHEMA,
                },
            });

            const jsonText = response.text;
            if (!jsonText) throw new Error("Empty response from Gemini");
            return JSON.parse(jsonText) as SessionData;
        });
    }

    private static validateSessionData(data: SessionData): SessionData {
        if (data.resources?.organizer && !data.resources.organizer.id) {
            data.resources.organizer.id = `org-${slugify(data.sessionTitle).slice(0, 10)}`;
        }
        if (data.resources?.images) {
            data.resources.images.forEach((img, idx) => {
                if (!img.id) {
                    img.id = `img-${idx}-${slugify(img.title).slice(0, 15)}`;
                }
            });
        }
        if (!data.resources.diagrams) {
            data.resources.diagrams = [];
        }
        return data;
    }

    /**
     * Background resource enrichment loop.
     */
    private static async enrichResourcesBackground(
        data: SessionData,
        request: SessionRequest,
        onUpdate?: ResourceUpdateCallback
    ): Promise<void> {
        const resources = data.resources;

        // 1. Generate images (Parallel)
        const imagePromises = (resources.images || []).map(async (img) => {
            if (img.base64Data) {
                onUpdate?.('image', img.id, { ...img, isLoading: false });
                return;
            }
            try {
                const base64 = await this.generateImage(img.prompt);
                onUpdate?.('image', img.id, { ...img, base64Data: base64, isLoading: false });
            } catch (e) {
                console.error(`Failed to generate image: ${img.title}`, e);
                onUpdate?.('image', img.id, { ...img, isLoading: false, error: 'Failed' });
            }
        });

        // 2. Generate extra diagrams (Parallel)
        const diagramPromises = this.scanAndGenerateDiagramsWithCallback(data, request, onUpdate);

        // 3. Resolve External Links (VID_YT / IMG_URL with SEARCH:)
        // We assume scanAndResolveLinksWithCallback handles the parallel logic internally
        const linkPromises = this.scanAndResolveLinksWithCallback(data, onUpdate);

        // Wait for all to finish (fire-and-forget from caller perspective)
        await Promise.all([
            Promise.allSettled(imagePromises),
            diagramPromises,
            linkPromises
        ]);
    }

    private static async scanAndResolveLinksWithCallback(
        data: SessionData, 
        onUpdate?: ResourceUpdateCallback
    ): Promise<void> {
        // Sections to scan
        const sections: { key: keyof SessionData, subKey: string, items: string[] }[] = [
            { key: 'inicio', subKey: 'materiales', items: data.inicio.materiales },
            { key: 'desarrollo', subKey: 'materiales', items: data.desarrollo.materiales },
            { key: 'cierre', subKey: 'materiales', items: data.cierre.materiales },
            { key: 'tareaCasa', subKey: 'materiales', items: data.tareaCasa.materiales }
        ];

        // Flatten all items that need resolution
        // Look for: "VID_YT: ... :: SEARCH: ..." or "IMG_URL: ... :: SEARCH: ..."
        const resolutionTasks: Array<() => Promise<void>> = [];

        sections.forEach(section => {
            section.items.forEach((item, index) => {
                const searchMatch = item.match(/^(VID_YT|IMG_URL):\s*(.+?)\s*::\s*SEARCH:\s*(.+)$/i);
                
                if (searchMatch) {
                    const typeTag = searchMatch[1].toUpperCase() as 'VID_YT' | 'IMG_URL';
                    const title = searchMatch[2];
                    const query = searchMatch[3];
                    const resourceType = typeTag === 'VID_YT' ? 'video' : 'image';

                    resolutionTasks.push(async () => {
                        const resolved = await ExternalResourceResolver.resolveLink(query, resourceType);
                        if (resolved) {
                            // Replace item in the array
                            const newItem = `${typeTag}: ${resolved.title} :: ${resolved.url}`;
                            section.items[index] = newItem; // Update in place for local data reference
                            
                            // Notify UI to update specific section
                            onUpdate?.('section_update', `${section.key}-${section.subKey}`, {
                                section: section.key,
                                field: section.subKey,
                                value: [...section.items] // Send copy of updated array
                            });
                        }
                    });
                }
            });
        });

        await Promise.allSettled(resolutionTasks.map(task => task()));
    }

    private static async scanAndGenerateDiagramsWithCallback(
        data: SessionData,
        request: SessionRequest,
        onUpdate?: ResourceUpdateCallback
    ): Promise<void> {
        const diagPrompts: { title: string; instruction: string }[] = [];

        const scanList = (items: string[]) => {
            items.forEach(item => {
                const match = item.match(/DIAG_PROMPT:\s*(.+?)\s*::\s*(.+)/);
                if (match) {
                    diagPrompts.push({ title: match[1], instruction: match[2] });
                }
            });
        };

        if (data.inicio?.materiales) scanList(data.inicio.materiales);
        if (data.desarrollo?.materiales) scanList(data.desarrollo.materiales);
        if (data.cierre?.materiales) scanList(data.cierre.materiales);
        if (data.tareaCasa?.materiales) scanList(data.tareaCasa.materiales);

        if (diagPrompts.length === 0) return;

        await Promise.allSettled(diagPrompts.map(async (dp, idx) => {
            try {
                const promptText = `${Prompts.diagramas.instruction}\n\n` +
                    `CONTEXTO:\nNivel: ${request.nivel}, Grado: ${request.grado}, Area: ${request.area}\n` +
                    `DIAGRAM REQUEST: Title: "${dp.title}", Instruction: "${dp.instruction}"\n\n` +
                    `${Prompts.diagramas.outputContract}\n${Prompts.diagramas.guidelines?.join('\n') || ''}`;

                const response = await ai.models.generateContent({
                    model: this.textModelId,
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    config: { responseMimeType: "application/json" }
                });

                const json = JSON.parse(response.text || "{}");
                if (json.organizer) {
                    const org: Organizer = json.organizer;
                    if (!org.id) org.id = `extra-diag-${idx}-${slugify(dp.title).slice(0, 10)}`;
                    onUpdate?.('diagram', org.id, org);
                }
            } catch (e) {
                console.error(`Failed to generate extra diagram: ${dp.title}`, e);
            }
        }));
    }

    private static async generateImage(prompt: string): Promise<string> {
        const response = await ai.models.generateContent({
            model: this.imageModelId,
            contents: { parts: [{ text: prompt }] },
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No image data found in response");
    }

    // Fallback for logic still using the old method if any
    private static async enrichResources(data: SessionData, request: SessionRequest): Promise<SessionData> {
        await this.enrichResourcesBackground(data, request);
        return data;
    }
}