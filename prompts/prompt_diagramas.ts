export default {
    instruction: [
        "Prompt de soporte para el FLUJO B (generación de diagramas Mermaid).",
        "Genera código Mermaid robusto y compatible con DiagramRenderer."
    ].join(" "),

    inputContract: [
        "Recibirás un objeto con:",
        "{",
        "  nivel, grado, area,",
        "  sectionKey,",
        "  sectionText: string[],",
        "  diagramTitle: string,",
        "  diagramType?: string",
        "}"
    ].join("\n"),

    outputContract: [
        "Devuelve SOLO JSON válido:",
        "{",
        "  organizer: {",
        "    id, title, type, mermaidCode, description, textFallback",
        "  }",
        "}"
    ].join("\n"),

    guidelines: [
        "El mermaidCode debe iniciar con 'graph TD' o 'mindmap' en la primera línea.",
        "Asegura que los textos de nodos estén entre comillas dobles.",
        "No uses HTML, links, ni etiquetas peligrosas.",
        "Crea nodos cortos y legibles para proyección en aula.",
        "Incluye un textFallback que refleje la misma estructura.",
        "Si diagramType no viene, elige el más adecuado al contenido de la sección."
    ],

    examples: [
        "graph TD",
        "A[\"Concepto central\"] --> B[\"Idea 1\"]",
        "A --> C[\"Idea 2\"]"
    ]
};
