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

// === POLYMORPHIC RESOURCE SYSTEM ===

export type ResourceType = 'AI_IMAGE' | 'DIAGRAM' | 'VIDEO_SEARCH' | 'IMAGE_SEARCH';
export type ResourceMoment = 'Inicio' | 'Desarrollo' | 'Cierre' | 'TareaCasa';
export type ResourceStatus = 'pending' | 'loading' | 'ready' | 'error';

/**
 * Base interface for all resources (abstract class concept)
 */
export interface BaseResource {
  id: string;
  type: ResourceType;
  title: string;
  moment: ResourceMoment;
  status: ResourceStatus;
  error?: string;
}

/**
 * AI-generated image resource
 */
export interface AIImageResource extends BaseResource {
  type: 'AI_IMAGE';
  generationPrompt: string;  // Prompt for Gemini Image model
  base64Data?: string;       // Generated image data (Flow B)
}

/**
 * Mermaid diagram resource
 */
export interface DiagramResource extends BaseResource {
  type: 'DIAGRAM';
  diagramType: OrganizerType;
  generationPrompt: string;  // Prompt describing what to diagram (Flow A)
  mermaidCode?: string;      // Generated Mermaid code (Flow B)
  textFallback?: string;     // Text fallback if render fails
}

/**
 * External YouTube video resource
 */
export interface ExternalVideoResource extends BaseResource {
  type: 'VIDEO_SEARCH';
  searchQuery: string;       // Search query for Google
  url?: string;              // Resolved URL (Flow B)
  thumbnailUrl?: string;
}

/**
 * External image resource (real photos)
 */
export interface ExternalImageResource extends BaseResource {
  type: 'IMAGE_SEARCH';
  searchQuery: string;
  url?: string;              // Resolved URL (Flow B)
}

/**
 * Union type for all resource types (polymorphism)
 */
export type Resource = AIImageResource | DiagramResource | ExternalVideoResource | ExternalImageResource;

// === LEGACY TYPES (for backward compatibility during migration) ===

export interface Organizer {
  id: string;
  title: string;
  type: OrganizerType;
  mermaidCode: string;
  description: string;
  textFallback?: string;
  notes?: string;
}

export interface GeneratedImage {
  id: string;
  title: string;
  prompt: string;
  moment: 'Inicio' | 'Desarrollo' | 'Cierre';
  base64Data?: string;
  isLoading?: boolean;
  error?: string;
}

// === VIRTUAL RESOURCES ===

export interface VirtualResources {
  // New polymorphic array (primary)
  resources: Resource[];

  // Legacy fields (for backward compatibility)
  organizer?: Organizer;
  images?: GeneratedImage[];
  diagrams?: Organizer[];
}

// === CALLBACKS ===

export type ResourceUpdateCallback = (
  type: 'resource' | 'image' | 'diagram' | 'section_update',
  resourceId: string,
  data: Resource | GeneratedImage | Organizer | { section: keyof SessionData, field: string, value: string[] }
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
  image?: string;
}

export type FormatPackId = 'minedu';

export interface FormatPack {
  id: FormatPackId;
  name: string;
  description: string;
  template: string;
}