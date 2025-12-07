# Aula Express

## 1. Contexto y Problema
### Hallazgos clave del sondeo
- **El mayor ladrón de tiempo:** Planificar sesiones paso a paso (~48%).
- **Prioridad absoluta:** Uso en aula desde celular (app ligera y rápida).
- **Mayoría de usuarios potenciales:** Secundaria.

### Implicación de diseño
- No diseñar primero “una suite docente completa”.
- Diseñar un **generador ultra rápido, móvil-first, con salidas listas**.

## 2. Objetivo del Producto
Crear una app que:
1. Reciba una petición en lenguaje natural o por formulario.
2. Genere una sesión de aprendizaje estructurada con:
    - **Inicio:** Motivación, Saberes previos, Conflicto cognitivo, Propósito didáctico.
    - **Desarrollo**
    - **Cierre**
    - **Tarea/Extensión**
    - **Materiales**
3. Incluya recursos didácticos concretos (juegos, fichas, dinámicas).
4. Exporte los documentos correctos.

## 3. Personas y Casos de Uso
### 3.1 Persona 1: Docente de Secundaria
- Necesita sesiones rápidas para clase real.

### 3.2 Persona 2: Docente de Primaria
- Pedidos más lúdicos y guiados.

### 3.3 Persona 3: Docente de Inicial
- Mejores sesiones guiadas, creativas y con recursos didácticos.

## 7. Biblioteca de Prompts
*(Módulo interno sugerido)*
- `/prompts/prompt_maestro_es.json`
- `/prompts/prompt_secundaria.json`
- `/prompts/prompt_primaria.json`
- `/prompts/prompt_inicial.json`
- `/prompts/prompt_fichas.json`

**Motivo:** Evitas reescribir lógica en el UI. La app solo compone el prompt.

## 8. Configuración de Formatos
### 8.1 “Format Packs”
Sistema de plantillas versionadas:
- `latex_session_v1.tex`
- `html_view_v1`
- `json_schema_v1`

La app debe permitir seleccionar “estilo de formato” (por ejemplo: “MINEDU clásico”, “compacto”, “rural simplificado”).

### 8.2 Mapeo UI ↔ LaTeX
Cada placeholder de UI corresponde a un campo JSON.
- `[Estrategias de Motivación]` ← `inicio.motivacion[]`
- `[Lista de Materiales]` ← `inicio.materiales[]` + `desarrollo.materiales[]`

## 9. Arquitectura
### 9.1 Versión Demo / Entorno Restringido (Solo Frontend)
Ideal para mostrar rápido. Encaja con un entorno tipo sandbox SPA.

- **Stack:** React + Vite + Tailwind
- **Estado:** Local (Persistencia localStorage)
- **Exportación:**
- **Limitaciones asumidas:**
    - Sin backend propio
    - Sin base de datos real
    - Concurrencia limitada

**Estrategias obligatorias:**
- Exponential backoff en llamadas a LLM.
- “Modo offline parcial”: cache de plantilla y UI sesiones recientes en local.

## 10. Flujos Principales
### 10.1 Flujo “Aula Express”
1. Docente abre app.
2. Selecciona: Nivel, grado, área.
3. Escribe tema: “La decena”.
4. Clic en “Generar”.
5. Recibe: Vista lista y Exportables.

**Meta de producto:** Tiempo total real: 90–120 segundos.

### 10.2 Flujo “Solicitud tipo docente”
**Entrada:** “Sesión para 1° sobre la decena… juegos… ejercicios… ficha aula y ficha casa…”

**Salida esperada:**
- Motivación con 2–3 juegos
- Desarrollo con juego + ejercicio escrito
- Cierre con metacognición
- Ficha de evaluación en aula
- Ficha de extensión en casa

## 11. Interfaces
### 11.1 Home Móvil
- Botón grande: “Generar sesión”
- Últimas 3 sesiones
- Modo rápido/Guiado

### 11.2 Editor Ligero (Post-generación)
- Permite editar texto por bloque.
- Re-generar solo un apartado: “Regenerar Motivación”, “Regenerar Fichas”.
- *Esto ahorra costo y tiempo.*
