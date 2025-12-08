import { ai } from './geminiService';
import { Resource, ResolvedResource, ResourceKind } from '../types';

/**
 * ResourceResolver - Resolves resource hints into actual content
 * 
 * Uses Gemini Imagen API to generate images with proper English prompts
 * Rate limited to avoid API throttling
 */
export class ResourceResolver {
    // Imagen model - use the latest available
    private static readonly IMAGEN_MODEL = 'imagen-3.0-generate-001';

    // Rate limiting: process max N images concurrently
    private static readonly MAX_CONCURRENT_GENERATIONS = 2;

    /**
     * Resolve all resources in a session with rate limiting
     */
    static async resolveAll(resources: Resource[], nivel: string): Promise<ResolvedResource[]> {
        if (!resources || resources.length === 0) {
            return [];
        }

        // Separate by type for efficient processing
        const imageResources = resources.filter(r =>
            r.kind === 'image' && r.source.mode === 'generated'
        );
        const otherResources = resources.filter(r =>
            !(r.kind === 'image' && r.source.mode === 'generated')
        );

        // Process non-image resources immediately (no rate limit needed)
        const otherPromises = otherResources.map(r => this.resolveResource(r, nivel));

        // Process image resources with rate limiting
        const imageResults: ResolvedResource[] = [];
        for (let i = 0; i < imageResources.length; i += this.MAX_CONCURRENT_GENERATIONS) {
            const batch = imageResources.slice(i, i + this.MAX_CONCURRENT_GENERATIONS);
            const batchResults = await Promise.all(
                batch.map(r => this.resolveResource(r, nivel))
            );
            imageResults.push(...batchResults);
        }

        const otherResults = await Promise.all(otherPromises);

        // Merge preserving original order
        return resources.map(resource => {
            const found = [...otherResults, ...imageResults].find(r => r.id === resource.id);
            return found || { ...resource, status: 'pending' as const };
        });
    }

    /**
     * Resolve a single resource
     */
    static async resolveResource(resource: Resource, nivel: string): Promise<ResolvedResource> {
        const baseResolved: ResolvedResource = {
            ...resource,
            status: 'pending'
        };

        try {
            // Skip if already resolved by LLM
            if (resource.source.resolvedUrl) {
                return {
                    ...resource,
                    status: 'resolved',
                    url: resource.source.resolvedUrl,
                    thumbnail: resource.source.thumbnailUrl || resource.source.resolvedUrl,
                    attribution: resource.source.sourceName || resource.source.providerHint || 'Recurso educativo'
                };
            }

            // Route by resource type
            if (resource.kind === 'video') {
                return this.resolveVideoResource(resource);
            } else if (resource.source.mode === 'generated' && resource.kind === 'image') {
                return await this.generateImageResource(resource, nivel);
            } else {
                // For reading, worksheet, other - use placeholder with description
                return {
                    ...resource,
                    status: 'resolved',
                    thumbnail: this.getPlaceholderThumbnail(resource.kind),
                    attribution: resource.source.providerHint || 'Recurso sugerido'
                };
            }
        } catch (error) {
            console.error(`Failed to resolve resource ${resource.id}:`, error);
            return { ...baseResolved, status: 'error' };
        }
    }

    /**
     * Resolve video resource - create embed URL for Spanish educational videos
     */
    private static resolveVideoResource(resource: Resource): ResolvedResource {
        // Build YouTube embed URL if we have a video ID hint
        const query = resource.source.queryHint || resource.title;
        const embedUrl = this.buildYouTubeEmbedFromSearch(query);

        return {
            ...resource,
            status: 'resolved',
            url: embedUrl,
            thumbnail: this.getYouTubeThumbnail(query),
            attribution: resource.source.providerHint || 'YouTube Educativo'
        };
    }

    /**
     * Generate image using Imagen API with English prompt
     */
    private static async generateImageResource(resource: Resource, nivel: string): Promise<ResolvedResource> {
        try {
            // Build English prompt (Imagen only supports English)
            const englishPrompt = this.buildEnglishImagePrompt(resource, nivel);

            console.log('[Imagen] Generating with prompt:', englishPrompt);

            const result = await ai.models.generateImages({
                model: this.IMAGEN_MODEL,
                prompt: englishPrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: '16:9'
                }
            });

            // Extract the generated image
            if (result.generatedImages && result.generatedImages.length > 0) {
                const imageData = result.generatedImages[0].image;

                if (imageData?.imageBytes) {
                    const dataUrl = `data:image/png;base64,${imageData.imageBytes}`;
                    return {
                        ...resource,
                        status: 'resolved',
                        url: dataUrl,
                        thumbnail: dataUrl,
                        attribution: 'Generado con IA'
                    };
                }
            }

            throw new Error('No image data in response');
        } catch (error: any) {
            console.error('[Imagen] Generation failed:', error.message || error);

            // Return with placeholder but mark as error so UI shows fallback
            return {
                ...resource,
                status: 'error',
                thumbnail: this.getPlaceholderThumbnail(resource.kind),
                attribution: 'Imagen no disponible'
            };
        }
    }

    /**
     * Build English prompt for Imagen API
     * Translates Spanish concepts to English with appropriate style modifiers
     */
    private static buildEnglishImagePrompt(resource: Resource, nivel: string): string {
        // Base prompt from generation hint or title
        let basePrompt = resource.source.generationHint || resource.title;

        // Common Spanish -> English educational terms
        const translations: Record<string, string> = {
            'fotosíntesis': 'photosynthesis',
            'planta': 'plant',
            'plantas': 'plants',
            'célula': 'cell',
            'decena': 'group of ten',
            'suma': 'addition',
            'resta': 'subtraction',
            'multiplicación': 'multiplication',
            'división': 'division',
            'animales': 'animals',
            'ecosistema': 'ecosystem',
            'ciclo': 'cycle',
            'agua': 'water',
            'sol': 'sun',
            'luz': 'light',
            'energía': 'energy',
            'clorofila': 'chlorophyll',
            'hoja': 'leaf',
            'hojas': 'leaves',
            'raíz': 'root',
            'tallo': 'stem',
            'flor': 'flower',
            'fruto': 'fruit',
            'semilla': 'seed',
            'oxígeno': 'oxygen',
            'dióxido de carbono': 'carbon dioxide',
            'sana': 'healthy',
            'marchita': 'wilted',
            'comparación': 'comparison'
        };

        // Apply translations
        let englishPrompt = basePrompt.toLowerCase();
        for (const [spanish, english] of Object.entries(translations)) {
            englishPrompt = englishPrompt.replace(new RegExp(spanish, 'gi'), english);
        }

        // Add style modifiers based on level
        if (nivel === 'Inicial') {
            englishPrompt += ', cartoon style, very colorful, cute, child-friendly, simple shapes, educational illustration for preschool kids, no text';
        } else if (nivel === 'Primaria') {
            englishPrompt += ', colorful educational illustration, clear, friendly style, suitable for elementary school, no text, clean design';
        } else {
            englishPrompt += ', educational diagram, modern, clean, infographic style, suitable for high school students';
        }

        // Ensure it's educational and safe
        englishPrompt += ', educational, school-appropriate, high quality';

        return englishPrompt;
    }

    /**
     * Build a YouTube embed placeholder (actual embed will be in UI)
     */
    private static buildYouTubeEmbedFromSearch(query: string): string {
        // Return search results URL - UI will handle embedding
        return `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' español educativo')}`;
    }

    /**
     * Get a themed thumbnail for YouTube 
     */
    private static getYouTubeThumbnail(_query: string): string {
        return this.createSvgDataUrl('🎬', '#FF0000');
    }

    /**
     * Get a placeholder thumbnail SVG based on resource kind
     */
    private static getPlaceholderThumbnail(kind: ResourceKind): string {
        const placeholders: Record<ResourceKind, string> = {
            image: this.createSvgDataUrl('🖼️', '#3B82F6'),
            video: this.createSvgDataUrl('🎬', '#EF4444'),
            organizer: this.createSvgDataUrl('📊', '#10B981'),
            reading: this.createSvgDataUrl('📖', '#F59E0B'),
            worksheet: this.createSvgDataUrl('📝', '#8B5CF6'),
            other: this.createSvgDataUrl('📎', '#6B7280')
        };
        return placeholders[kind] || placeholders.other;
    }

    /**
     * Create a simple SVG placeholder as data URL
     */
    private static createSvgDataUrl(emoji: string, bgColor: string): string {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
                <rect width="100%" height="100%" fill="${bgColor}" opacity="0.15"/>
                <text x="50%" y="50%" font-size="64" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
            </svg>
        `.trim();
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }
}
