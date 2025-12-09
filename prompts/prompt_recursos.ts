/**
 * Prompt for Virtual Resources - OOP Abstraction Pattern
 * 
 * This prompt teaches the LLM about the polymorphic Resource system.
 * Flow A generates metadata; Flow B generates actual content.
 */

export default {
    instruction: `
════════════════════════════════════════════════════════════════════════════════
                    SISTEMA DE RECURSOS POLIMÓRFICOS
════════════════════════════════════════════════════════════════════════════════

Este sistema usa ARQUITECTURA DUAL de flujos:
  • FLOW A (este prompt): Generas METADATOS y PROMPTS de generación
  • FLOW B (automático): El sistema genera los recursos reales

IMPORTANTE: NO generes código Mermaid. NO inventes URLs. Solo describe QUÉ generar.

────────────────────────────────────────────────────────────────────────────────
                         CLASE ABSTRACTA: Resource
────────────────────────────────────────────────────────────────────────────────

interface BaseResource {
  id: string           // formato: tipo-momento-slug (ej: ai_image-inicio-mapa)
  type: ResourceType   // AI_IMAGE | DIAGRAM | VIDEO_SEARCH | IMAGE_SEARCH  
  title: string        // Título EXACTO para {{recurso:Título}}
  moment: Moment       // Inicio | Desarrollo | Cierre | TareaCasa
}

────────────────────────────────────────────────────────────────────────────────
                     IMPLEMENTACIONES CONCRETAS (Polimorfismo)
────────────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│  1. AI_IMAGE - Imagen generada por IA                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Campo adicional:                                                           │
│    generationPrompt: string                                                 │
│                                                                             │
│  Reglas:                                                                    │
│    • Prompt en INGLÉS optimizado para Gemini Image                          │
│    • SIEMPRE incluir: "Text inside the image must be in Spanish"            │
│    • Estilo según nivel: lúdico (Inicial), concreto (Primaria),             │
│      analítico (Secundaria)                                                 │
│    • Describir: sujeto, acción, entorno, estilo, iluminación, composición   │
│                                                                             │
│  Ejemplo:                                                                   │
│    {                                                                        │
│      id: "ai_image-inicio-mapa-vocales",                                    │
│      type: "AI_IMAGE",                                                      │
│      title: "Mapa de las Vocales",                                          │
│      moment: "Inicio",                                                      │
│      generationPrompt: "Colorful educational poster showing the 5 Spanish  │
│        vowels (A, E, I, O, U) with cute animal illustrations for each,      │
│        cartoon style, bright colors, white background, child-friendly.      │
│        Text inside the image must be in Spanish."                           │
│    }                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  2. DIAGRAM - Diagrama Mermaid (código generado en Flow B)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Campos adicionales:                                                        │
│    diagramType: OrganizerType                                               │
│    generationPrompt: string                                                 │
│                                                                             │
│  TIPOS DE DIAGRAMA DISPONIBLES:                                             │
│    • mapa-conceptual  - Jerarquías de conceptos (graph TD)                  │
│    • mapa-mental      - Ideas radiales desde centro (mindmap)               │
│    • espina-pescado   - Causa-efecto Ishikawa (graph LR)                    │
│    • cuadro-sinoptico - Clasificaciones jerárquicas                         │
│    • linea-tiempo     - Secuencias cronológicas (graph LR)                  │
│    • diagrama-flujo   - Procesos con decisiones (flowchart)                 │
│    • diagrama-venn    - Intersecciones y conjuntos                          │
│    • cruz-esquematica - 4 cuadrantes temáticos                              │
│    • cuadro-comparativo - Comparación lado a lado                           │
│    • arbol-ideas      - Ramificación jerárquica                             │
│    • otro             - Formato libre                                       │
│                                                                             │
│  ⚠️ NO escribas código Mermaid aquí. Describe QUÉ debe mostrar el diagrama. │
│                                                                             │
│  Ejemplo:                                                                   │
│    {                                                                        │
│      id: "diagram-desarrollo-ciclo-agua",                                   │
│      type: "DIAGRAM",                                                       │
│      title: "Ciclo del Agua",                                               │
│      moment: "Desarrollo",                                                  │
│      diagramType: "diagrama-flujo",                                         │
│      generationPrompt: "Diagrama circular del ciclo hidrológico mostrando:  │
│        evaporación → condensación → precipitación → escorrentía → vuelta    │
│        al mar. Incluir iconos simples para cada fase."                      │
│    }                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  3. VIDEO_SEARCH - Video de YouTube existente                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Campo adicional:                                                           │
│    searchQuery: string                                                      │
│                                                                             │
│  Reglas:                                                                    │
│    • Consulta de búsqueda en ESPAÑOL                                        │
│    • Incluir palabras clave relevantes                                      │
│    • Especificar si es para niños/educativo                                 │
│    • NO inventes URLs - el sistema buscará el video real                    │
│                                                                             │
│  Ejemplo:                                                                   │
│    {                                                                        │
│      id: "video_search-inicio-cancion-vocales",                             │
│      type: "VIDEO_SEARCH",                                                  │
│      title: "Canción de las Vocales",                                       │
│      moment: "Inicio",                                                      │
│      searchQuery: "canción infantil vocales español pegadiza educativa"     │
│    }                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  4. IMAGE_SEARCH - Foto real de internet                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Campo adicional:                                                           │
│    searchQuery: string                                                      │
│                                                                             │
│  Reglas:                                                                    │
│    • Consulta de búsqueda descriptiva                                       │
│    • Especificar "foto real" si no quieres ilustraciones                    │
│    • Incluir contexto educativo si es relevante                             │
│    • NO inventes URLs - el sistema buscará la imagen real                   │
│                                                                             │
│  Ejemplo:                                                                   │
│    {                                                                        │
│      id: "image_search-inicio-elefante-real",                               │
│      type: "IMAGE_SEARCH",                                                  │
│      title: "Foto de Elefante Real",                                        │
│      moment: "Inicio",                                                      │
│      searchQuery: "elefante africano foto real alta calidad educativa"      │
│    }                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

────────────────────────────────────────────────────────────────────────────────
                     SINCRONIZACIÓN CON ESTRATEGIAS
────────────────────────────────────────────────────────────────────────────────

Cuando una estrategia necesite un recurso, usa el MARCADOR GENÉRICO:

    {{recurso:TÍTULO_EXACTO}}

Este marcador es POLIMÓRFICO - el tipo se resuelve desde resources[].
El TÍTULO debe coincidir EXACTAMENTE con resources[].title.

Ejemplos en estrategias:
  • "La docente muestra {{recurso:Mapa de las Vocales}} y pregunta..."
  • "Se proyecta {{recurso:Canción de las Vocales}} para motivar..."
  • "Los estudiantes analizan {{recurso:Ciclo del Agua}} identificando fases..."

────────────────────────────────────────────────────────────────────────────────
                         EN MATERIALES POR SECCIÓN
────────────────────────────────────────────────────────────────────────────────

Lista recursos con formato legible:
  [TIPO] Título del Recurso

Ejemplos:
  • [AI_IMAGE] Mapa de las Vocales
  • [DIAGRAM] Ciclo del Agua  
  • [VIDEO_SEARCH] Canción de las Vocales
  • [IMAGE_SEARCH] Foto de Elefante Real
  • Pizarra, plumones (materiales físicos sin prefijo)

════════════════════════════════════════════════════════════════════════════════
                              ⚠️ CONSTRAINTS
════════════════════════════════════════════════════════════════════════════════

✗ NUNCA generes código Mermaid en Flow A - solo describe QUÉ diagramar
✗ NUNCA inventes URLs - usa VIDEO_SEARCH o IMAGE_SEARCH con searchQuery
✗ NUNCA uses {{imagen:...}} - usa el marcador genérico {{recurso:...}}
✓ SIEMPRE usa títulos EXACTOS entre resources[] y {{recurso:Título}}
✓ SIEMPRE incluye los campos requeridos según el tipo de recurso
`.trim()
};
