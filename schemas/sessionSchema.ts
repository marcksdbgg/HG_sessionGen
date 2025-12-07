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
  },
  required: ["sessionTitle", "area", "cycleGrade", "teacherName", "inicio", "desarrollo", "cierre", "tareaCasa", "fichas"],
};