import { ai } from "../services/geminiService";

export class ExternalResourceResolver {
  /**
   * Resolves a search query to a real URL using Google Search Grounding.
   */
  static async resolveLink(query: string, type: 'video' | 'image'): Promise<{ title: string, url: string } | null> {
    try {
      // Enhanced prompt to ask for direct URLs in text
      const prompt = type === 'video'
        ? `Busca en YouTube un video educativo sobre: "${query}". Responde con el Título exacto y la URL directa (youtube.com). Prioriza videos cortos y oficiales.`
        : `Busca una imagen educativa real de: "${query}". Responde con el Título y la URL directa de la imagen (jpg/png) si es posible. Si no, la URL de la página.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      // 1. Try to extract from Grounding Metadata
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      let groundingUrl = null;
      let groundingTitle = null;

      if (chunks && chunks.length > 0) {
        const webChunk = chunks.find(c => c.web?.uri);
        if (webChunk?.web) {
          groundingUrl = webChunk.web.uri;
          groundingTitle = webChunk.web.title;
        }
      }

      // 2. Try to extract from Text Response (often has better/direct links)
      const text = response.text || "";
      // Regex to find http/https URLs
      const urlMatches = text.matchAll(/https?:\/\/[^\s)"]+/g);
      const urlsInText = Array.from(urlMatches).map(m => m[0]);

      // Preference logic:
      // If we have a YouTube URL in text, use it (avoid grounding redirects for YT)
      if (type === 'video') {
        const ytUrl = urlsInText.find(u => u.includes('youtube.com') || u.includes('youtu.be'));
        if (ytUrl) return { title: groundingTitle || query, url: ytUrl };
      }

      // If we have a direct image extension in text, use it
      if (type === 'image') {
        const imgUrl = urlsInText.find(u => /\.(jpg|jpeg|png|webp)$/i.test(u));
        if (imgUrl) return { title: groundingTitle || query, url: imgUrl };
      }

      // Fallback to grounding URL if available
      if (groundingUrl) {
        return {
          title: groundingTitle || query,
          url: groundingUrl
        };
      }

      // Last fallback: first URL in text
      if (urlsInText.length > 0) {
        return { title: query, url: urlsInText[0] };
      }

      return null;
    } catch (e) {
      console.warn(`External resource resolution failed for ${query}`, e);
      return null;
    }
  }
}