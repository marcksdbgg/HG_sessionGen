import { Type, Schema } from "@google/genai";

export const SESSION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    sessionTitle: { type: Type.STRING, description: "Título creativo y corto de la sesión." },
    area: { type: Type.STRING },
    cycleGrade: { type: Type.STRING },
    teacherName: { type: Type.STRING, description: "Usar '___________' como placeholder." },
    inicio: {
      type: Type.OBJECT,
      properties: {
        motivacion: { type: Type.ARRAY, items: { type: Type.STRING } },
        saberesPrevios: { type: Type.ARRAY, items: { type: Type.STRING } },
        conflictoCognitivo: { type: Type.ARRAY, items: { type: Type.STRING } },
        propositoDidactico: { type: Type.ARRAY, items: { type: Type.STRING } },
        materiales: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["motivacion", "saberesPrevios", "conflictoCognitivo", "propositoDidactico", "materiales"],
    },
    desarrollo: {
      type: Type.OBJECT,
      properties: {
        estrategias: { type: Type.ARRAY, items: { type: Type.STRING } },
        materiales: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["estrategias", "materiales"],
    },
    cierre: {
      type: Type.OBJECT,
      properties: {
        estrategias: { type: Type.ARRAY, items: { type: Type.STRING } },
        materiales: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["estrategias", "materiales"],
    },
    tareaCasa: {
      type: Type.OBJECT,
      properties: {
        actividades: { type: Type.ARRAY, items: { type: Type.STRING } },
        materiales: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["actividades", "materiales"],
    },
    fichas: {
      type: Type.OBJECT,
      properties: {
        aula: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            instrucciones: { type: Type.ARRAY, items: { type: Type.STRING } },
            items: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["titulo", "instrucciones", "items"],
        },
        casa: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            instrucciones: { type: Type.ARRAY, items: { type: Type.STRING } },
            items: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["titulo", "instrucciones", "items"],
        },
      },
      required: ["aula", "casa"],
    },
    resources: {
      type: Type.OBJECT,
      description: "Recursos virtuales para proyectar en clase. Flow A genera metadatos; Flow B genera contenido.",
      properties: {
        resources: {
          type: Type.ARRAY,
          description: "Lista unificada de recursos. El código procesará cada tipo en Flow B.",
          items: {
            type: Type.OBJECT,
            properties: {
              id: {
                type: Type.STRING,
                description: "ID único formato: tipo-momento-slug (ej: ai_image-inicio-mapa-vocales)"
              },
              type: {
                type: Type.STRING,
                description: "Tipo de recurso: AI_IMAGE | DIAGRAM | VIDEO_SEARCH | IMAGE_SEARCH"
              },
              title: {
                type: Type.STRING,
                description: "Título EXACTO que se usará en {{recurso:Título}}"
              },
              moment: {
                type: Type.STRING,
                description: "Momento: Inicio | Desarrollo | Cierre | TareaCasa"
              },

              // For AI_IMAGE
              generationPrompt: {
                type: Type.STRING,
                description: "Para AI_IMAGE: prompt en inglés para Gemini Image. Para DIAGRAM: descripción breve de qué diagramar (NO código Mermaid)."
              },

              // For DIAGRAM
              diagramType: {
                type: Type.STRING,
                description: "Solo para DIAGRAM. Tipo: mapa-conceptual | mapa-mental | espina-pescado | cuadro-sinoptico | linea-tiempo | diagrama-flujo | diagrama-venn | cruz-esquematica | cuadro-comparativo | arbol-ideas | otro"
              },

              // For VIDEO_SEARCH and IMAGE_SEARCH
              searchQuery: {
                type: Type.STRING,
                description: "Para VIDEO_SEARCH e IMAGE_SEARCH: consulta de búsqueda en español"
              }
            },
            required: ["id", "type", "title", "moment"]
          }
        }
      },
      required: ["resources"]
    }
  },
  required: ["sessionTitle", "area", "cycleGrade", "teacherName", "inicio", "desarrollo", "cierre", "tareaCasa", "fichas", "resources"],
};
