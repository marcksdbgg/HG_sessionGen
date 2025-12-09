import { Prompts, PromptBase } from "../prompts";
import { SessionRequest } from "../types";

export class PromptComposer {
  /**
   * Composes the full system prompt using the modular JSON configurations.
   */
  static compose(request: SessionRequest): string {
    const { nivel, grado, area, prompt: userRequest } = request;
    
    // 1. Identity & Core Task (Maestro)
    let composed = `${Prompts.maestro.role}\n${Prompts.maestro.task}\n`;
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
    
    // 5. User Context
    composed += `\n--- PEDIDO ESPECÍFICO ---\n`;
    composed += `Nivel: ${nivel} | Grado: ${grado} | Área: ${area}\n`;
    composed += `TEMA/PROMPT: "${userRequest}"\n`;
    
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
