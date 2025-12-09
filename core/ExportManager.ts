import { SessionData } from "../types";
import { LATEX_TEMPLATE } from "../formats";

export class ExportManager {
  private static escapeLatex(text: string): string {
    if (!text) return "";
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\$/g, '\\$')
      .replace(/&/g, '\\&')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_')
      .replace(/%/g, '\\%')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/~/g, '\\textasciitilde{}');
  }

  private static formatList(items: string[] | undefined, latexPrefix: string = "\\item "): string {
    if (!items || items.length === 0) return "";
    return "\\begin{itemize}[leftmargin=*,nosep] " + 
      items.map(i => `${latexPrefix}${this.escapeLatex(i)}`).join(" ") + 
      " \\end{itemize}";
  }

  static generateLatex(data: SessionData): string {
    let tex = LATEX_TEMPLATE;

    const safe = (str: string) => this.escapeLatex(str);

    // Metadata
    tex = tex.replace(/\[NOMBRE_SESION\]/g, safe(data.sessionTitle));
    tex = tex.replace(/\[AREA\]/g, safe(data.area));
    tex = tex.replace(/\[CICLO_GRADO\]/g, safe(data.cycleGrade));
    tex = tex.replace(/\[DOCENTE\]/g, safe(data.teacherName));

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
