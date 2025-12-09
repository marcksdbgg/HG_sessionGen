export interface SessionBlock {
  motivacion?: string[];
  saberesPrevios?: string[];
  conflictoCognitivo?: string[];
  propositoDidactico?: string[];
  estrategias?: string[];
  actividades?: string[];
  materiales?: string[];
}

export interface FichaContent {
  titulo: string;
  instrucciones: string[];
  items: string[];
}

export type OrganizerType =
  | 'mapa-conceptual'
  | 'mapa-mental'
  | 'espina-pescado'
  | 'cuadro-sinoptico'
  | 'linea-tiempo'
  | 'diagrama-flujo'
  | 'diagrama-venn'
  | 'cruz-esquematica'
  | 'cuadro-comparativo'
  | 'arbol-ideas'
  | 'otro';

export interface Organizer {
  id: string;
  title: string;
  type: OrganizerType;
  mermaidCode: string; // The code to render
  description: string;
  textFallback?: string; // Fallback if render fails
  notes?: string;
}

export interface GeneratedImage {
  id: string;
  title: string;
  prompt: string; // The prompt used to generate it
  moment: 'Inicio' | 'Desarrollo' | 'Cierre';
  base64Data?: string; // The actual generated image
  isLoading?: boolean;
  error?: string; // Error message if generation failed
}

export interface VirtualResources {
  organizer: Organizer;
  images: GeneratedImage[];
  diagrams?: Organizer[]; // Refactor: Support for additional diagrams
}

// Callback for progressive resource updates (non-blocking flow)
export type ResourceUpdateCallback = (
  type: 'image' | 'diagram',
  resourceId: string,
  resource: GeneratedImage | Organizer
) => void;

export interface SessionData {
  sessionTitle: string;
  area: string;
  cycleGrade: string;
  teacherName: string;
  inicio: {
    motivacion: string[];
    saberesPrevios: string[];
    conflictoCognitivo: string[];
    propositoDidactico: string[];
    materiales: string[];
  };
  desarrollo: {
    estrategias: string[];
    materiales: string[];
  };
  cierre: {
    estrategias: string[];
    materiales: string[];
  };
  tareaCasa: {
    actividades: string[];
    materiales: string[];
  };
  fichas: {
    aula: FichaContent;
    casa: FichaContent;
  };
  resources: VirtualResources;
}

export interface SessionRecord {
  id: string;
  timestamp: number;
  data: SessionData;
  preview: string;
}

export interface SessionRequest {
  nivel: string;
  grado: string;
  area: string;
  prompt: string;
}

export type FormatPackId = 'minedu' | 'compacto' | 'rural';

export interface FormatPack {
  id: FormatPackId;
  name: string;
  description: string;
  template: string;
}
