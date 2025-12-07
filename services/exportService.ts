import { SessionData } from "../types";
import { LATEX_TEMPLATE } from "../constants";

function formatList(items: string[] | undefined, prefix: string = ""): string {
  if (!items || items.length === 0) return "";
  // For LaTeX, simple newlines or itemize if we want to be fancy. 
  // Given the template puts them in a table cell, bullet points are best.
  return "\\begin{itemize}[leftmargin=*,nosep] " + items.map(i => `\\item ${prefix}${i}`).join(" ") + " \\end{itemize}";
}

function formatTextList(items: string[] | undefined): string {
  if (!items || items.length === 0) return "";
  return items.join("\n• ");
}

export function generateLatex(data: SessionData): string {
  let tex = LATEX_TEMPLATE;

  // Replacements
  tex = tex.replace("[NOMBRE DE LA SESIÓN]", data.sessionTitle);
  tex = tex.replace("[Área Curricular]", data.area);
  tex = tex.replace("[Ciclo -- Grado]", data.cycleGrade);
  tex = tex.replace("[Nombre del Docente]", data.teacherName);

  // Inicio
  tex = tex.replace("[Estrategias de Motivación]", formatList(data.inicio.motivacion));
  tex = tex.replace("[Saberes Previos]", formatList(data.inicio.saberesPrevios));
  tex = tex.replace("[Conflicto Cognitivo]", formatList(data.inicio.conflictoCognitivo));
  tex = tex.replace("[Propósito Didáctico]", formatList(data.inicio.propositoDidactico));
  
  // Materials (Grouped for the side column in table)
  // We combine materials from Inicio to put in the side column first row, but the template 
  // has [Materiales] in multiple places. The request says "materials" is a list.
  // We will distribute materials relevant to each section if possible, or repeat general ones.
  // The JSON schema has materials per section.
  
  tex = tex.replace("[Materiales]", formatList(data.inicio.materiales)); // First occurrence (Inicio)
  
  // Desarrollo
  tex = tex.replace("[Estrategias de Desarrollo]", formatList(data.desarrollo.estrategias));
  // Note: The template has a second [Materiales] in Desarrollo row.
  // String.replace only replaces the first occurrence unless regex global flag is used.
  // However, we want to target specific placeholders. We should have unique placeholders 
  // or rely on order. Since the template uses exact strings, let's use a robust sequential replace.
  
  // To avoid replacing the wrong [Materiales], we can split the template or use a cursor. 
  // But simpler: the JS replace(string, val) replaces the FIRST occurrence. 
  // We already replaced the first [Materiales] above (for Inicio).
  // Now we replace the next one.
  
  tex = tex.replace("[Materiales]", formatList(data.desarrollo.materiales)); // Second occurrence (Desarrollo)
  
  // Cierre
  tex = tex.replace("[Estrategias de Cierre]", formatList(data.cierre.estrategias));
  tex = tex.replace("[Materiales]", formatList(data.cierre.materiales)); // Third occurrence (Cierre)

  // Tarea
  tex = tex.replace("[Tarea o Trabajo en Casa]", formatList(data.tareaCasa.actividades));
  tex = tex.replace("[Materiales]", formatList(data.tareaCasa.materiales)); // Fourth occurrence (Tarea)

  return tex;
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function printSession() {
  window.print();
}