import { Templates } from "../formats";
import { FormatPack, FormatPackId } from "../types";

export class FormatPackManager {
  private static packs: Record<FormatPackId, FormatPack> = {
    minedu: {
      id: 'minedu',
      name: 'MINEDU Clásico',
      description: 'Formato estándar tabular detallado.',
      template: Templates.minedu
    },
    compacto: {
      id: 'compacto',
      name: 'Compacto',
      description: 'Ahorro de papel, estilo lista.',
      template: Templates.compacto
    },
    rural: {
      id: 'rural',
      name: 'Rural Simplificado',
      description: 'Letra grande, secciones esenciales.',
      template: Templates.rural
    }
  };

  static getPack(id: string): FormatPack {
    return this.packs[id as FormatPackId] || this.packs.minedu;
  }

  static getAllPacks(): FormatPack[] {
    return Object.values(this.packs);
  }
}