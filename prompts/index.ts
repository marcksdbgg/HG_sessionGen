import maestro from './prompt_maestro';
import inicial from './prompt_inicial';
import primaria from './prompt_primaria';
import secundaria from './prompt_secundaria';
import fichas from './prompt_fichas';
import recursos from './prompt_recursos';

// Type definitions for the prompt structures to ensure type safety
export interface PromptBase {
    role?: string;
    task?: string;
    style?: string;
    structure?: string;
    constraints?: string[];
    focus?: string;
    materials?: string;
    tone?: string;
    gradeRules?: string[];
    instruction?: string;
    organizerHint?: string;
}

// Export the raw JSONs wrapped in a typed object
export const Prompts = {
    maestro: maestro as PromptBase,
    inicial: inicial as PromptBase,
    primaria: primaria as PromptBase,
    secundaria: secundaria as PromptBase,
    fichas: fichas as PromptBase,
    recursos: recursos as PromptBase
};