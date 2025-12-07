# Prompt de Mejora UI/UX: Formulario Home.tsx

## Rol y Contexto
Eres un **Ingeniero Frontend Senior especializado en React, TypeScript y TailwindCSS**. Tu objetivo es mejorar la experiencia de usuario (UX) del componente `Home.tsx` de una aplicación de generación de sesiones de clase llamada "Aula Express".

## Problema a Resolver
Se identificó un **problema crítico de UX**: los selectores de "Nivel", "Grado" y "Área Curricular" tienen valores predeterminados válidos (ej: "Primaria", "1°", "Matemática"). Esto causa que los usuarios envíen solicitudes sin elegir conscientemente, generando resultados incoherentes cuando su prompt textual difiere del área preseleccionada.

### Ejemplo del Problema
- **Prompt del usuario**: "Genera una sesión sobre la Revolución Francesa"
- **Campos por defecto**: Área = "Matemática"
- **Resultado erróneo**: Sesión de Matemática ignorando la solicitud de Historia.

---

## Tareas a Realizar

### TAREA 1: Implementar Placeholders Obligatorios (Validación)
**Objetivo**: Forzar al usuario a seleccionar explícitamente Nivel, Grado y Área antes de generar.

**Pasos**:
1. Modificar `constants.ts` agregando un placeholder inválido al inicio de cada array:
   ```typescript
   export const NIVELES = ['Selecciona nivel...', 'Inicial', 'Primaria', 'Secundaria'];
   export const GRADOS_PRIMARIA = ['Selecciona grado...', '1°', '2°', '3°', '4°', '5°', '6°'];
   export const AREAS = ['Selecciona área...', 'Matemática', 'Comunicación', ...];
   ```

2. En `Home.tsx`, cambiar los estados iniciales para usar el placeholder:
   ```typescript
   const [nivel, setNivel] = useState(NIVELES[0]); // 'Selecciona nivel...'
   const [grado, setGrado] = useState(GRADOS_PRIMARIA[0]);
   const [area, setArea] = useState(AREAS[0]);
   ```

3. Crear una función de validación:
   ```typescript
   const isFormValid = () => {
     return (
       nivel !== NIVELES[0] &&
       grado !== GRADOS_PRIMARIA[0] &&
       area !== AREAS[0] &&
       prompt.trim().length > 0
     );
   };
   ```

4. Actualizar la condición `disabled` del botón "Generar Sesión":
   ```tsx
   disabled={loading || !isFormValid()}
   ```

5. Estilizar las opciones placeholder con color gris:
   ```tsx
   <option value={NIVELES[0]} disabled className="text-slate-400">
     {NIVELES[0]}
   </option>
   ```

---

### TAREA 2: Feedback Visual de Campos Incompletos
**Objetivo**: Indicar visualmente qué campos faltan por seleccionar.

**Implementación**:
1. Agregar estado para rastrear intentos de submit fallidos:
   ```typescript
   const [attemptedSubmit, setAttemptedSubmit] = useState(false);
   ```

2. Al hacer clic en "Generar Sesión" sin formulario válido:
   ```typescript
   const handleSubmit = async () => {
     if (!isFormValid()) {
       setAttemptedSubmit(true);
       return;
     }
     // ... resto del código
   };
   ```

3. Aplicar estilos condicionales a los selects inválidos:
   ```tsx
   className={`... ${
     attemptedSubmit && nivel === NIVELES[0]
       ? 'border-red-400 ring-2 ring-red-100 animate-shake'
       : ''
   }`}
   ```

4. Añadir animación CSS `shake` en el `<style>` del `index.html`:
   ```css
   @keyframes shake {
     0%, 100% { transform: translateX(0); }
     25% { transform: translateX(-4px); }
     75% { transform: translateX(4px); }
   }
   .animate-shake {
     animation: shake 0.3s ease-in-out;
   }
   ```

---

### TAREA 3: Mejoras de Micro-Animaciones
**Objetivo**: Añadir feedback visual premium para mejorar la percepción de calidad.

**Implementaciones**:

1. **Animación de entrada del formulario (fade-in + slide-up)**:
   ```tsx
   // En el contenedor principal del card
   <div className="bg-white rounded-2xl ... animate-fadeInUp">
   ```
   
   CSS:
   ```css
   @keyframes fadeInUp {
     from { opacity: 0; transform: translateY(20px); }
     to { opacity: 1; transform: translateY(0); }
   }
   .animate-fadeInUp {
     animation: fadeInUp 0.5s ease-out forwards;
   }
   ```

2. **Transición suave en el botón al habilitar/deshabilitar**:
   ```tsx
   className="... transition-all duration-300 ease-out"
   ```

3. **Efecto hover sutil en los selects**:
   ```tsx
   className="... hover:border-primary/50 transition-colors duration-200"
   ```

4. **Indicador de "campos restantes"** (opcional pero recomendado):
   ```tsx
   const remainingFields = [
     nivel === NIVELES[0] && 'Nivel',
     grado === GRADOS_PRIMARIA[0] && 'Grado',
     area === AREAS[0] && 'Área',
     !prompt.trim() && 'Descripción'
   ].filter(Boolean);

   // Mostrar debajo del botón cuando hay campos faltantes:
   {remainingFields.length > 0 && attemptedSubmit && (
     <p className="text-xs text-red-500 text-center mt-2 animate-fadeIn">
       Completa: {remainingFields.join(', ')}
     </p>
   )}
   ```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `constants.ts` | Agregar placeholders a `NIVELES`, `GRADOS_PRIMARIA`, `AREAS` |
| `components/Home.tsx` | Actualizar estados iniciales, validación, estilos condicionales, animaciones |
| `index.html` | Agregar keyframes CSS para animaciones (`shake`, `fadeInUp`, `fadeIn`) |

---

## Criterios de Éxito
- [ ] El botón "Generar Sesión" está deshabilitado hasta que TODOS los campos estén completos.
- [ ] Los selectores muestran "Selecciona..." por defecto con estilo gris.
- [ ] Al intentar enviar con campos vacíos, estos se resaltan en rojo con animación.
- [ ] El formulario tiene animación de entrada suave.
- [ ] Los elementos interactivos tienen transiciones hover/focus.

---

## Estilo de Código
- Usa nombres de variables descriptivos en español (es contexto educativo peruano).
- Mantén consistencia con el patrón de diseño existente (TailwindCSS classes inline).
- No añadas dependencias externas; usa solo CSS/Tailwind para animaciones.
- Preserva la funcionalidad existente de Speech Recognition y localStorage.

---

## Output Esperado
Proporciona el código completo modificado de cada archivo, listo para copiar y pegar. Incluye comentarios `// MODIFICACIÓN:` para señalar cada cambio realizado respecto al original.
