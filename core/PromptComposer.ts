import { Prompts } from "../prompts";
import { SessionRequest } from "../types";

export class PromptComposer {
  static compose(request: SessionRequest): string {
    const { nivel, grado, area, prompt: userRequest, imageBase64 } = request;

    // Base Identity
    let composed = `${Prompts.maestro.role}\n${Prompts.maestro.task}\n${Prompts.maestro.style}\n`;

    // Add structure requirement
    composed += `\n${Prompts.maestro.structure}\n`;

    // Add constraints
    if (Prompts.maestro.constraints && Prompts.maestro.constraints.length > 0) {
      composed += `\nREGLAS OBLIGATORIAS:\n`;
      Prompts.maestro.constraints.forEach((constraint: string, idx: number) => {
        composed += `${idx + 1}. ${constraint}\n`;
      });
    }

    // Level Specifics
    let levelPrompt = Prompts.primaria;
    if (nivel === 'Inicial') levelPrompt = Prompts.inicial;
    if (nivel === 'Secundaria') levelPrompt = Prompts.secundaria;

    composed += `\nEnfoque de Nivel (${nivel}): ${levelPrompt.focus}\n`;
    composed += `Materiales sugeridos: ${levelPrompt.materials}\n`;
    composed += `Tono sugerido: ${levelPrompt.tone}\n`;

    // Add grade rules if available
    if (levelPrompt.gradeRules && levelPrompt.gradeRules.length > 0) {
      composed += `\nReglas específicas para ${nivel}:\n`;
      levelPrompt.gradeRules.forEach((rule: string) => {
        composed += `• ${rule}\n`;
      });
    }

    // Fichas
    composed += `\n${Prompts.fichas.instruction}\n`;

    // Resources instruction if available
    if (Prompts.recursos?.instruction) {
      composed += `\n${Prompts.recursos.instruction}\n`;
    }

    // Specific Context
    composed += `\nCONTEXTO ESPECÍFICO:\n`;
    composed += `Nivel: ${nivel}\n`;
    composed += `Grado: ${grado}\n`;
    composed += `Área: ${area}\n`;

    // Handle image context
    if (imageBase64) {
      composed += `\nENTRADA VISUAL:\n`;
      composed += `Se ha proporcionado una imagen del libro o material didáctico del docente.\n`;
      composed += `ANALIZA la imagen cuidadosamente y extrae:\n`;
      composed += `1. El tema o concepto principal\n`;
      composed += `2. La información teórica mostrada\n`;
      composed += `3. Cualquier ejercicio, ejemplo o actividad visible\n`;
      composed += `4. El nivel de complejidad del contenido\n`;
      composed += `\nUsa esta información para crear una sesión de aprendizaje que enseñe el contenido de la imagen.\n`;
    }

    composed += `\nPEDIDO DEL DOCENTE: "${userRequest}"\n`;

    // Final instruction
    composed += `\nGENERA la sesión de aprendizaje completa en formato JSON según el esquema proporcionado.`;

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