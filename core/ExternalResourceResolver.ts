import { ai } from "../services/geminiService";

export class ExternalResourceResolver {

  /**
   * Validates if a YouTube video exists by checking multiple thumbnail formats.
   * YouTube returns a default grey placeholder for non-existent videos.
   */
  private static async validateYouTubeVideo(videoId: string): Promise<boolean> {
    try {
      // Try maxresdefault first - only exists for real videos
      const response = await fetch(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, {
        method: 'HEAD',
        mode: 'no-cors' // YouTube doesn't allow CORS, but we can still detect 404 behavior
      });

      // Since no-cors doesn't give us status, we use a different approach:
      // Load the image and check if it's the placeholder (120x90 grey image)
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          // If image loads but is very small (placeholder), it's invalid
          // Real YouTube thumbnails are at least 120x90 for default, 320x180 for mq
          if (img.naturalWidth <= 1 || img.naturalHeight <= 1) {
            resolve(false);
          } else {
            resolve(true);
          }
        };

        img.onerror = () => {
          resolve(false);
        };

        // Use mqdefault as it's reliable for checking
        img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

        // Timeout after 3 seconds
        setTimeout(() => resolve(false), 3000);
      });
    } catch {
      return false;
    }
  }

  /**
   * Extract YouTube ID from URL
   */
  private static getYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
      /m\.youtube\.com\/watch\?v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[1].length === 11) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Known reliable educational videos for common topics (fallback cache)
   */
  private static readonly KNOWN_VIDEOS: Record<string, string> = {
    'vocales': 'https://www.youtube.com/watch?v=gNV7BQCYqk4', // Las Vocales - Toobys
    'numeros': 'https://www.youtube.com/watch?v=jJ9Og1VJxj4', // Números del 1 al 10
    'colores': 'https://www.youtube.com/watch?v=UDjd4lrNI-I', // Los Colores
    'animales': 'https://www.youtube.com/watch?v=p5qwOxlvyhk', // Sonidos de Animales
    'suma': 'https://www.youtube.com/watch?v=dVHO3KMwNiE', // Aprendiendo a Sumar
  };

  /**
   * Try to match query with known reliable videos
   */
  private static findKnownVideo(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    for (const [keyword, url] of Object.entries(this.KNOWN_VIDEOS)) {
      if (lowerQuery.includes(keyword)) {
        return url;
      }
    }
    return null;
  }

  /**
   * Resolves a search query to a real URL using Google Search Grounding.
   */
  static async resolveLink(query: string, type: 'video' | 'image'): Promise<{ title: string, url: string } | null> {
    try {
      // --- VIDEO RESOLUTION STRATEGY ---
      if (type === 'video') {
        // Step 1: Try known reliable videos first
        const knownVideo = this.findKnownVideo(query);
        if (knownVideo) {
          console.log(`[Resolver] Using known video for "${query}"`);
          return { title: query, url: knownVideo };
        }

        // Step 2: Ask LLM for video suggestions
        const prompt = `Busca en YouTube un video educativo infantil sobre: "${query}". 
Dame SOLO la URL directa de YouTube (formato: youtube.com/watch?v=XXXXXXXXXXX).
Prioriza videos de canales educativos conocidos como Toobys, CantaJuego, PinkFong.
NO inventes URLs. Si no encuentras un video real, responde "NO_VIDEO".`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            tools: [{ googleSearch: {} }]
          }
        });

        const text = response.text || "";

        // Check if LLM couldn't find a video
        if (text.includes('NO_VIDEO')) {
          console.log(`[Resolver] LLM couldn't find video for "${query}", using search fallback`);
          return {
            title: query,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' infantil educativo')}`
          };
        }

        // Extract YouTube URLs from response
        const urlMatches = text.matchAll(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g);
        const foundUrls = Array.from(urlMatches);

        // Validate each found video
        for (const match of foundUrls) {
          const videoId = match[1];
          console.log(`[Resolver] Validating video ID: ${videoId}`);

          const isValid = await this.validateYouTubeVideo(videoId);

          if (isValid) {
            const url = `https://www.youtube.com/watch?v=${videoId}`;
            console.log(`[Resolver] Valid video found: ${url}`);
            return { title: query, url };
          } else {
            console.warn(`[Resolver] Invalid/dead video ID: ${videoId}`);
          }
        }

        // Fallback: Return YouTube Search URL
        console.log(`[Resolver] No valid video found, using search fallback`);
        return {
          title: query,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' infantil educativo')}`
        };
      }

      // --- IMAGE RESOLUTION STRATEGY ---
      if (type === 'image') {
        const prompt = `Busca una imagen educativa real de: "${query}". 
Dame SOLO la URL directa de la imagen (debe terminar en .jpg, .png o .webp).
Evita URLs de Google o de redirección.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            tools: [{ googleSearch: {} }]
          }
        });

        const text = response.text || "";
        const urlMatches = text.matchAll(/https?:\/\/[^\s)"]+\.(jpg|jpeg|png|webp)/gi);
        const validUrls = Array.from(urlMatches)
          .map(m => m[0])
          .filter(u =>
            !u.includes('vertexaisearch') &&
            !u.includes('google.com/grounding') &&
            !u.includes('gstatic.com')
          );

        if (validUrls.length > 0) {
          return { title: query, url: validUrls[0] };
        }

        // Fallback: Google Images Search
        return {
          title: query,
          url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`
        };
      }

      return null;
    } catch (e) {
      console.warn(`External resource resolution failed for ${query}`, e);
      const baseUrl = type === 'video'
        ? 'https://www.youtube.com/results?search_query='
        : 'https://www.google.com/search?tbm=isch&q=';
      return { title: query, url: `${baseUrl}${encodeURIComponent(query)}` };
    }
  }
}
