import { ai } from "../services/geminiService";

export class ExternalResourceResolver {
  /**
   * Resolves a search query to a real URL using Google Search Grounding.
   */
  static async resolveLink(query: string, type: 'video' | 'image'): Promise<{title: string, url: string} | null> {
    try {
      const prompt = type === 'video' 
        ? `Busca en YouTube un video educativo sobre: "${query}". Devuelve solo el Título exacto y la URL del primer resultado válido. Prioriza contenido educativo.`
        : `Busca una imagen educativa real de: "${query}". Devuelve solo el Título y la URL de la fuente de la imagen.`;

      // Use a model capable of tools/grounding
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      // 1. Try to extract from Grounding Metadata (Most reliable for 2.5)
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        const webChunk = chunks.find(c => c.web?.uri);
        if (webChunk?.web) {
            return {
                title: webChunk.web.title || query,
                url: webChunk.web.uri
            };
        }
      }
      
      // 2. Fallback: Parse text response if grounding chunks are tricky but text has link
      const text = response.text || "";
      const urlMatch = text.match(/https?:\/\/[^\s)]+/); // Basic URL extraction
      if (urlMatch) {
          return { title: query, url: urlMatch[0] };
      }

      return null;
    } catch (e) {
      console.warn(`External resource resolution failed for ${query}`, e);
      return null;
    }
  }
}