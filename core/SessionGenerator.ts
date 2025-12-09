import { ai } from "../services/geminiService";
import { SESSION_SCHEMA } from "../schemas/sessionSchema";
import { PromptComposer } from "./PromptComposer";
import { RetryPolicy } from "./RetryPolicy";
import { SessionData, SessionRequest, GeneratedImage, Organizer, ResourceUpdateCallback } from "../types";
import { Type, Schema } from "@google/genai";
import { slugify } from "../utils/normalization";
import { Prompts } from "../prompts";

export class SessionGenerator {
    private static retryPolicy = new RetryPolicy();
    private static textModelId = "gemini-2.5-flash";
    private static imageModelId = "gemini-2.5-flash-preview-05-20";

    /**
     * LEGACY: Blocking generation - waits for all resources before returning.
     * Use generateWithCallback for better UX.
     */
    static async generate(request: SessionRequest): Promise<SessionData> {
        const fullPrompt = PromptComposer.compose(request);

        // FLOW A: Text Pipeline - Generate Structure
        let sessionData = await this.generateTextSession(fullPrompt);

        // Defense in Depth: Validate IDs and Structure
        sessionData = this.validateSessionData(sessionData);

        // FLOW B: Resources Pipeline - Enrich with Images and Extra Diagrams
        // This runs efficiently without blocking the initial structure return conceptually,
        // but here we await it to deliver the full "ready" session to the user.
        sessionData = await this.enrichResources(sessionData, request);

        return sessionData;
    }

    /**
     * NON-BLOCKING: Returns session immediately after text generation.
     * Resources are generated in background with progress callbacks.
     * 
     * @param request - Session generation request
     * @param onResourceUpdate - Callback fired when each resource completes
     * @returns SessionData with images marked as isLoading: true
     */
    static async generateWithCallback(
        request: SessionRequest,
        onResourceUpdate?: ResourceUpdateCallback
    ): Promise<SessionData> {
        const fullPrompt = PromptComposer.compose(request);

        // FLOW A: Text Pipeline - Generate Structure (~15s)
        let sessionData = await this.generateTextSession(fullPrompt);

        // Defense in Depth: Validate IDs and Structure  
        sessionData = this.validateSessionData(sessionData);

        // Mark all images as loading
        if (sessionData.resources?.images) {
            sessionData.resources.images = sessionData.resources.images.map(img => ({
                ...img,
                isLoading: true
            }));
        }

        // FLOW B: Resources Pipeline - Background (fire-and-forget with callbacks)
        // Don't await - let it run in background
        this.enrichResourcesBackground(sessionData, request, onResourceUpdate);

        return sessionData; // Return immediately with placeholder images
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
        // 1. Ensure Organizer ID
        if (data.resources?.organizer) {
            if (!data.resources.organizer.id) {
                data.resources.organizer.id = `org-${slugify(data.sessionTitle).slice(0, 10)}`;
            }
        }

        // 2. Ensure Image IDs
        if (data.resources?.images) {
            data.resources.images.forEach((img, idx) => {
                if (!img.id) {
                    img.id = `img-${idx}-${slugify(img.title).slice(0, 15)}`;
                }
            });
        }

        // 3. Ensure diagrams array exists
        if (!data.resources.diagrams) {
            data.resources.diagrams = [];
        }

        return data;
    }

    private static async enrichResources(data: SessionData, request: SessionRequest): Promise<SessionData> {
        const resources = data.resources;

        // 1. Image Generation (Parallel)
        const imagePromises = (resources.images || []).map(async (img) => {
            if (img.base64Data) return img;
            try {
                const base64 = await this.generateImage(img.prompt);
                return { ...img, base64Data: base64, isLoading: false };
            } catch (e) {
                console.error(`Failed to generate image: ${img.title}`, e);
                // Return item without data, UI will handle fallback
                return { ...img, isLoading: false };
            }
        });

        // 2. Scan and Generate Extra Diagrams (Parallel to images)
        // Looks for "DIAG_PROMPT: Title :: Instruction" in material lists
        const diagramPromises = this.scanAndGenerateDiagrams(data, request);

        // Wait for all resource tasks
        const [images, diagrams] = await Promise.all([
            Promise.all(imagePromises),
            diagramPromises
        ]);

        // Update data
        data.resources.images = images;
        if (diagrams.length > 0) {
            data.resources.diagrams = [...(data.resources.diagrams || []), ...diagrams];
        }

        return data;
    }

    /**
     * Background resource enrichment with individual callbacks.
     * Each resource is processed independently and fires a callback when done.
     * This runs in background (fire-and-forget) from generateWithCallback.
     */
    private static async enrichResourcesBackground(
        data: SessionData,
        request: SessionRequest,
        onUpdate?: ResourceUpdateCallback
    ): Promise<void> {
        const resources = data.resources;

        // 1. Generate images individually with callbacks (parallel but independent)
        const imagePromises = (resources.images || []).map(async (img) => {
            if (img.base64Data) {
                // Already has data, just notify
                onUpdate?.('image', img.id, { ...img, isLoading: false });
                return;
            }

            try {
                const base64 = await this.generateImage(img.prompt);
                const updatedImg: GeneratedImage = {
                    ...img,
                    base64Data: base64,
                    isLoading: false
                };
                // Fire callback with completed image
                onUpdate?.('image', img.id, updatedImg);
            } catch (e) {
                console.error(`Failed to generate image: ${img.title}`, e);
                const errorImg: GeneratedImage = {
                    ...img,
                    isLoading: false,
                    error: e instanceof Error ? e.message : 'Generation failed'
                };
                onUpdate?.('image', img.id, errorImg);
            }
        });

        // 2. Generate extra diagrams in parallel
        const diagramPromises = this.scanAndGenerateDiagramsWithCallback(data, request, onUpdate);

        // Wait for all (but don't block caller since this is fire-and-forget)
        await Promise.all([
            Promise.allSettled(imagePromises),
            diagramPromises
        ]);
    }

    /**
     * Scan for DIAG_PROMPT and generate diagrams with individual callbacks.
     */
    private static async scanAndGenerateDiagramsWithCallback(
        data: SessionData,
        request: SessionRequest,
        onUpdate?: ResourceUpdateCallback
    ): Promise<void> {
        const diagPrompts: { title: string; instruction: string }[] = [];

        // Helper to scan a list of strings
        const scanList = (items: string[]) => {
            items.forEach(item => {
                const match = item.match(/DIAG_PROMPT:\s*(.+?)\s*::\s*(.+)/);
                if (match) {
                    diagPrompts.push({ title: match[1], instruction: match[2] });
                }
            });
        };

        // Scan all material sections
        if (data.inicio?.materiales) scanList(data.inicio.materiales);
        if (data.desarrollo?.materiales) scanList(data.desarrollo.materiales);
        if (data.cierre?.materiales) scanList(data.cierre.materiales);
        if (data.tareaCasa?.materiales) scanList(data.tareaCasa.materiales);

        if (diagPrompts.length === 0) return;

        // Generate diagrams individually with callbacks
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
            // No specific config needed for current image model behavior
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

    private static async scanAndGenerateDiagrams(data: SessionData, request: SessionRequest): Promise<Organizer[]> {
        const diagPrompts: { title: string; instruction: string }[] = [];

        // Helper to scan a list of strings
        const scanList = (items: string[]) => {
            items.forEach(item => {
                // Match: DIAG_PROMPT: Title :: Instruction
                const match = item.match(/DIAG_PROMPT:\s*(.+?)\s*::\s*(.+)/);
                if (match) {
                    diagPrompts.push({ title: match[1], instruction: match[2] });
                }
            });
        };

        // Scan all material sections
        if (data.inicio?.materiales) scanList(data.inicio.materiales);
        if (data.desarrollo?.materiales) scanList(data.desarrollo.materiales);
        if (data.cierre?.materiales) scanList(data.cierre.materiales);
        if (data.tareaCasa?.materiales) scanList(data.tareaCasa.materiales);

        if (diagPrompts.length === 0) return [];

        // Generate diagrams for found prompts
        const results = await Promise.all(diagPrompts.map(async (dp, idx) => {
            try {
                // Construct prompt for this diagram
                const promptText = `${Prompts.diagramas.instruction}\n\n` +
                    `CONTEXTO:\nNivel: ${request.nivel}, Grado: ${request.grado}, Area: ${request.area}\n` +
                    `DIAGRAM REQUEST: Title: "${dp.title}", Instruction: "${dp.instruction}"\n\n` +
                    `${Prompts.diagramas.outputContract}\n${Prompts.diagramas.guidelines.join('\n')}`;

                const response = await ai.models.generateContent({
                    model: this.textModelId,
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    config: { responseMimeType: "application/json" }
                });

                const json = JSON.parse(response.text || "{}");
                if (json.organizer) {
                    // Ensure ID
                    const org = json.organizer;
                    if (!org.id) org.id = `extra-diag-${idx}-${slugify(dp.title).slice(0, 10)}`;
                    return org as Organizer;
                }
            } catch (e) {
                console.error(`Failed to generate extra diagram: ${dp.title}`, e);
            }
            return null;
        }));

        return results.filter(d => d !== null) as Organizer[];
    }
}
