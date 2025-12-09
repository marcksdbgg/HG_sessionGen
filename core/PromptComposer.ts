import { Prompts, PromptBase } from "../prompts";
import { SessionRequest } from "../types";

export class PromptComposer {
  /**
   * Composes the full system prompt using the modular JSON configurations.
   * Teacher instructions are placed FIRST with maximum emphasis.
   */
  static compose(request: SessionRequest): string {
    const { nivel, grado, area, prompt: userRequest } = request;

    // 0. PRIORITY: Teacher's specific instructions FIRST
    let composed = `╔══════════════════════════════════════════════════════════════╗
║  INSTRUCCIONES PRIORITARIAS DEL DOCENTE - CUMPLIR AL PIE DE LA LETRA  ║
╚══════════════════════════════════════════════════════════════╝

CONTEXTO DE LA SESIÓN:
- Nivel: ${nivel}
- Grado: ${grado}
- Área: ${area}

PEDIDO ESPECÍFICO DEL DOCENTE (MÁXIMA PRIORIDAD):
"${userRequest}"

REGLAS DE INTERPRETACIÓN:
1. Si el docente pide buscar un video de YouTube EXISTENTE → usa VID_YT: Título :: URL (busca la URL real)
2. Si el docente pide imágenes REALES (fotos, no dibujos) → usa IMG_URL: Título :: URL para fotos reales
3. Si el docente pide imágenes ilustradas/generadas → usa IMG_GEN: Título con entrada en resources.images
4. Si el docente pide un organizador específico → genera ese tipo en resources.organizer
5. PRIORIZA lo que el docente pide explícitamente sobre las reglas generales

═══════════════════════════════════════════════════════════════

`;

    // 1. Identity & Core Task (Maestro)
    composed += `${Prompts.maestro.role}\n${Prompts.maestro.task}\n`;
    composed += `Estilo y Reglas: ${Prompts.maestro.style}\n`;
    composed += `Restricciones: ${JSON.stringify(Prompts.maestro.constraints)}\n`;

    // 2. Level Specific Strategy
    let levelConfig: PromptBase = Prompts.primaria; // Default
    if (nivel === 'Inicial') levelConfig = Prompts.inicial;
    if (nivel === 'Secundaria') levelConfig = Prompts.secundaria;

    composed += `\n--- ESTRATEGIA PARA NIVEL ${nivel.toUpperCase()} ---\n`;
    composed += `Enfoque: ${levelConfig.focus}\n`;
    composed += `Materiales Físicos: ${levelConfig.materials}\n`;
    composed += `Tono: ${levelConfig.tone}\n`;
    composed += `Reglas de Grado: ${JSON.stringify(levelConfig.gradeRules)}\n`;

    // 3. Virtual Resources Logic
    composed += `\n--- RECURSOS VIRTUALES (IMPORTANTE) ---\n`;
    composed += `${Prompts.recursos.instruction}\n`;

    // 4. Fichas Logic
    composed += `\n--- FICHAS DE APLICACIÓN ---\n`;
    composed += `${Prompts.fichas.instruction}\n`;

    // 5. Reminder of teacher request at the end
    composed += `\n--- RECORDATORIO FINAL ---\n`;
    composed += `NO OLVIDES cumplir el pedido del docente: "${userRequest}"\n`;

    return composed;
  }

  static composeRegeneration(section: string, currentContent: any, instructions: string): string {
    return `
      Eres el mismo experto pedagogo. Necesito que RE-ESCRIBAS solamente la sección: "${section}".
      
      Contenido actual (para referencia):
      ${JSON.stringify(currentContent)}
      
      Nuevas instrucciones para el cambio:
      "${instructions}"
      
      IMPORTANTE: Devuelve un JSON con la clave raíz exactamente igual a "${section}".
      Ejemplo: { "${section}": { ...contenido... } }
      
      Mantén el formato de esa sección válido según el esquema original.
    `;
  }
}
