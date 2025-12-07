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