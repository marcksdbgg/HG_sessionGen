import maestro from './prompt_maestro';
import inicial from './prompt_inicial';
import primaria from './prompt_primaria';
import secundaria from './prompt_secundaria';
import fichas from './prompt_fichas';
import recursos from './prompt_recursos';
import imagenes from './prompt_imagenes';
import diagramas from './prompt_diagramas';

// Type definitions for the prompt structures to ensure type safety
export interface PromptBase {
    // Maestro
    role?: string;
    task?: string;
    style?: string;
    structure?: string;
    constraints?: string[];

    // Level blocks
    focus?: string;
    materials?: string;
    tone?: string;
    gradeRules?: string[];

    // Feature instructions
    instruction?: string;

    // Second flow prompts (builders)
    inputContract?: string;
    outputContract?: string;
    guidelines?: string[];
    examples?: string[];
}

// Export the raw JSONs wrapped in a typed object
export const Prompts = {
    maestro: maestro as PromptBase,
    inicial: inicial as PromptBase,
    primaria: primaria as PromptBase,
    secundaria: secundaria as PromptBase,
    fichas: fichas as PromptBase,
    recursos: recursos as PromptBase,

    // New: second pipeline prompt blueprints
    imagenes: imagenes as PromptBase,
    diagramas: diagramas as PromptBase,
};
