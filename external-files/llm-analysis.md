# Análisis Completo: Lógica de Consulta al LLM

## Resumen Ejecutivo
La aplicación utiliza el SDK oficial de Google Generative AI (`@google/genai`) para comunicarse con el modelo Gemini. La arquitectura está bien modularizada con separación de responsabilidades clara.

---

## 1. Arquitectura de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI (Home.tsx)                           │
│                    Usuario ingresa: nivel, grado, área, prompt  │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SessionGenerator.generate()                    │
│                         core/SessionGenerator.ts                 │
└───────────┬─────────────────────────────────────────┬───────────┘
            │                                         │
            ▼                                         ▼
┌───────────────────────┐                ┌────────────────────────┐
│   PromptComposer      │                │    SESSION_SCHEMA      │
│ core/PromptComposer.ts│                │ schemas/sessionSchema.ts
└───────────────────────┘                └────────────────────────┘
            │                                         │
            └─────────────────┬───────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Gemini API Call                            │
│                    ai.models.generateContent()                   │
│              responseMimeType: "application/json"                │
│              responseSchema: SESSION_SCHEMA                      │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       JSON Response                              │
│                    Parseado a SessionData                        │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UI (SessionResult.tsx)                        │
│                   Renderiza la sesión generada                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Archivos Involucrados

| Archivo | Responsabilidad |
|---------|-----------------|
| `services/geminiService.ts` | Inicializa el cliente de Google GenAI |
| `core/SessionGenerator.ts` | Orquesta la generación de sesiones |
| `core/PromptComposer.ts` | Construye el prompt dinámicamente |
| `core/RetryPolicy.ts` | Maneja reintentos con exponential backoff |
| `schemas/sessionSchema.ts` | Define el schema JSON para Structured Output |
| `prompts/index.ts` | Almacena los textos de prompts por nivel |
| `types.ts` | Define las interfaces TypeScript |

---

## 3. Estructura del Prompt

El prompt se construye dinámicamente en `PromptComposer.compose()`:

### Prompt Final Generado (Ejemplo para Primaria):
```
Eres un experto pedagogo peruano especializado en el Currículo Nacional (CNEB).
Tu tarea es crear una Sesión de Aprendizaje completa y detallada.
Usa un lenguaje pedagógico claro, empático y directo, adecuado para docentes de escuela pública.

Enfoque de Nivel (Primaria): Enfócate en la construcción del conocimiento mediante material concreto y situaciones vivenciales.
Materiales sugeridos: Material estructurado y no estructurado del entorno.
Tono sugerido: Motivador, reflexivo y participativo.

Genera dos fichas de aplicación distintas: una para desarrollar en el aula (trabajo grupal o individual guiado) y otra para casa (refuerzo o extensión). Deben ser claras y listas para imprimir.

CONTEXTO ESPECÍFICO:
Nivel: Primaria
Grado: 1°
Área: Matemática
PEDIDO DEL DOCENTE: "Sesión sobre la decena con juegos para niños"
```

### Composición Modular:
1. **Base (maestro):** Rol, tarea y estilo del pedagogo
2. **Por Nivel:** Enfoque, materiales y tono según Inicial/Primaria/Secundaria
3. **Fichas:** Instrucción para generar fichas de aula y casa
4. **Contexto:** Datos específicos del usuario (nivel, grado, área, pedido)

---

## 4. Schema de Respuesta (Structured Output)

El schema está definido en `schemas/sessionSchema.ts` usando los tipos del SDK de Google:

```typescript
SESSION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sessionTitle: { type: Type.STRING },
    area: { type: Type.STRING },
    cycleGrade: { type: Type.STRING },
    teacherName: { type: Type.STRING },
    inicio: {
      type: Type.OBJECT,
      properties: {
        motivacion: { type: Type.ARRAY, items: { type: Type.STRING } },
        saberesPrevios: { type: Type.ARRAY, items: { type: Type.STRING } },
        conflictoCognitivo: { type: Type.ARRAY, items: { type: Type.STRING } },
        propositoDidactico: { type: Type.ARRAY, items: { type: Type.STRING } },
        materiales: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    desarrollo: { estrategias: [...], materiales: [...] },
    cierre: { estrategias: [...], materiales: [...] },
    tareaCasa: { actividades: [...], materiales: [...] },
    fichas: {
      aula: { titulo, instrucciones, items },
      casa: { titulo, instrucciones, items }
    }
  },
  required: ["sessionTitle", "area", "cycleGrade", "teacherName", "inicio", "desarrollo", "cierre", "tareaCasa", "fichas"]
}
```

---

## 5. Llamada a la API

En `SessionGenerator.generate()`:

```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
  config: {
    responseMimeType: "application/json",
    responseSchema: SESSION_SCHEMA,
  },
});
```

### Características:
- **Modelo:** `gemini-2.5-flash`
- **Modo:** Structured Output (JSON garantizado)
- **Retry Policy:** 3 intentos con exponential backoff + jitter

---

## 6. Parseo de la Respuesta

```typescript
const jsonText = response.text;
if (!jsonText) throw new Error("Empty response from Gemini");
return JSON.parse(jsonText) as SessionData;
```

El JSON se parsea directamente y se castea al tipo `SessionData`. **No hay validación adicional** porque el schema de Gemini garantiza la estructura.

---

## 7. Renderizado en la UI

El componente `SessionResult.tsx` recibe `SessionData` y renderiza:

1. **Header:** Título, área, grado
2. **Inicio:** Motivación, Saberes Previos (editable)
3. **Desarrollo:** Estrategias (editable)
4. **Cierre:** Estrategias (editable)
5. **Fichas:** Aula y Casa (con ítems numerados)

Cada sección usa el componente `EditableList` que permite edición inline.

---

## 8. Regeneración de Secciones

La función `regenerateSection()` permite regenerar una sección específica:

```typescript
const prompt = `
  Eres el mismo experto pedagogo. Necesito que RE-ESCRIBAS solamente la sección: "inicio".
  
  Contenido actual (para referencia):
  ${JSON.stringify(currentContent)}
  
  Nuevas instrucciones para el cambio:
  "Cambia la motivación por algo más participativo."
  
  Mantén el mismo formato JSON estricto para esta sección.
`;
```

Usa un **schema parcial** para validar solo la sección regenerada.

---

## 9. Evaluación: ¿Está Bien Programado?

### ✅ Lo que está BIEN:

| Aspecto | Evaluación |
|---------|------------|
| **Arquitectura** | Excelente separación de responsabilidades (SRP) |
| **Structured Output** | Uso moderno y correcto del SDK de Gemini |
| **Retry Policy** | Exponential backoff con jitter (best practice) |
| **Modularidad de Prompts** | Fácil de mantener y extender por nivel |
| **Type Safety** | Tipado fuerte con TypeScript |
| **Edición Post-Gen** | Permite editar sin regenerar todo |

### ⚠️ Lo que PODRÍA MEJORAR:

| Aspecto | Problema | Sugerencia |
|---------|----------|------------|
| **Validación** | No hay validación de respuesta post-parsing | Añadir Zod o similar |
| **Error Handling** | Errores genéricos en UI (`alert()`) | Implementar toast notifications |
| **Logging** | Solo `console.warn` en reintentos | Añadir logging estructurado |
| **Prompt en `structure`** | El campo `maestro.structure` no se usa | Incluirlo en el prompt compuesto |
| **Prompt en `constraints`** | El array `maestro.constraints` no se usa | Incluirlos en el prompt |

### ❌ Problemas Potenciales:

| Problema | Descripción |
|----------|-------------|
| **Modelo** | `gemini-2.5-flash` puede no ser público; verificar disponibilidad |
| **API Key en Cliente** | La key está en `process.env` pero se inyecta en el bundle (ver vite.config) |
| **FormatPack Legacy** | Tipos `FormatPackId` y `FormatPack` aún existen pero no deberían |

---

## 10. Flujo Completo (Diagrama de Secuencia)

```
Usuario          Home.tsx           SessionGenerator      PromptComposer       Gemini API
   │                 │                     │                    │                  │
   │─────[Submit]───>│                     │                    │                  │
   │                 │───[generate()]─────>│                    │                  │
   │                 │                     │───[compose()]─────>│                  │
   │                 │                     │<──[fullPrompt]─────│                  │
   │                 │                     │                    │                  │
   │                 │                     │───[generateContent()]───────────────>│
   │                 │                     │<──[JSON response]────────────────────│
   │                 │                     │                    │                  │
   │                 │                     │───[JSON.parse()]                      │
   │                 │<──[SessionData]─────│                    │                  │
   │                 │                     │                    │                  │
   │<─[Navigate to                         │                    │                  │
   │   SessionResult]│                     │                    │                  │
```

---

## 11. Conclusión

**Calificación General: 8/10**

El código está **bien estructurado y sigue buenas prácticas** para un MVP o prototipo de hackathon. La arquitectura es limpia, el uso de Structured Output es moderno y correcto, y la modularidad permite fácil extensión.

**Prioridades para mejorar:**
1. Eliminar código muerto de `FormatPack`
2. Incluir `maestro.structure` y `maestro.constraints` en el prompt
3. Añadir validación de respuesta con Zod
4. Mejorar error handling con feedback visual
