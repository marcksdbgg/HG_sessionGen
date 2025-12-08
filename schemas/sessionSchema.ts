import { Type, Schema } from "@google/genai";

// Organizer visual schema - supports Mermaid diagrams
const ORGANIZER_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Unique identifier (e.g., 'org-mapa-conceptual-1')" },
    title: { type: Type.STRING, description: "Título descriptivo del organizador" },
    type: {
      type: Type.STRING,
      enum: ["mapa-conceptual", "espina-pescado", "cruz-esquematica", "diagrama-flujo", "cuadro-sinoptico", "mapa-mental", "linea-tiempo", "cuadro-comparativo", "arbol-ideas", "diagrama-venn", "otro"],
      description: "Tipo de organizador visual"
    },
    description: { type: Type.STRING, description: "Descripción breve del contenido y propósito del organizador" },
    mermaidCode: {
      type: Type.STRING,
      description: "Código Mermaid válido para renderizar el diagrama. Usar sintaxis flowchart TB para mapas, mindmap para mapas mentales. IMPORTANTE: Escapar caracteres especiales en las etiquetas."
    },
    textFallback: {
      type: Type.STRING,
      description: "Representación en texto plano del organizador (por si falla el renderizado)"
    },
    notes: { type: Type.STRING, description: "Instrucciones para el docente sobre cómo usar este organizador" }
  },
  required: ["id", "title", "type", "mermaidCode", "textFallback"]
};

// Resource schema for structured virtual resources
const RESOURCE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Unique identifier for the resource (e.g., 'img-inicio-1', 'video-desarrollo-1')" },
    title: { type: Type.STRING, description: "Brief descriptive title of the resource" },
    kind: {
      type: Type.STRING,
      enum: ["image", "video", "organizer", "reading", "worksheet", "other"],
      description: "Type of resource"
    },
    moment: {
      type: Type.STRING,
      enum: ["inicio", "desarrollo", "cierre", "tarea", "general"],
      description: "Which moment of the session this resource belongs to"
    },
    intent: {
      type: Type.STRING,
      enum: ["project", "print", "copy-to-notebook", "demo", "homework"],
      description: "How the resource is intended to be used"
    },
    source: {
      type: Type.OBJECT,
      properties: {
        mode: {
          type: Type.STRING,
          enum: ["external", "generated"],
          description: "'external' for real resources from institutions, 'generated' for AI-generated content"
        },
        providerHint: { type: Type.STRING, description: "Institution, museum, or collection suggested (for external mode)" },
        queryHint: { type: Type.STRING, description: "Search term suggested to find the resource (for external mode)" },
        generationHint: { type: Type.STRING, description: "Brief prompt to generate the resource (for generated mode, only for creative/fictional content)" }
      },
      required: ["mode"]
    },
    notes: { type: Type.STRING, description: "Pedagogical usage notes for the teacher" }
  },
  required: ["id", "title", "kind", "moment", "intent", "source"]
};

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
    // Structured virtual resources (images, videos, readings)
    recursos: {
      type: Type.ARRAY,
      items: RESOURCE_SCHEMA,
      description: "Array of virtual resources for the session: images, videos, readings. Do NOT include organizers here."
    },
    // NEW: Visual organizers with Mermaid code
    organizadores: {
      type: Type.ARRAY,
      items: ORGANIZER_SCHEMA,
      description: "Array of visual organizers (concept maps, fishbone diagrams, etc.) with Mermaid code for rendering. Include at least 1 organizer per session."
    }
  },
  required: ["sessionTitle", "area", "cycleGrade", "teacherName", "inicio", "desarrollo", "cierre", "tareaCasa", "fichas", "recursos", "organizadores"],
};