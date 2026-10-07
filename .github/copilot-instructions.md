## Modo de trabajo en equipo

- Cuando el mensaje del usuario incluya la palabra `equipo` como palabra independiente, sin
  distinguir mayúsculas de minúsculas, invoca primero como subagente a `prompt-senior` desde
  `.github/agents/prompt-senior.agent.md`. No llames a otro agente ni empieces a implementar antes
  de recibir su brief y plan de delegación. No actives el flujo si la palabra aparece solo dentro de
  código o si el usuario está hablando de cómo configurar este mismo disparador.
- El agente `prompt-senior` es el coordinador inicial: primero analiza la petición y el repositorio,
  produce un brief/prompt de implementación con objetivo, alcance, restricciones y criterios de
  aceptación; después continúa con la tarea, sin detenerse a pedir aprobación del brief.
- El coordinador debe seleccionar solo los agentes y skills necesarios. Delegaciones disponibles:
  `api-integrator` para cambios de API/datos; `react-reviewer` para revisión React/TypeScript;
  `docker-builder` para cambios de contenedores; `product-ux-reviewer` para revisión de producto,
  UX y UI; `architecture-reviewer` para arquitectura; y `security-reviewer` para seguridad y
  privacidad. Los agentes revisores entregan hallazgos y no modifican código por cuenta propia.
- Carga y sigue los skills pertinentes en `.github/skills/`: `data-fetching` para consultas,
  mutaciones y caché; `form-validation` para formularios; `docker-dev` para Docker. Si una tarea
  cruza áreas, combina únicamente los skills y agentes relevantes y asigna responsabilidades sin
  duplicar cambios.
- Tras integrar el trabajo, verifica los criterios de aceptación con las pruebas, lint o typecheck
  pertinentes disponibles en el proyecto. No ejecutes comandos Docker ni borres volúmenes si el
  usuario no pidió expresamente operaciones destructivas.
- Para toda tarea que modifique el proyecto, invoca a `product-ux-reviewer` después de implementar y
  antes de cerrar, incluso si el cambio es técnico o no parece visual. Pásale el requerimiento, el
  diff y los criterios de aceptación para que determine el impacto real en producto, UX y UI. Integra
  los hallazgos concretos que estén dentro del alcance y vuelve a validar; no amplíes el alcance por
  preferencias de diseño. Si no hay impacto visible, debe dejarlo explícito. Si no se pueden invocar
  subagentes, aplica sus criterios de revisión y comunica esa limitación.
- Si el entorno no permite invocar subagentes o cargar skills automáticamente, sigue el mismo orden
  dentro del agente activo y deja clara esa limitación; no afirmes que se delegó si no ocurrió.
- No crees archivos de prompt por defecto. Incluye el brief de implementación en la respuesta final;
  crea un archivo solo si el usuario lo solicita.

## Revisiones de arquitectura y seguridad

- Estas reglas aplican también a tareas sin el disparador `equipo`. Evalúa el impacto del cambio
  antes de decidir qué revisiones son necesarias; no invoques todos los agentes por defecto.
- Invoca `architecture-reviewer` de `.github/agents/architecture-reviewer.agent.md` cuando se
  solicite una revisión de arquitectura o el cambio afecte límites entre módulos, dependencias,
  contratos compartidos, estado global, rutas o configuración de build. Para decisiones
  estructurales, solicita revisión del diseño antes de implementar y del resultado antes de cerrar.
- Invoca `security-reviewer` de `.github/agents/security-reviewer.agent.md` cuando se solicite una
  revisión de seguridad o el cambio afecte autenticación, sesión, permisos, datos sensibles,
  almacenamiento, contenido no confiable o configuración de seguridad.
- Pasa a cada revisor el requerimiento, alcance, diseño o diff y criterios de aceptación. Integra
  hallazgos confirmados del cambio y verifica las correcciones; reporta problemas preexistentes
  fuera del alcance sin corregirlos automáticamente. No dupliques encargos con otros revisores.
- Si el entorno no permite invocar estos agentes, aplica sus criterios dentro del agente activo y
  comunica la limitación. No afirmes que una revisión de frontend certifica la seguridad del backend.

## Convenciones del proyecto

- Frontend React 18 + TypeScript, Vite y React Router; consulta el código y `package.json` antes de
  asumir versiones o añadir dependencias.
- Usa el cliente central de `src/api/client.ts`, hooks y claves de `src/api/queries/`; no hagas
  `fetch`/`ky` directo desde componentes ni inventes una API paralela.
- Los errores del cliente usan `ErrorApi`; los contratos compartidos están en `src/shared/` y los
  tipos OpenAPI generados en `src/api/schema.d.ts`.
- Formularios siguen `React Hook Form`, Zod y `resolverZod` de `src/lib/formulario.ts`. Reutiliza los
  esquemas compartidos cuando corresponda.
- Mantén las guardas de rutas y permisos por rol, respeta la zona horaria de la clínica y usa los
  tokens CSS reales (`--bg`, `--surface`, `--ink`, `--accent`, entre otros).
- No guardes información clínica en `localStorage` ni registres información sensible en la consola.
