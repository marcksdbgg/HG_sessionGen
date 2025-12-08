import { Type, Schema } from "@google/genai";

// Schema for the resolved resource response
export const RESOLVED_RESOURCE_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        id: {
            type: Type.STRING,
            description: "The ID of the resource from the original recursos array"
        },
        resolvedUrl: {
            type: Type.STRING,
            description: "DIRECT URL to the image or video. For images: must be a direct .jpg/.png URL. For videos: use YouTube embed format https://www.youtube.com/embed/VIDEO_ID. NEVER use search URLs."
        },
        thumbnailUrl: {
            type: Type.STRING,
            description: "Direct URL to a thumbnail image (optional, for videos)"
        },
        mode: {
            type: Type.STRING,
            enum: ["direct", "generated"],
            description: "'direct' for URLs found from trusted sources, 'generated' if content should be created with AI"
        },
        sourceName: {
            type: Type.STRING,
            description: "Name of the source (e.g., 'NASA Images', 'National Geographic', 'Wikimedia Commons')"
        }
    },
    required: ["id", "resolvedUrl", "mode"]
};

export const RESOLVED_RESOURCES_RESPONSE_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        resolvedResources: {
            type: Type.ARRAY,
            items: RESOLVED_RESOURCE_SCHEMA,
            description: "Array of resolved resources with direct URLs"
        }
    },
    required: ["resolvedResources"]
};
