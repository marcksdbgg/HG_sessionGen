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
        description: "Recursos virtuales para proyectar en clase.",
        properties: {
            organizer: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, description: "Uno de: mapa-conceptual, mapa-mental, espina-pescado, cuadro-sinoptico, linea-tiempo, diagrama-flujo, diagrama-venn, cruz-esquematica, cuadro-comparativo, arbol-ideas" },
                    mermaidCode: { type: Type.STRING, description: "Código Mermaid graph TD o mindmap. IMPORTANTE: 1. Textos de nodos entre comillas dobles. 2. 'graph TD' debe estar en su propia línea." },
                    description: { type: Type.STRING, description: "Breve explicación del gráfico." },
                    textFallback: { type: Type.STRING, description: "Versión texto plano del gráfico por si falla el render." }
                },
                required: ["title", "type", "mermaidCode", "description"]
            },
            images: {
                type: Type.ARRAY,
                description: "Lista de 2 a 3 imágenes clave para generar.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        prompt: { type: Type.STRING, description: "Prompt descriptivo en inglés optimizado para generar la imagen (fotorealista o ilustración según nivel)." },
                        moment: { type: Type.STRING, description: "Inicio, Desarrollo o Cierre" }
                    },
                    required: ["title", "prompt", "moment"]
                }
            }
        },
        required: ["organizer", "images"]
    }
  },
  required: ["sessionTitle", "area", "cycleGrade", "teacherName", "inicio", "desarrollo", "cierre", "tareaCasa", "fichas", "resources"],
};