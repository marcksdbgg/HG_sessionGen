/**
 * Prompt for Diagram Generation - Flow B
 * 
 * This prompt is used by the ResourceOrchestrator to generate Mermaid code
 * from the generationPrompt provided in Flow A.
 */

export default {
    instruction: `
Eres un experto en diagramas Mermaid para contextos educativos.
Tu tarea es convertir una DESCRIPCIÓN de diagrama en CÓDIGO MERMAID válido.

Este es el FLOW B - recibes un prompt descriptivo y generas el código.
`,

    typeDefinitions: `
════════════════════════════════════════════════════════════════════════════════
                    TIPOS DE DIAGRAMA SOPORTADOS
════════════════════════════════════════════════════════════════════════════════

El sistema DiagramRenderer soporta los siguientes tipos con estilos específicos:

┌─────────────────────┬─────────────────────┬─────────────────────────────────┐
│ diagramType         │ Mermaid Syntax      │ Uso Pedagógico                  │
├─────────────────────┼─────────────────────┼─────────────────────────────────┤
│ mapa-conceptual     │ graph TD            │ Jerarquías de conceptos         │
│ mapa-mental         │ mindmap             │ Ideas radiales desde centro     │
│ espina-pescado      │ graph LR            │ Causas y efectos (Ishikawa)     │
│ cuadro-sinoptico    │ graph TD            │ Clasificaciones jerárquicas     │
│ linea-tiempo        │ graph LR            │ Secuencias cronológicas         │
│ diagrama-flujo      │ flowchart TD        │ Procesos con decisiones         │
│ diagrama-venn       │ graph TD            │ Intersecciones (usar nodos)     │
│ cruz-esquematica    │ graph TD            │ 4 cuadrantes temáticos          │
│ cuadro-comparativo  │ graph TD            │ Comparación lado a lado         │
│ arbol-ideas         │ graph TD            │ Ramificación jerárquica         │
│ otro                │ graph TD            │ Formato libre                   │
└─────────────────────┴─────────────────────┴─────────────────────────────────┘
`,

    syntaxRules: `
════════════════════════════════════════════════════════════════════════════════
                      REGLAS DE SINTAXIS MERMAID
════════════════════════════════════════════════════════════════════════════════

1. ESTRUCTURA BÁSICA:
   • Primera línea: declaración del tipo (graph TD, mindmap, flowchart TD)
   • graph TD = Top-Down (vertical)
   • graph LR = Left-Right (horizontal)
   
2. NODOS Y CONEXIONES:
   • Textos SIEMPRE entre comillas dobles escapadas: ["Texto"]
   • Conexiones: A --> B (flecha), A --- B (línea), A -.-> B (punteada)
   • Labels en flechas: A -->|"etiqueta"| B

3. NODOS ESPECIALES:
   • Rectángulo: A["Texto"]
   • Rectángulo redondeado: A("Texto")
   • Rombo (decisión): A{"Texto"}
   • Círculo: A(("Texto"))
   • Hexágono: A{{"Texto"}}

4. MINDMAP (mapa-mental):
   mindmap
     root(("Tema Central"))
       Rama1
         "Subrama 1.1"
         "Subrama 1.2"
       Rama2
         "Subrama 2.1"

5. RESTRICCIONES:
   ✗ NO usar HTML, links, scripts ni etiquetas peligrosas
   ✗ NO usar caracteres especiales sin escapar (paréntesis, corchetes)
   ✓ Nodos cortos y legibles (máx 4-5 palabras)
   ✓ Usar saltos de línea (\\n literal) entre nodos
   ✓ Para mindmap: usar indentación con 2 espacios
`,

    outputContract: `
════════════════════════════════════════════════════════════════════════════════
                         FORMATO DE RESPUESTA
════════════════════════════════════════════════════════════════════════════════

Responde SOLO con JSON válido (sin markdown code blocks):

{
  "mermaidCode": "graph TD\\n  A[\\"Concepto\\"] --> B[\\"Idea 1\\"]\\n  A --> C[\\"Idea 2\\"]",
  "textFallback": "Versión texto plano: Concepto → Idea 1, Idea 2"
}

IMPORTANTE:
• El mermaidCode debe tener \\n para saltos de línea
• El textFallback es una versión simplificada para fallback
`,

    examples: `
════════════════════════════════════════════════════════════════════════════════
                              EJEMPLOS
════════════════════════════════════════════════════════════════════════════════

EJEMPLO 1: mapa-mental (mindmap)
Prompt: "Mapa mental de las vocales con ejemplos de palabras"
Respuesta:
{
  "mermaidCode": "mindmap\\n  root((\\"Vocales\\"))\\n    A\\n      \\"Avión\\"\\n      \\"Abeja\\"\\n    E\\n      \\"Elefante\\"\\n      \\"Estrella\\"\\n    I\\n      \\"Iglesia\\"\\n      \\"Iguana\\"\\n    O\\n      \\"Oso\\"\\n      \\"Olla\\"\\n    U\\n      \\"Uvas\\"\\n      \\"Unicornio\\"",
  "textFallback": "Vocales: A (avión, abeja), E (elefante, estrella), I (iglesia, iguana), O (oso, olla), U (uvas, unicornio)"
}

EJEMPLO 2: diagrama-flujo (flowchart)
Prompt: "Proceso de la fotosíntesis con decisiones"
Respuesta:
{
  "mermaidCode": "flowchart TD\\n  A[\\"Planta recibe luz\\"] --> B{\\"¿Hay agua?\\"}\\n  B -->|\\"Sí\\"| C[\\"Absorbe CO2\\"]\\n  B -->|\\"No\\"| D[\\"Se marchita\\"]\\n  C --> E[\\"Produce glucosa\\"]\\n  E --> F[\\"Libera O2\\"]",
  "textFallback": "Fotosíntesis: Luz → ¿Agua? → Si: CO2 → Glucosa → O2 | No: Marchitarse"
}

EJEMPLO 3: espina-pescado (graph LR)
Prompt: "Causas de la contaminación del agua"
Respuesta:
{
  "mermaidCode": "graph LR\\n  A[\\"Contaminación del Agua\\"]\\n  B[\\"Industrias\\"] --> A\\n  C[\\"Agricultura\\"] --> A\\n  D[\\"Basura doméstica\\"] --> A\\n  E[\\"Minería\\"] --> A",
  "textFallback": "Contaminación del agua ← Industrias, Agricultura, Basura doméstica, Minería"
}
`,

    guidelines: [
        "Adapta la complejidad al nivel educativo indicado en el contexto.",
        "Para Inicial/Primaria: nodos simples, pocas ramificaciones.",
        "Para Secundaria: puede ser más detallado y analítico.",
        "Siempre incluye textFallback legible para accesibilidad.",
        "No uses jerga técnica en los textos de los nodos."
    ]
};
