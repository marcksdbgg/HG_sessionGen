# Plan de Refactorización – Aula Express (Recursos, búsqueda vs generación, nueva UI)

## Objetivo
Evolucionar Aula Express para que siempre entregue materiales/recursos virtuales útiles por momento, con una distinción clara entre:
- Recursos reales y específicos (deben ser sugeridos como fuentes externas confiables y luego resueltos por la UI).
- Recursos creativos o inventados (pueden ser generados por IA bajo reglas por nivel).

Incorporar una experiencia UI moderna donde:
- La vista principal muestre la sesión (Inicio/Desarrollo/Cierre/Tarea).
- Los recursos (incluyendo fichas) vivan en una ventana/pantalla dedicada de presentación.
- Las citas sean responsabilidad de la UI, no del LLM.

---

## 1. Problemas actuales que bloquean el objetivo
1) El schema define materiales como string[].
   - No permite tipificar imagen/video/organizador.
   - No permite marcar si el recurso es “externo” o “generado”.
2) No existe un motor de resolución de recursos.
   - El LLM no puede “buscar” fuentes reales.
3) PromptComposer no incluye maestro.structure ni maestro.constraints.
4) El UI mezcla sesión y fichas en la misma vista y no existe vista de recursos.
5) Inconsistencias de tipado/props en UI (SessionResultProps vs uso en App).
6) Riesgo de seguridad: API key expuesta en cliente.

---

## 2. Nuevo modelo de datos recomendado

### 2.1 Nuevo tipo Resource
Crear un tipo fuerte, por ejemplo:
- id
- title
- kind: "image" | "video" | "organizer" | "reading" | "worksheet" | "other"
- moment: "inicio" | "desarrollo" | "cierre" | "tarea" | "general"
- intent: "project" | "print" | "copy-to-notebook" | "demo" | "homework"
- source:
  - mode: "external" | "generated"
  - providerHint: texto de institución/colección sugerida
  - queryHint: texto de búsqueda sugerida por el LLM
  - generationHint: prompt breve solo cuando corresponda
- notes: uso pedagógico sugerido

### 2.2 Nuevo SessionSchema
Agregar una propiedad top-level:
- recursos: Resource[]

Mantener materiales por momento durante una transición corta, pero marcar como deprecado en el UI.
Objetivo final:
- Usar recursos[] como fuente de verdad para la nueva ventana.

### 2.3 Reglas por nivel en schema/validación
- Inicial y Primaria:
  - propositoDidactico debe aceptar 1 item.
- Secundaria:
  - permitir 1–2 items.

---

## 3. Prompting y composición

### 3.1 Nuevo módulo de prompts
Agregar y usar:
- prompt_recursos.json

### 3.2 PromptComposer
Actualizar compose() para incluir:
- Prompts.maestro.structure
- Prompts.maestro.constraints (serializadas en texto)
- Prompts.recursos.instruction

Esto asegura que las reglas globales de “cuándo generar vs cuándo referenciar externo” estén realmente activas.

### 3.3 Estrategia de salida del LLM
El LLM debe:
- Completar recursos[] con descripciones estructuradas.
- No escribir URLs ni citas.
- Para recursos externos, incluir providerHint y queryHint.
- Para recursos generados (solo en contextos creativos), incluir generationHint.

---

## 4. Motor de resolución de recursos (UI/Service)

### 4.1 ResourceResolver
Crear un módulo que:
- Reciba recursos[] del LLM.
- Si source.mode = "external":
  - Use un servicio de búsqueda predefinido (interno o API de búsqueda educativa).
  - Resuelva a un objeto enriquecido con:
    - url
    - thumbnail
    - attribution
    - license si está disponible
- Si source.mode = "generated":
  - Construya un prompt final para imagen/video según reglas del nivel.
  - En la demo frontend-only, simular con placeholders hasta integrar un backend.

### 4.2 Política de confianza de fuentes
Whitelist sugerida por tipo:
- Arte y Cultura: museos, fundaciones, catálogos oficiales.
- Historia/Ciencias: repositorios educativos, enciclopedias institucionales, portales académicos.
- Matemática/Comunicación: recursos ministeriales y editoriales educativas reconocidas.

La UI debe mostrar siempre atribución final.

---

## 5. Nueva experiencia UI/UX

### 5.1 Navegación
Cambiar ViewState en App:
- "home"
- "result"
- "resources"

Al generar sesión:
- Mostrar "result"
- Botón destacado: “Ver recursos para proyectar”

### 5.2 SessionResult (vista principal)
Mostrar solo:
- Header
- Inicio/Desarrollo/Cierre/Tarea

Ocultar fichas en esta vista.
Agregar un bloque “Resumen de materiales” minimalista que liste títulos de recursos y un CTA hacia la vista de recursos.

### 5.3 ResourcesPresenter (nueva pantalla)
Diseñar una pantalla tipo “modo presentación”:
- Filtros por momento y tipo de recurso.
- Cards grandes con:
  - imagen/miniatura
  - título
  - propósito de uso
  - botones:
    - “Abrir en pantalla completa”
    - “Imprimir”
    - “Copiar consigna”

Aquí se muestran:
- organizadores visuales
- imágenes
- videos
- lecturas
- fichas aula y casa

### 5.4 Fullscreen Resource Viewer
Una sub-vista modal o route que:
- Reproduce video o muestra imagen/organizador.
- Incluye atribución visible y link externo.
- Soporta modo proyector.

---

## 6. Exportación

### 6.1 LaTeX
Tu plantilla tabular MINEDU es compatible con el enfoque por momentos/estrategias/materiales.
Recomendación:
- Mantener placeholders actuales.
- En la fase 1, mapear materiales tradicionales como texto breve.
- En la fase 2, generar una lista resumida de recursos por momento desde recursos[].

---

## 7. Validación y robustez

### 7.1 Zod
Agregar validación post-parsing para:
- SessionData
- Resource[]

### 7.2 Regeneración parcial
Permitir regenerar:
- solo estrategias
- solo recursos
- solo fichas

Con schemas parciales dedicados.

---

## 8. Seguridad

### 8.1 API key
Eliminar la key del bundle cliente.
Introducir:
- Un backend mínimo (edge function o serverless)
- Proxy seguro para llamadas a Gemini.

---

## 9. Limpieza técnica

1) Depurar FormatPack legacy si no se usa.
2) Corregir props incongruentes:
   - SessionResultProps vs App usage.
3) Unificar fuente única de prompts:
   - Mantener index.ts como canonical
   - O migrar a JSON importando con resolveJsonModule activado.

---

## 10. Roadmap sugerido por fases

### Fase 1 (rápida, mínimo cambio)
- Mejorar prompts para forzar materiales.
- Integrar estructura/constraints/recursos en PromptComposer.
- UI: botón “Ver recursos” con vista simple que liste materiales actuales.

### Fase 2 (núcleo funcional)
- Añadir recursos[] al schema y types.
- Implementar ResourcesPresenter.
- Mover fichas a la vista de recursos.

### Fase 3 (búsqueda vs generación real)
- Implementar ResourceResolver con búsqueda real.
- Añadir generación de imágenes solo para casos creativos.

### Fase 4 (pulido)
- Mejoras de accesibilidad, offline cache de recursos, analytics de uso docente.

---

## Resultado esperado
- Sesiones que ya no “mencionan imágenes sin mostrarlas”.
- Recursos listos para proyectar con atribución clara.
- Separación elegante entre planificación (sesión) y ejecución en aula (recursos).
- Cumplimiento estricto de reglas por nivel y propósito didáctico.
