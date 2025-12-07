import { SessionData, FormatPackId } from "../types";
import { FormatPackManager } from "./FormatPackManager";

export class ExportManager {
  private static formatList(items: string[] | undefined, latexPrefix: string = "\\item "): string {
    if (!items || items.length === 0) return "";
    return "\\begin{itemize}[leftmargin=*,nosep] " + items.map(i => `${latexPrefix}${i}`).join(" ") + " \\end{itemize}";
  }

  private static formatSimpleList(items: string[] | undefined): string {
    if (!items || items.length === 0) return "";
    return items.join(", ");
  }

  static generateLatex(data: SessionData, formatId: string): string {
    const pack = FormatPackManager.getPack(formatId);
    let tex = pack.template;

    // Metadata
    tex = tex.replace(/\[NOMBRE_SESION\]/g, data.sessionTitle);
    tex = tex.replace(/\[AREA\]/g, data.area);
    tex = tex.replace(/\[CICLO_GRADO\]/g, data.cycleGrade);
    tex = tex.replace(/\[DOCENTE\]/g, data.teacherName);

    // Inicio
    tex = tex.replace(/\[MOTIVACION\]/g, this.formatList(data.inicio.motivacion));
    tex = tex.replace(/\[SABERES_PREVIOS\]/g, this.formatList(data.inicio.saberesPrevios));
    tex = tex.replace(/\[CONFLICTO_COGNITIVO\]/g, this.formatList(data.inicio.conflictoCognitivo));
    tex = tex.replace(/\[PROPOSITO\]/g, this.formatList(data.inicio.propositoDidactico));
    tex = tex.replace(/\[MATERIALES_INICIO\]/g, this.formatList(data.inicio.materiales));

    // Desarrollo
    tex = tex.replace(/\[ESTRATEGIAS_DESARROLLO\]/g, this.formatList(data.desarrollo.estrategias));
    tex = tex.replace(/\[MATERIALES_DESARROLLO\]/g, this.formatList(data.desarrollo.materiales));

    // Cierre
    tex = tex.replace(/\[ESTRATEGIAS_CIERRE\]/g, this.formatList(data.cierre.estrategias));
    tex = tex.replace(/\[MATERIALES_CIERRE\]/g, this.formatList(data.cierre.materiales));

    // Tarea
    tex = tex.replace(/\[ACTIVIDADES_CASA\]/g, this.formatList(data.tareaCasa.actividades));
    tex = tex.replace(/\[MATERIALES_CASA\]/g, this.formatList(data.tareaCasa.materiales));

    return tex;
  }
}