/**
 * ResourceOrchestrator - Code-Controlled Resource Generation (Flow B)
 * 
 * This orchestrator processes all resources from the polymorphic resources[] array
 * in parallel, generating images, diagrams, and resolving external links.
 * 
 * The workflow is controlled by CODE, not by the LLM.
 */

import {
    Resource,
    AIImageResource,
    DiagramResource,
    ExternalVideoResource,
    ExternalImageResource,
    ResourceUpdateCallback
} from '../types';
import { ai } from '../services/geminiService';
import { Prompts } from '../prompts';
import { ExternalResourceResolver } from './ExternalResourceResolver';

export interface ResourceContext {
    nivel: string;
    grado: string;
    area: string;
}

// Type for diagram prompts with extended properties
interface DiagramPromptsType {
    instruction?: string;
    typeDefinitions?: string;
    syntaxRules?: string;
    outputContract?: string;
    guidelines?: string[];
    examples?: string;
}

export class ResourceOrchestrator {
    private static imageModelId = 'gemini-2.5-flash-preview-05-20';
    private static textModelId = 'gemini-2.5-flash';

    /**
     * Processes all resources in parallel according to their type.
     * Workflow controlled by CODE, not by the LLM.
     */
    static async processAll(
        resources: Resource[],
        context: ResourceContext,
        onUpdate: ResourceUpdateCallback
    ): Promise<void> {
        if (!resources || resources.length === 0) {
            console.log('[ResourceOrchestrator] No resources to process');
            return;
        }

        console.log(`[ResourceOrchestrator] Processing ${resources.length} resources in parallel`);

        // Mark all resources as loading
        resources.forEach(resource => {
            onUpdate('resource', resource.id, { ...resource, status: 'loading' });
        });

        const tasks = resources.map(resource =>
            this.processResource(resource, context, onUpdate)
        );

        await Promise.allSettled(tasks);
        console.log('[ResourceOrchestrator] All resources processed');
    }

    private static async processResource(
        resource: Resource,
        context: ResourceContext,
        onUpdate: ResourceUpdateCallback
    ): Promise<void> {
        try {
            console.log(`[ResourceOrchestrator] Processing: ${resource.type} - ${resource.title}`);

            switch (resource.type) {
                case 'AI_IMAGE':
                    await this.processAIImage(resource as AIImageResource, onUpdate);
                    break;
                case 'DIAGRAM':
                    await this.processDiagram(resource as DiagramResource, context, onUpdate);
                    break;
                case 'VIDEO_SEARCH':
                    await this.processVideoSearch(resource as ExternalVideoResource, onUpdate);
                    break;
                case 'IMAGE_SEARCH':
                    await this.processImageSearch(resource as ExternalImageResource, onUpdate);
                    break;
                default:
                    console.warn(`[ResourceOrchestrator] Unknown resource type: ${(resource as Resource).type}`);
            }
        } catch (error) {
            console.error(`[ResourceOrchestrator] Failed to process resource ${resource.id}:`, error);
            onUpdate('resource', resource.id, {
                ...resource,
                status: 'error',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Process AI_IMAGE resource - Generate image using Gemini Image model
     */
    private static async processAIImage(
        resource: AIImageResource,
        onUpdate: ResourceUpdateCallback
    ): Promise<void> {
        console.log(`[ResourceOrchestrator] Generating AI image: ${resource.title}`);

        const response = await ai.models.generateContent({
            model: this.imageModelId,
            contents: { parts: [{ text: resource.generationPrompt }] },
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData?.data) {
            const base64 = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            onUpdate('resource', resource.id, {
                ...resource,
                status: 'ready',
                base64Data: base64
            });
            console.log(`[ResourceOrchestrator] AI image ready: ${resource.title}`);
        } else {
            throw new Error('No image data in response');
        }
    }

    /**
     * Process DIAGRAM resource - Generate Mermaid code using text model
     */
    private static async processDiagram(
        resource: DiagramResource,
        context: ResourceContext,
        onUpdate: ResourceUpdateCallback
    ): Promise<void> {
        console.log(`[ResourceOrchestrator] Generating diagram: ${resource.title} (${resource.diagramType})`);

        const diagramPrompts = Prompts.diagramas as unknown as DiagramPromptsType;

        const prompt = `${diagramPrompts.instruction || ''}

${diagramPrompts.typeDefinitions || ''}

CONTEXT:
- Nivel: ${context.nivel}
- Grado: ${context.grado}
- Área: ${context.area}

DIAGRAM REQUEST:
- Title: "${resource.title}"
- Type: ${resource.diagramType}
- Content: ${resource.generationPrompt}

${diagramPrompts.syntaxRules || ''}

${diagramPrompts.outputContract || ''}

${Array.isArray(diagramPrompts.guidelines) ? diagramPrompts.guidelines.join('\n') : ''}`;

        const response = await ai.models.generateContent({
            model: this.textModelId,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        const jsonText = response.text || '{}';
        const json = JSON.parse(jsonText);

        if (json.mermaidCode) {
            onUpdate('resource', resource.id, {
                ...resource,
                status: 'ready',
                mermaidCode: json.mermaidCode,
                textFallback: json.textFallback || ''
            });
            console.log(`[ResourceOrchestrator] Diagram ready: ${resource.title}`);
        } else {
            throw new Error('No mermaidCode in response');
        }
    }

    /**
     * Process VIDEO_SEARCH resource - Resolve YouTube video via Google Search
     */
    private static async processVideoSearch(
        resource: ExternalVideoResource,
        onUpdate: ResourceUpdateCallback
    ): Promise<void> {
        console.log(`[ResourceOrchestrator] Searching video: ${resource.searchQuery}`);

        const result = await ExternalResourceResolver.resolveLink(resource.searchQuery, 'video');

        if (result) {
            onUpdate('resource', resource.id, {
                ...resource,
                status: 'ready',
                url: result.url
            });
            console.log(`[ResourceOrchestrator] Video found: ${result.url}`);
        } else {
            throw new Error('No video found for query: ' + resource.searchQuery);
        }
    }

    /**
     * Process IMAGE_SEARCH resource - Resolve real image via Google Search
     */
    private static async processImageSearch(
        resource: ExternalImageResource,
        onUpdate: ResourceUpdateCallback
    ): Promise<void> {
        console.log(`[ResourceOrchestrator] Searching image: ${resource.searchQuery}`);

        const result = await ExternalResourceResolver.resolveLink(resource.searchQuery, 'image');

        if (result) {
            onUpdate('resource', resource.id, {
                ...resource,
                status: 'ready',
                url: result.url
            });
            console.log(`[ResourceOrchestrator] Image found: ${result.url}`);
        } else {
            throw new Error('No image found for query: ' + resource.searchQuery);
        }
    }
}
