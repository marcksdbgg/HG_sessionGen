# Estado Actual del Codebase (Documentación Técnica)

Este documento describe el estado técnico actual del proyecto `HG_sessionGen` (Aula Express) basado en el análisis del código fuente existente.

## Información General
- **Nombre del Proyecto:** Aula Express (HG_sessionGen)
- **Tipo de Aplicación:** Single Page Application (SPA / Client-side only)
- **Stack Tecnológico:**
    - **Frontend:** React 19, TypeScript, Vite
    - **Estilos:** TailwindCSS
    - **Iconos:** Lucide React
    - **IA SDK:** @google/genai (Google Generative AI SDK)

## Estructura de Archivos (Resumen)
```text
HG_sessionGen/
├── .env.local              # Variables de entorno (API Key)
├── components/
│   ├── Home.tsx            # Vista principal y formulario
│   └── SessionResult.tsx   # Vista de resultados y exportación
├── services/
│   ├── geminiService.ts    # Lógica de comunicación con LLM
│   └── exportService.ts    # Utilidades de exportación (LaTeX)
├── constants.ts            # Textos estáticos y plantilla LaTeX
├── types.ts                # Definiciones de tipos TypeScript
└── App.tsx                 # Router simple
```

## Análisis de Componentes

### 1. `components/Home.tsx`
Es el punto de entrada principal.
- **Funcionalidad:**
  - Formulario React controlado para Nivel, Grado, Área y Prompt.
  - **Dictado por Voz:** Implementa `webkitSpeechRecognition` para entrada de texto por voz.
  - **Feedback de Carga:** Muestra mensajes rotativos ("Estructurando momentos...", "Diseñando estrategias...") para mejorar la UX durante la espera del LLM.
  - **Historial Local:** Guarda y recupera las últimas 3 sesiones en `localStorage` (clave `aula_history`).
  - **Navegación:** Renderizado condicional mediante callback `onSessionGenerated`.

### 2. `components/SessionResult.tsx`
Muestra la sesión generada.
- **Visualización:** Despliega el objeto `SessionData` en secciones colapsables o bloques visuales (Inicio, Desarrollo, Cierre, Fichas).
- **Manejo de LaTeX:**
  - Genera código LaTeX usando una plantilla base (`LATEX_TEMPLATE`) y rellenando los datos del JSON.
  - Funcionalidad de copiar al portapapeles.
- **Impresión:** Botón que invoca `window.print()` con estilos CSS `@media print` optimizados para PDF.

## Lógica de Negocio e I.A. (`geminiService.ts`)

### Configuración del LLM
- **SDK:** Utiliza `@google/genai`.
- **Modelo:** Configurado como `gemini-2.5-flash`.
- **Autenticación:** Lee la API Key directamente de `process.env`.

### Prompt Engineering
- **Estrategia:** System Prompt + User Prompt concatenados.
- **System Prompt:** Define el rol de "Experto pedagogo peruano" y reglas estrictas del CNEB.
- **Structured Outputs:** Utiliza la funcionalidad `responseSchema` de Gemini para forzar una respuesta en JSON estricto válida según la interfaz `SessionData`. Esto elimina la necesidad de parsers complejos.

### Interfaz de Datos (`types.ts`)
El sistema está fuertemente tipado. El esquema JSON esperado incluye:
- `inicio`, `desarrollo`, `cierre` (con arrays de estrategias y materiales).
- `fichas`: Objeto anidado con `aula` y `casa`, cada una con título, instrucciones e ítems.