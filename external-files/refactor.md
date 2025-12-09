# Refactor Plan — Aula Express - refactor.md
Fecha: 2025-12-08
Objetivo: corregir bugs actuales, separar pipelines (texto vs recursos),
robustecer prompts bajo Strategy + Registry y mejorar UX/performance.

---

## 1. Objetivos funcionales del nuevo flujo

### 1.1 Flujo A — TextSession pipeline
- Responsabilidad:
  - Generar JSON de sesión completo (sin bloquear UI por recursos pesados).
  - Incluir:
    - resources.organizer (base)
    - resources.images (metadatos + prompts)
  - En cada sección de materiales:
    - listar recursos parseables por prefijo:
      - IMG_GEN
      - DIAG_PROMPT
      - IMG_URL
      - VID_YT
- Output:
  - SessionData válido según esquema extendido.

### 1.2 Flujo B — Resource pipeline
- Responsabilidad:
  - Tomar SessionData y enriquecer recursos por sección.
  - Generar:
    - imágenes en paralelo controlado
    - diagramas adicionales
  - Validar links externos
  - Resolver títulos/IDs faltantes
- Output:
  - SessionData enriquecido sin romper el contenido textual.

---

## 2. Bugs y fixes críticos

### 2.1 Desalineación Schema ↔ Types (bug silencioso) [tu punto 5.2]
**Problema**
- types.ts exige:
  - Organizer.id
  - GeneratedImage.id
- SESSION_SCHEMA no los exige como required.
- Resultado:
  - organizer.id puede ser undefined
  - `diagram-${organizer.id}-...` rompe o genera ids inválidos
  - `findIndex` por id falla

**Solución**
A) Fortalecer schema:
- En `resources.organizer.required` añadir `"id"`.
- En `resources.images.items.required` añadir `"id"`.

B) Post-procesador adicional (defensa en profundidad):
- `validateSessionData(session)`
  - si falta organizer.id -> generar `org-${slug(sessionTitle)}`
  - si falta image.id -> generar `img-${moment.toLowerCase()}-${slug(title)}`

---

### 2.2 Riesgo “títulos no sincronizados” [tu punto 5.3]
**Problema**
- UI busca match estricto por title en `{{imagen:...}}`.
- Variaciones semánticas rompen el match.

**Solución**
1) Validator:
   - Extraer todos los `{{imagen:Title}}` del texto.
   - Comparar con `resources.images.title`.
   - Si hay mismatch:
     - Opción A: normalización suave (trim, lower, quitar artículos)
     - Opción B: re-ask de corrección al LLM con un prompt corto
2) UI fallback:
   - Si no hay match exacto:
     - intentar fuzzy match simple (Levenshtein pequeño)
     - mostrar placeholder "Generando imagen..." si existe IMG_GEN asociado.

---

### 2.3 Regeneración parcial devuelve wrapper inválido [tu punto 5.4]
**Problema**
- `regenerateSection` espera `{ "inicio": {...} }`
- Prompt actual no fuerza wrapper.

**Solución**
- Ajustar `PromptComposer.composeRegeneration`:
  - “Devuelve un JSON con la clave raíz exactamente igual a sectionKey”

- Schema parcial ya exige required rootKey → refuerzo perfecto.

---

### 2.4 ExportManager y LaTeX sin escape [tu punto 5.5]
**Problema**
- Caracteres especiales rompen compilación:
  `% _ & # $ { } ~ ^ \`

**Solución**
- Implementar:
  ```ts
  const LATEX_SPECIAL = /[\\%_&#${}~^]/g;
  function escapeLatex(s: string) { ... }
