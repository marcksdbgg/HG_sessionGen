import { Prompts } from "../prompts";
import { SessionRequest } from "../types";

export class PromptComposer {
  static compose(request: SessionRequest): string {
    const { nivel, grado, area, prompt: userRequest } = request;
    
    // Base Identity
    let composed = `${Prompts.maestro.role}\n${Prompts.maestro.task}\n${Prompts.maestro.style}\n`;
    
    // Level Specifics
    let levelPrompt = Prompts.primaria;
    if (nivel === 'Inicial') levelPrompt = Prompts.inicial;
    if (nivel === 'Secundaria') levelPrompt = Prompts.secundaria;
    
    composed += `\nEnfoque de Nivel (${nivel}): ${levelPrompt.focus}\n`;
    composed += `Materiales sugeridos: ${levelPrompt.materials}\n`;
    composed += `Tono sugerido: ${levelPrompt.tone}\n`;
    
    // Fichas
    composed += `\n${Prompts.fichas.instruction}\n`;
    
    // Specific Context
    composed += `\nCONTEXTO ESPECÍFICO:\n`;
    composed += `Nivel: ${nivel}\n`;
    composed += `Grado: ${grado}\n`;
    composed += `Área: ${area}\n`;
    composed += `PEDIDO DEL DOCENTE: "${userRequest}"\n`;
    
    return composed;
  }

  static composeRegeneration(section: string, currentContent: any, instructions: string): string {
    return `
      Eres el mismo experto pedagogo. Necesito que RE-ESCRIBAS solamente la sección: "${section}".
      
      Contenido actual (para referencia):
      ${JSON.stringify(currentContent)}
      
      Nuevas instrucciones para el cambio:
      "${instructions}"
      
      Mantén el mismo formato JSON estricto para esta sección.
    `;
  }
}