import { ai } from "../services/geminiService";

export class ExternalResourceResolver {

  /**
   * Helper: Validates if an image URL is loadable.
   * Used to check YouTube thumbnails to verify if video exists.
   */
  private static validateImageLoad(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  /**
   * Extract YouTube ID from URL
   */
  private static getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }

  /**
   * Resolves a search query to a real URL using Google Search Grounding.
   */
  static async resolveLink(query: string, type: 'video' | 'image'): Promise<{ title: string, url: string } | null> {
    try {
      // Enhanced prompt to ask for direct URLs in text
      const prompt = type === 'video'
        ? `Busca en YouTube un video educativo sobre: "${query}". Responde con el Título exacto y la URL directa (youtube.com). Prioriza videos cortos y oficiales. NO inventes URLs.`
        : `Busca una imagen educativa real de: "${query}". Responde con el Título y la URL directa de la imagen (jpg/png). Evita URLs de redirección.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      // 1. Extract potential URLs from text response (preferred over grounding chunks for images)
      const text = response.text || "";
      const urlMatches = text.matchAll(/https?:\/\/[^\s)"]+/g);
      const urlsInText = Array.from(urlMatches).map(m => m[0]);

      // --- VIDEO RESOLUTION STRATEGY ---
      if (type === 'video') {
        // Try to find a valid YouTube link
        for (const url of urlsInText) {
          const videoId = this.getYouTubeId(url);
          if (videoId) {
            // VALIDATION: Check if thumbnail exists
            const thumbUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
            const isValid = await this.validateImageLoad(thumbUrl);

            if (isValid) {
              return { title: query, url: url };
            } else {
              console.warn(`[Resolver] Found dead YouTube link: ${url}`);
            }
          }
        }

        // Fallback: Return a YouTube Search URL
        // This guarantees the user finds something even if specific video is dead
        return {
          title: query,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
        };
      }

      // --- IMAGE RESOLUTION STRATEGY ---
      if (type === 'image') {
        // Filter out bad grounding URLs
        const validUrls = urlsInText.filter(u =>
          !u.includes('vertexaisearch') &&
          !u.includes('google.com/grounding') &&
          /\.(jpg|jpeg|png|webp)$/i.test(u)
        );

        if (validUrls.length > 0) {
          // Verify the first promising image
          const isValid = await this.validateImageLoad(validUrls[0]);
          if (isValid) {
            return { title: query, url: validUrls[0] };
          }
        }

        // Fallback: Return Google Images Search URL
        // Much better than a broken icon
        return {
          title: query,
          url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`
        };
      }

      return null;
    } catch (e) {
      console.warn(`External resource resolution failed for ${query}`, e);
      // Ultimate fallback
      const baseUrl = type === 'video' ? 'https://www.youtube.com/results?search_query=' : 'https://www.google.com/search?tbm=isch&q=';
      return { title: query, url: `${baseUrl}${encodeURIComponent(query)}` };
    }
  }
}