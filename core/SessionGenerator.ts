import { ai } from "../services/geminiService";
import { SESSION_SCHEMA } from "../schemas/sessionSchema";
import { PromptComposer } from "./PromptComposer";
import { RetryPolicy } from "./RetryPolicy";
import { SessionData, SessionRequest, Resource } from "../types";
import { Type } from "@google/genai";
import { RESOLVED_RESOURCES_RESPONSE_SCHEMA } from "../schemas/resolvedResourceSchema";
import recursosResolver from "../prompts/prompt_recursos_resolver.json";

export class SessionGenerator {
  private static retryPolicy = new RetryPolicy();
  private static modelId = "gemini-2.5-flash";

  static async generate(request: SessionRequest): Promise<SessionData> {
    const fullPrompt = PromptComposer.compose(request);

    // Build content parts - text always, image optional
    const parts: any[] = [{ text: fullPrompt }];

    // If image is provided, add it to the request for vision analysis
    if (request.imageBase64 && request.imageMimeType) {
      parts.push({
        inlineData: {
          mimeType: request.imageMimeType,
          data: request.imageBase64
        }
      });
    }

    return this.retryPolicy.execute(async () => {
      const response = await ai.models.generateContent({
        model: this.modelId,
        contents: [
          { role: 'user', parts }
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
  }

  static async regenerateSection(
    currentData: SessionData,
    sectionKey: keyof SessionData,
    instructions: string
  ): Promise<any> {
    // Determine the partial schema for the section
    let partialSchema: any;

    // We need to look up the schema definition from SESSION_SCHEMA
    // This is a simplification; normally we'd traverse the schema object carefully.
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
        model: this.modelId,
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

  /**
   * Second LLM call: Resolve resources with direct URLs
   * Takes the generated recursos array and asks LLM to provide direct URLs
   */
  static async resolveResourcesWithLLM(recursos: Resource[], sessionTitle: string, nivel: string): Promise<any> {
    if (!recursos || recursos.length === 0) {
      return { resolvedResources: [] };
    }

    // Build context for LLM
    const contextPrompt = `${recursosResolver.role}\n${recursosResolver.task}\n\n`;
    const instructions = recursosResolver.instructions.join("\n");

    const prompt = `${contextPrompt}\n${instructions}\n\nSESSION TITLE: ${sessionTitle}\nEDUCATIONAL LEVEL: ${nivel}\n\nRESOURCES TO RESOLVE:\n${JSON.stringify(recursos, null, 2)}\n\nFor each resource, provide a direct URL to the actual content (image or video). DO NOT provide search URLs. Use trusted educational sources like:\n- Wikimedia Commons for images\n- YouTube (embed format: https://www.youtube.com/embed/VIDEO_ID) for videos\n- NASA, National Geographic, educational institutions\n\nIf the resource is creative/fictional, mark mode='generated' so it can be created with AI later.\n\nProvide the response in the specified schema format with resolvedResources array.`;

    return this.retryPolicy.execute(async () => {
      const response = await ai.models.generateContent({
        model: this.modelId,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: RESOLVED_RESOURCES_RESPONSE_SCHEMA
        }
      });

      const jsonText = response.text;
      if (!jsonText) throw new Error("Empty resource resolution response");
      return JSON.parse(jsonText);
    });
  }
}