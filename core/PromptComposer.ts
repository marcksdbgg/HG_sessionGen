import { Prompts } from "../prompts";
import { SessionRequest } from "../types";

export class PromptComposer {
  static compose(request: SessionRequest): string {
    const { nivel, grado, area, prompt: userRequest } = request;

    // Base Identity
    let composed = `${Prompts.maestro.role}\n${Prompts.maestro.task}\n${Prompts.maestro.style}\n`;

    // Structure requirement
    composed += `\nESTRUCTURA REQUERIDA:\n${Prompts.maestro.structure}\n`;

    // Global constraints
    composed += `\nREGLAS OBLIGATORIAS:\n`;
    Prompts.maestro.constraints.forEach((constraint: string, idx: number) => {
      composed += `${idx + 1}. ${constraint}\n`;
    });

    // Level Specifics
    let levelPrompt = Prompts.primaria;
    if (nivel === 'Inicial') levelPrompt = Prompts.inicial;
    if (nivel === 'Secundaria') levelPrompt = Prompts.secundaria;

    composed += `\nENFOQUE DE NIVEL (${nivel}):\n`;
    composed += `Enfoque pedagógico: ${levelPrompt.focus}\n`;
    composed += `Materiales sugeridos: ${levelPrompt.materials}\n`;
    composed += `Tono: ${levelPrompt.tone}\n`;

    // Level-specific grade rules
    if (levelPrompt.gradeRules && levelPrompt.gradeRules.length > 0) {
      composed += `\nReglas específicas para ${nivel}:\n`;
      levelPrompt.gradeRules.forEach((rule: string) => {
        composed += `- ${rule}\n`;
      });
    }

    // Fichas instruction
    composed += `\nFICHAS:\n${Prompts.fichas.instruction}\n`;

    // Resources instruction
    composed += `\nRECURSOS VIRTUALES:\n${Prompts.recursos.instruction}\n`;

    // Organizers instruction (Mermaid diagrams)
    composed += `\nORGANIZADORES VISUALES CON CÓDIGO MERMAID:\n${Prompts.organizadores.instruction}\n`;

    // Specific Context
    composed += `\n========================================\n`;
    composed += `CONTEXTO ESPECÍFICO DE ESTA SESIÓN:\n`;
    composed += `Nivel: ${nivel}\n`;
    composed += `Grado: ${grado}\n`;
    composed += `Área: ${area}\n`;
    composed += `\nPEDIDO DEL DOCENTE:\n"${userRequest}"\n`;
    composed += `========================================\n`;

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

  static composeResourcesRegeneration(currentResources: any[], nivel: string, instructions: string): string {
    return `
      Eres el mismo experto pedagogo. Necesito que RE-GENERES los recursos virtuales de la sesión.
      
      Recursos actuales (para referencia):
      ${JSON.stringify(currentResources)}
      
      Nivel educativo: ${nivel}
      
      Nuevas instrucciones:
      "${instructions}"
      
      Recuerda:
      - Para temas reales/específicos, usa mode: "external" con providerHint y queryHint.
      - Solo usa mode: "generated" para contenido creativo o ficticio.
      
      Mantén el formato JSON estricto del schema de recursos.
    `;
  }
}