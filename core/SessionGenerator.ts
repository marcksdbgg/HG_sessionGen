import { ai } from "../services/geminiService";
import { SESSION_SCHEMA } from "../schemas/sessionSchema";
import { PromptComposer } from "./PromptComposer";
import { RetryPolicy } from "./RetryPolicy";
import { SessionData, SessionRequest, GeneratedImage } from "../types";
import { Type } from "@google/genai";

export class SessionGenerator {
  private static retryPolicy = new RetryPolicy();
  private static textModelId = "gemini-2.5-flash";
  private static imageModelId = "gemini-2.5-flash-image"; // For creating the visual resources

  static async generate(request: SessionRequest): Promise<SessionData> {
    const fullPrompt = PromptComposer.compose(request);

    // 1. Generate the Text Structure (JSON)
    const sessionData = await this.retryPolicy.execute(async () => {
      const response = await ai.models.generateContent({
        model: this.textModelId,
        contents: [
            { role: 'user', parts: [{ text: fullPrompt }] }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: SESSION_SCHEMA,
        },
      });

      const jsonText = response.text;
      if (!jsonText) throw new Error("Empty response from Gemini");
      return JSON.parse(jsonText) as SessionData;
    });

    // 2. Post-process: Generate Images for the Resources
    // We do this asynchronously to not block the UI if possible, but for simplicity here we await
    // or we returns the session data and let the images load lazily?
    // User requested: "ni bien se obtengas estas respuestas se muestren los recursos"
    // We will initiate image generation here and fill the base64 data.
    
    if (sessionData.resources && sessionData.resources.images) {
        const imagePromises = sessionData.resources.images.map(async (img) => {
            try {
                const base64 = await this.generateImage(img.prompt);
                return { ...img, base64Data: base64, isLoading: false };
            } catch (e) {
                console.error(`Failed to generate image for: ${img.title}`, e);
                return { ...img, isLoading: false }; // Return without image on fail
            }
        });

        // Wait for all images (or you could return partial and update state in UI, 
        // but waiting ensures complete session delivery for this MVP)
        const updatedImages = await Promise.all(imagePromises);
        sessionData.resources.images = updatedImages;
    }

    return sessionData;
  }

  private static async generateImage(prompt: string): Promise<string> {
     const response = await ai.models.generateContent({
        model: this.imageModelId,
        contents: { parts: [{ text: prompt }] },
        config: {
            // No responseMimeType for image model usually in this SDK version unless specified
        }
     });

     // Iterate parts to find the image
     if (response.candidates?.[0]?.content?.parts) {
         for (const part of response.candidates[0].content.parts) {
             if (part.inlineData && part.inlineData.data) {
                 return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
             }
         }
     }
     
     throw new Error("No image data found in response");
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
}