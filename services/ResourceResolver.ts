import { ai } from './geminiService';
import { Resource, ResolvedResource, ResourceKind } from '../types';

/**
 * ResourceResolver - Resolves resource hints into actual content
 * 
 * For 'external' resources: Generates search URLs for Google/YouTube
 * For 'generated' resources: Uses Gemini Imagen API to create images
 */
export class ResourceResolver {
    private static readonly SEARCH_PROVIDERS = {
        image: 'https://www.google.com/search?tbm=isch&q=',
        video: 'https://www.youtube.com/results?search_query=',
        reading: 'https://www.google.com/search?q=',
        organizer: 'https://www.google.com/search?tbm=isch&q=organizador+visual+',
        worksheet: 'https://www.google.com/search?q=ficha+de+trabajo+',
        other: 'https://www.google.com/search?q='
    };

    // Use a widely available model version or the one specified by Google GenAI docs for v1beta
    private static readonly IMAGEN_MODEL = 'imagen-3.0-generate-001';

    /**
     * Resolve all resources in a session in parallel
     */
    static async resolveAll(resources: Resource[], nivel: string): Promise<ResolvedResource[]> {
        if (!resources || resources.length === 0) {
            return [];
        }

        const resolvePromises = resources.map(resource =>
            this.resolveResource(resource, nivel)
        );

        return Promise.all(resolvePromises);
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
            if (resource.source.mode === 'external') {
                return this.resolveExternalResource(resource);
            } else if (resource.source.mode === 'generated') {
                return await this.resolveGeneratedResource(resource, nivel);
            }

            return { ...baseResolved, status: 'resolved' };
        } catch (error) {
            console.error(`Failed to resolve resource ${resource.id}:`, error);
            return { ...baseResolved, status: 'error' };
        }
    }

    /**
     * Resolve an external resource - generates search URLs
     */
    private static resolveExternalResource(resource: Resource): ResolvedResource {
        const searchBase = this.SEARCH_PROVIDERS[resource.kind] || this.SEARCH_PROVIDERS.other;

        // Build search query from hints
        let query = resource.source.queryHint || resource.title;
        if (resource.source.providerHint) {
            query += ` ${resource.source.providerHint}`;
        }

        const searchUrl = searchBase + encodeURIComponent(query);

        // Generate a placeholder thumbnail based on kind
        const thumbnail = this.getPlaceholderThumbnail(resource.kind);

        return {
            ...resource,
            status: 'resolved',
            url: searchUrl,
            thumbnail,
            attribution: resource.source.providerHint || 'Búsqueda web'
        };
    }

    /**
     * Resolve a generated resource - uses Gemini Imagen API
     */
    private static async resolveGeneratedResource(resource: Resource, nivel: string): Promise<ResolvedResource> {
        // Only generate images for image-type resources
        if (resource.kind !== 'image' && resource.kind !== 'organizer') {
            return {
                ...resource,
                status: 'resolved',
                thumbnail: this.getPlaceholderThumbnail(resource.kind),
                attribution: 'Generado por IA'
            };
        }

        try {
            // Build an appropriate prompt
            const prompt = this.buildImagePrompt(resource, nivel);

            // Call Gemini Imagen API
            const result = await ai.models.generateImages({
                model: this.IMAGEN_MODEL,
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: '16:9',
                    outputMimeType: 'image/png'
                }
            });

            // Extract the generated image
            if (result.generatedImages && result.generatedImages.length > 0) {
                const imageData = result.generatedImages[0].image;

                // Convert to data URL if we have base64 data
                if (imageData?.imageBytes) {
                    const base64 = imageData.imageBytes;
                    const dataUrl = `data:image/png;base64,${base64}`;

                    return {
                        ...resource,
                        status: 'resolved',
                        url: dataUrl,
                        thumbnail: dataUrl,
                        attribution: 'Generado con Gemini Imagen'
                    };
                }
            }

            // Fallback if generation failed
            return {
                ...resource,
                status: 'error',
                thumbnail: this.getPlaceholderThumbnail(resource.kind),
                attribution: 'Error al generar imagen'
            };
        } catch (error) {
            console.error('Image generation failed:', error);

            // FALLBACK: If generation fails (e.g. 404 model not found), 
            // convert to an "External" resource so user can search for it instead.
            console.log('Falling back to external search for resource:', resource.title);

            const searchBase = this.SEARCH_PROVIDERS.image;
            const query = resource.source.generationHint || resource.title;
            const searchUrl = searchBase + encodeURIComponent(query);

            return {
                ...resource,
                status: 'resolved', // Mark as resolved but as search
                url: searchUrl,
                thumbnail: this.getPlaceholderThumbnail(resource.kind), // Placeholder
                attribution: 'Búsqueda sugerida (Imagen IA no disponible)',
                source: {
                    ...resource.source,
                    mode: 'external',
                    providerHint: 'Google Images'
                }
            };
        }
    }

    /**
     * Build an appropriate image generation prompt based on resource and level
     */
    private static buildImagePrompt(resource: Resource, nivel: string): string {
        let basePrompt = resource.source.generationHint || resource.title;

        // Add style modifiers based on level
        if (nivel === 'Inicial') {
            basePrompt += ', cartoon style, colorful, child-friendly, simple shapes, educational illustration for 4-6 year olds';
        } else if (nivel === 'Primaria') {
            basePrompt += ', educational illustration, colorful, clear, suitable for elementary school children, friendly style';
        } else {
            basePrompt += ', educational diagram, clear, modern, suitable for high school students';
        }

        // Add type-specific modifiers
        if (resource.kind === 'organizer') {
            basePrompt += ', visual organizer, diagram, infographic style, labeled sections';
        }

        return basePrompt;
    }

    /**
     * Get a placeholder thumbnail SVG based on resource kind
     */
    private static getPlaceholderThumbnail(kind: ResourceKind): string {
        // Return a simple SVG data URL as placeholder
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
                <rect width="100%" height="100%" fill="${bgColor}" opacity="0.1"/>
                <text x="50%" y="50%" font-size="48" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
            </svg>
        `.trim();

        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    /**
     * Generate a YouTube embed URL from a search query
     */
    static getYouTubeSearchUrl(query: string): string {
        return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    }

    /**
     * Generate a Google Image search URL
     */
    static getGoogleImageSearchUrl(query: string): string {
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
    }
}
