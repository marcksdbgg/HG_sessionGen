// ========================================
// Resource Types for Virtual Resources
// ========================================

export type ResourceKind = 'image' | 'video' | 'organizer' | 'reading' | 'worksheet' | 'other';
export type ResourceMoment = 'inicio' | 'desarrollo' | 'cierre' | 'tarea' | 'general';
export type ResourceIntent = 'project' | 'print' | 'copy-to-notebook' | 'demo' | 'homework';

export interface ResourceSource {
  mode: 'external' | 'generated';
  providerHint?: string;  // Institution/collection suggested for external
  queryHint?: string;     // Search query suggested by LLM
  generationHint?: string; // Generation prompt for AI-generated resources
}

export interface Resource {
  id: string;
  title: string;
  kind: ResourceKind;
  moment: ResourceMoment;
  intent: ResourceIntent;
  source: ResourceSource;
  notes?: string; // Pedagogical usage notes
}

// Enriched resource after resolution
export interface ResolvedResource extends Resource {
  status: 'pending' | 'resolved' | 'error';
  url?: string;
  thumbnail?: string;
  attribution?: string;
  license?: string;
}

// ========================================
// Session Types
// ========================================

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
  // NEW: Structured virtual resources
  recursos: Resource[];
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
  imageBase64?: string;
  imageMimeType?: string;
}

export type FormatPackId = 'minedu' | 'compacto' | 'rural';

export interface FormatPack {
  id: FormatPackId;
  name: string;
  description: string;
  template: string;
}