export default {
    instruction: [
        "Prompt de soporte para el FLUJO B (generación de imágenes).",
        "Tu tarea es convertir contexto pedagógico en prompts de imagen de alta calidad."
    ].join(" "),

    inputContract: [
        "Recibirás un objeto con:",
        "{",
        "  nivel, grado, area,",
        "  sectionKey,",
        "  sectionText: string[],",
        "  materials: string[],",
        "  imageRefs: [{ title, moment, existingPrompt? }]",
        "}"
    ].join("\n"),

    outputContract: [
        "Devuelve SOLO JSON válido:",
        "{",
        "  images: [",
        "    { id, title, moment, prompt }",
        "  ]",
        "}"
    ].join("\n"),

    guidelines: [
        "Respeta el nivel: más lúdico y simple en Inicial, más concreto en Primaria, más analítico en Secundaria.",
        "El título debe ser idéntico al recibido si ya existe.",
        "El prompt debe ser específico y visualmente didáctico.",
        "Incluye la línea literal: 'Text inside the image must be in Spanish'.",
        "Evita marcas registradas y rostros de personas reales identificables.",
        "Si el material sugiere una imagen externa real muy específica, crea una versión genérica educativa."
    ],

    examples: [
        "Ejemplo de estilo de prompt:",
        "Ilustración educativa limpia y clara de ...; etiquetas simples; fondo neutro;",
        "Text inside the image must be in Spanish."
    ]
};
