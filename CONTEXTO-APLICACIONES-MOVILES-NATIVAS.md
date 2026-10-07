# Contexto y guía para aplicaciones móviles nativas de MediCita

## Propósito y estado de las decisiones

Este documento reúne evidencia del frontend web para orientar el descubrimiento, diseño y construcción de aplicaciones móviles **nativas**, sin asumir que los flujos web deban copiarse literalmente ni que el backend ya ofrezca todas las capacidades necesarias.

**Estado:** iOS y Android son plataformas candidatas, no una decisión confirmada. Kotlin con Jetpack Compose para Android y Swift con SwiftUI para iOS son opciones recomendables para evaluar, no elecciones aprobadas. No se propone React Native, Flutter ni WebView.

Se usan estas etiquetas para no mezclar evidencia y propuesta:

- **Hecho del frontend:** comportamiento, ruta, tipo o llamada visible en este repositorio. No demuestra por sí solo el comportamiento del servicio desplegado.
- **Recomendación:** orientación para el futuro producto nativo; debe validarse con producto, diseño, ingeniería y responsables de la API.
- **Pendiente:** decisión que requiere confirmación. No tratarla como requisito ni resolverla suponiendo un MVP.

## Instrucciones para el equipo de producto, UX/UI e ingeniería nativa

Antes de diseñar o estimar una capacidad:

1. Confirmen plataformas, público, roles y escenarios prioritarios con producto. La matriz de este documento describe la web actual, no el alcance aprobado para móvil.
2. Dibujen los recorridos completos —incluidos permisos denegados, sesión vencida, datos vacíos, conflictos y recuperación— y validen su prioridad con Product Manager y usuarios representativos.
3. Diseñen interacción, navegación y componentes según las convenciones nativas de cada plataforma. Mantengan términos, reglas de negocio y contratos coherentes con MediCita; no conviertan las pantallas web en una especificación visual móvil.
4. Revisen accesibilidad, privacidad clínica, protección de credenciales, telemetría y amenazas antes de aprobar prototipos y persistencia local.
5. Para cada operación, contrasten la ruta, método, esquema de entrada **y respuesta** con el contrato/backend vigente. Este frontend declara que algunas respuestas están tipadas a mano; los tipos compartidos no certifican que un endpoint esté desplegado o habilitado.
6. Registren las decisiones abiertas de este documento con responsable y evidencia antes de convertirlas en requisitos. No den por requeridos modo sin conexión, notificaciones push, biometría ni una selección de roles.

## Contexto comprobado del frontend

- El repositorio implementa una SPA web responsiva en español; **no contiene una aplicación móvil nativa**.
- La web se organiza en acceso, agenda, pacientes, enfermería, consulta, portal e indicadores/administración. Las rutas, guardas y destinos por rol están en [`src/app/router.tsx`](./src/app/router.tsx) y [`src/auth/rutas.ts`](./src/auth/rutas.ts).
- El cliente central [`src/api/client.ts`](./src/api/client.ts) usa `VITE_API_URL` (por defecto `/api/v1`), credenciales incluidas, access token en memoria y normalización de errores. Las operaciones por dominio están en [`src/api/queries/`](./src/api/queries/).
- Los esquemas Zod de [`src/shared/`](./src/shared/) son una copia sincronizada desde el repositorio backend. [`src/api/tipos.ts`](./src/api/tipos.ts) contiene formas de respuesta escritas manualmente. La actualización de soporte móvil añade contratos de salida para autenticación, pacientes e indicaciones y documenta respuestas y errores de esos dominios en OpenAPI; no implica que todos los endpoints tengan contratos completos. `src/api/schema.d.ts` se genera y no debe tratarse como prueba de comportamiento del servicio desplegado.
- El README documenta pruebas web con Vitest/MSW y Playwright; no hay en este repositorio pruebas ni cliente nativo.

Referencias de contexto: [`README.md`](./README.md), [`ARQUITECTURA.md`](./ARQUITECTURA.md), [`FLUJOS-Y-FUNCIONALIDADES-PENDIENTES.md`](./FLUJOS-Y-FUNCIONALIDADES-PENDIENTES.md).

### Actualización de contratos por soporte móvil

Se sincronizaron los esquemas del backend local y se regeneró OpenAPI con la API disponible.
Ahora se documentan `GET /api/v1/pacientes/yo`, su respuesta `PacienteSalida` y el campo opcional
`dispositivoToken` en logout, además de respuestas y errores de autenticación y pacientes.
La web no consume todavía el nuevo GET de datos propios ni envía el token de dispositivo.
`PacienteSalida` incluye documento, fecha de nacimiento, alergias, antecedentes, seguro y
consentimiento además de contacto. Tratar la respuesta como información sensible y validar
con producto y backend la minimización de campos para cada flujo; no asumir que deben mostrarse
o persistirse todos en móvil.
La fuente backend tenía cambios sin commit: validar integración, despliegue y comportamiento
antes de asumir disponibilidad en los ambientes de la app nativa. Ver
[`CAMBIOS-BACKEND-SOPORTE-MOVIL.md`](./CAMBIOS-BACKEND-SOPORTE-MOVIL.md).

## Matriz de roles y flujos observados

La última columna es intencional: la existencia de un flujo web no decide si debe formar parte de una app móvil ni para qué plataforma/rol.

| Rol o acceso | Flujos web observados | Rutas de referencia | Datos/acciones de dominio observados | Inclusión móvil |
| --- | --- | --- | --- | --- |
| Recepción (`RECEPCION`) | Consulta agenda diaria, busca/selecciona pacientes, crea y reprograma citas, registra llegada y accede a pacientes. | `/agenda`, `/pacientes`, `/pacientes/nuevo`, `/pacientes/:id` | Citas, disponibilidad médica, datos de pacientes y estados de cita. | **Pendiente:** confirmar si requiere móvil, tareas y condiciones operativas. |
| Enfermería (`ENFERMERA`) | Consulta sala de espera, toma signos vitales por cita y revisa/completa tareas asignadas. | `/enfermeria`, `/enfermeria/triaje/:citaId` | Cola, cita, signos vitales, alertas y tareas. | **Pendiente:** confirmar dispositivo, contexto de uso y acciones autorizadas. |
| Médico (`MEDICO`) | Consulta pacientes/citas, revisa signos e historial, inicia atención, edita/autoguarda nota, cierra consulta y delega tarea. | `/consultorio`, `/consultorio/:citaId` | Historial clínico, nota, diagnóstico, tratamiento, indicaciones y tareas. | **Pendiente:** confirmar alcance clínico móvil y si se permite consultar o editar datos sensibles en ese contexto. |
| Paciente (`PACIENTE`) | Consulta citas próximas/pasadas e indicaciones, solicita y cancela/reprograma según la acción disponible. | `/mis-citas`, `/mis-citas/nueva`, `/mis-indicaciones` | Citas propias, disponibilidad, indicaciones y datos propios. | **Pendiente:** confirmar si este canal será aplicación móvil y qué acciones soporta. |
| Administración (`ADMIN`) | Consulta indicadores, gestiona personal/horarios/ausencias, asignaciones, consultorios y especialidades (incluida la duración de citas), y bitácora. | `/admin/panel`, `/admin/personal`, `/admin/asignaciones`, `/admin/consultorios`, `/admin/bitacora` | Datos administrativos, agenda y registros de auditoría. | **Pendiente:** confirmar necesidad móvil y límites de exposición de datos. |
| Sin sesión / enlace público | Login, solicitud/restablecimiento de contraseña y confirmación de cita por token. | `/login`, `/olvide-contrasena`, `/restablecer/:token`, `/c/:token` | Autenticación, recuperación y acciones de confirmación permitidas por el enlace. | **Pendiente:** decidir si estos recorridos vivirán en app, web móvil o ambos; no asumir equivalencia. |

**Hecho del frontend:** las rutas privadas aplican guardas por rol y el menú se adapta al rol. Esto mejora la navegación web, pero no constituye autorización de seguridad. **Recomendación:** la app debe ocultar acciones no disponibles para evitar confusión, y el servidor debe seguir siendo la autoridad de autenticación y permisos para cada operación.

## Navegación, UX y UI nativas

### Recomendaciones

- Definir arquitectura de información por plataforma solo después de validar tareas frecuentes y roles. Usar patrones propios del sistema (por ejemplo, navegación, barras, hojas/diálogos, selectores de fecha/hora y confirmaciones nativos), con retorno predecible y conservación segura del contexto al volver de una tarea.
- Priorizar una tarea principal por pantalla, jerarquía visual clara y acciones sensibles o irreversibles con contexto y confirmación adecuada. Para acciones clínicas, mostrar identidad de paciente/cita y diferenciar claramente borrador, guardado y cierre.
- Adaptar tablas densas y la cuadrícula de agenda web a patrones legibles en pantalla pequeña —p. ej., listas agrupadas, filtros explícitos y detalle contextual— sin perder información, capacidad de búsqueda ni claridad del conflicto horario. No traducir cada tabla o sidebar a una vista desplazable sin rediseño.
- Mantener el idioma español del producto y el lenguaje reconocible para los usuarios. Verificar formatos localizados y legibilidad de estados, unidades y fechas.
- Diferenciar siempre carga, éxito vacío, error y dato no disponible. Ofrecer reintento cuando sea seguro; ante resultado ambiguo de una mutación, reconciliar con el servidor antes de repetirla para evitar duplicados.
- Usar controles nativos cuando mejoren entrada y accesibilidad, conservando validación equivalente a los esquemas vigentes y errores junto al campo. No confiar en validación del cliente para permisos o reglas de negocio.
- Validar diseños con pacientes y personal clínico representativos; la navegación óptima puede variar por rol y dispositivo y todavía no está decidida.

### Accesibilidad a verificar

- Semántica y orden de lectura correctos; compatibilidad con VoiceOver y TalkBack, nombres accesibles, foco/retorno de foco y anuncios de carga, error, éxito y cambios de estado.
- Texto ampliable (Dynamic Type / escala del sistema), contraste suficiente, estados no comunicados solo mediante color, controles táctiles cómodos y alternativas accesibles a gestos.
- Formularios utilizables con teclado/lector de pantalla, mensajes de validación comprensibles y asociación clara entre campo y error.
- Pruebas de orientación/tamaño de pantalla y ajustes de accesibilidad del sistema. Las referencias web a objetivos de 44 px, regiones `aria-live` o scroll a 400 px son evidencia de la web, no una especificación nativa suficiente.

## Modelo de dominio y contratos observables

Las siguientes rutas son paths relativos al prefijo configurado por el cliente web. **“Invocado por el frontend” significa que el código de esta web hace esa llamada; no certifica la implementación, permisos, disponibilidad ni respuesta del backend.** Antes de construir, verificar en backend/OpenAPI y mediante pruebas de integración el método, autenticación, roles, request, response, errores, paginación, idempotencia y versionado.

| Dominio | Llamadas observadas en el frontend | Tipos compartidos o respuestas utilizadas | Precaución para el cliente nativo |
| --- | --- | --- | --- |
| Sesión | `POST auth/login`, `GET auth/yo`, `POST auth/refresh`, `POST auth/logout`, `POST auth/olvide-contrasena`, `POST auth/restablecer-contrasena` | `LoginEntrada`, `RefreshEntrada`, `Sesion`, `RespuestaLogin` | El cliente web envía refresh con cookie `httpOnly`; la copia compartida de `auth.ts` define `refreshToken` opcional y comenta un cuerpo para móvil. **No asumir** que el backend desplegado acepta, rota o revoca tokens móviles hasta verificarlo con su contrato e implementación. |
| Agenda/citas | `GET citas`, `GET citas/{id}`, `GET disponibilidad`, `POST citas`, `PATCH citas/{id}/reprogramar`, `POST citas/{id}/confirmar`, `/llegada`, `/no-asistio`, `/iniciar`, `/cancelar` | `AgendaConsulta`, `DisponibilidadConsulta`, `CrearCitaEntrada`, `ReprogramarCitaEntrada`, `CancelarCitaEntrada`; tipos `Cita`, `CitaDetalle`, `Agenda`, `Disponibilidad` | Respetar conflictos de concurrencia. El frontend contempla `409 HORARIO_OCUPADO`; refrescar disponibilidad y solicitar selección nueva, no forzar el hueco antiguo. Verificar transiciones válidas con backend. |
| Portal paciente | `GET pacientes/yo/citas`, `GET pacientes/yo/indicaciones`; usa también operaciones de citas/disponibilidad | `MisCitas`, `Indicacion`, `CrearCitaEntrada` | Confirmar reglas de identidad y alcance del paciente autenticado; no aceptar un `pacienteId` arbitrario para actuar por otra persona. |
| Confirmación pública | `GET confirmaciones/{token}`, `POST confirmaciones/{token}` | `ConfirmacionAccionEntrada`, `ConfirmacionPublica`, `ResultadoConfirmacion` | El token funciona como credencial de enlace en la web. Confirmar expiración, datos mínimos expuestos, limitación de intentos y acciones admitidas antes de replicar el flujo. |
| Pacientes e historial | `GET pacientes`, `GET pacientes/{id}`, `GET pacientes/{id}/historial`, `POST pacientes`, `PATCH pacientes/{id}` | `CrearPacienteEntrada`, `ActualizarPacienteEntrada`, `Paciente`, `Historial`, `SignosVitales`, `NotaConsulta` | Contiene datos personales y clínicos. Validar permiso por operación/campo y limitar exposición, telemetría y retención. El alta requiere consentimiento de tratamiento según el esquema compartido. |
| Enfermería | `GET enfermeria/cola`, `GET enfermeria/tareas`, `POST citas/{id}/signos-vitales`, `POST tareas/{id}/completar` | `SignosVitalesEntrada`, `EstadoTarea`, `Cola`, `Tarea` | Validar rangos, unidades, pareja de valores de presión y respuesta clínica con profesional responsable. La alerta de interfaz no sustituye criterio clínico. |
| Consulta | `GET/PUT citas/{id}/consulta`, `POST citas/{id}/consulta/cerrar`, `POST citas/{id}/tareas` | `GuardarConsultaEntrada`, `CrearTareaEntrada`, `Consulta`, `TareaCreada` | El cierre es una acción de alto impacto. Acordar concurrencia, recuperación y confirmación con backend/Producto; verificar cómo persiste y versiona borradores. |
| Administración | `GET/POST/PATCH especialidades`, `GET/POST/PATCH consultorios`, `GET personal`, `GET/POST/PATCH personal`, `GET/PUT personal/{id}/horarios`, `GET/POST personal/{id}/ausencias`, `DELETE personal/{id}/ausencias/{ausenciaId}`, `GET/PUT asignaciones`, `GET indicadores`, `GET auditoria` | Esquemas de `personal.ts`, `Asignacion`, `Indicadores`, `RegistroAuditoria` y tipos de personal/consultorio | Verificar todos los permisos y respuestas contra backend; información de auditoría puede incluir documento, usuario, paciente e IP. |

### Entidades y estados del modelo web observado

Esta lista documenta conceptos del frontend, no funcionalidades ni exposición de datos obligatorias en móvil. Aplican solo a los flujos y campos que Producto apruebe; validar cada contrato y permiso con backend.

- **Sesión:** usuario/rol, clínica y zona horaria; los perfiles de personal y paciente son variantes. El esquema web los tipa como datos opcionales según perfil.
- **Cita:** identificadores de paciente, médico y consultorio; inicio/fin, canal, estado, motivo y metadatos de recordatorio. Estados compartidos: `PROGRAMADA`, `CONFIRMADA`, `EN_ESPERA`, `LISTA`, `EN_CONSULTA`, `ATENDIDA`, `CANCELADA`, `NO_ASISTIO`. La lista no define por sí sola las transiciones válidas.
- **Paciente/historial:** datos de identidad y contacto, alergias/antecedentes, eventos, signos, consultas e indicaciones; tratar todo el conjunto como información sensible.
- **Signos vitales:** presión, frecuencia cardiaca, temperatura, SpO2, peso, talla, IMC, observaciones, alertas y marcas temporales.
- **Consulta/tarea:** campos clínicos de nota, diagnóstico/código CIE-10, tratamiento/indicaciones, estado de cierre y tareas asociadas.
- **Administración:** personal, horarios, ausencias, asignaciones, indicadores y registros de auditoría.

Los esquemas de entrada compartidos se encuentran en [`src/shared/`](./src/shared/), los tipos de respuesta web en [`src/api/tipos.ts`](./src/api/tipos.ts) y las llamadas por dominio en [`src/api/queries/`](./src/api/queries/). Tomar estas referencias como punto de contraste, no como contrato móvil publicado.

### Estados, errores y recuperación

**Hecho del frontend:** los errores se normalizan a `ErrorApi`; los códigos compartidos incluyen `NO_AUTENTICADO` (401), `SIN_PERMISO` (403), `NO_ENCONTRADO` (404), `VALIDACION` (422), conflictos `409` —incluidos `HORARIO_OCUPADO`, `TRANSICION_INVALIDA`, `MEDICO_AUSENTE` y `CONSULTA_CERRADA`—, `TOKEN_INVALIDO` (410), `LIMITE_EXCEDIDO` (429) y `ERROR_INTERNO` (500). El cliente también clasifica desconexión/timeout como `SIN_CONEXION`.

**Recomendación para móvil:**

1. Diferenciar estado inicial, cargando, contenido, vacío confirmado, error recuperable, error que requiere volver a autenticar y actualización en curso. No presentar un fallo de lectura como ausencia de información clínica.
2. Conservar entrada no enviada cuando sea seguro; indicar qué se guardó y cuándo. No anunciar “guardado” antes de confirmación verificable del servidor.
3. En `401`, seguir el protocolo de renovación acordado y evitar carreras entre solicitudes; si no puede recuperarse la sesión, limpiar credenciales con seguridad y solicitar autenticación.
4. En `403` no repetir automáticamente; explicar falta de permiso sin filtrar datos. En `404` diferenciar recurso inexistente de token inválido/expirado cuando el contrato lo distinga. Para `422`, asociar errores a campos. Para `429`, respetar cualquier `Retry-After` contractual.
5. En conflictos `409`, volver a consultar el recurso/disponibilidad y ofrecer una decisión informada. En timeout después de una mutación, no repetir a ciegas: consultar estado o usar idempotencia si backend la ofrece.
6. Reintentar lecturas transitorias con límites y señal explícita. Reintentar una mutación solo cuando contrato e idempotencia hagan seguro ese comportamiento.

La web refresca agenda, cola y tareas cada 30 segundos e indicadores cada 60 segundos. Son valores de su implementación web, no objetivos de sincronización móvil. Definir consumo de red/batería, actualización al volver a primer plano y carga bajo demanda con Producto/backend.

## Sesión, privacidad y seguridad de datos

### Evidencia web, no requisitos de almacenamiento móvil

- El access token web está en memoria; sesión/usuario se obtiene por `GET auth/yo`. El refresh web se apoya en cookie `httpOnly`. Al expirar la renovación, la web termina la sesión. Ver [`src/api/token.ts`](./src/api/token.ts), [`src/auth/sesion.tsx`](./src/auth/sesion.tsx) y [`src/api/client.ts`](./src/api/client.ts).
- La web declara que no guarda información clínica en `localStorage`; esa superficie se limita a la preferencia de tema. El borrador de nota tiene respaldo temporal en `sessionStorage`, se elimina al confirmar el guardado y se recupera en la web. Ver [`src/lib/preferencias.ts`](./src/lib/preferencias.ts) y [`src/features/consulta/respaldo.ts`](./src/features/consulta/respaldo.ts).
- Esto describe controles de frontend, **no certifica cumplimiento normativo, seguridad del dispositivo, retención del servidor ni ausencia de copias en otros sistemas**.

### Recomendaciones y prerequisitos

- No persistir datos clínicos offline ni en almacenamiento genérico por defecto. Si se necesita almacenamiento local, definir caso de uso, mínimo de datos, cifrado/llaves respaldadas por las APIs seguras del sistema, expiración, eliminación al cerrar sesión, respaldo del dispositivo, capturas, cambio de usuario y escenarios de dispositivo perdido. Someter la decisión a seguridad/privacidad.
- Guardar secretos de sesión solo en mecanismo de credenciales seguro aprobado para la plataforma; no registrar tokens, documentos, datos de pacientes, notas ni contenido de respuestas en logs, analítica, crash reports o portapapeles sin control y justificación.
- Aplicar minimización de datos, tiempo de sesión y reautenticación según riesgo, controles de acceso del servidor y separación de caché al cambiar de cuenta. Las decisiones de biometría, si se proponen, requieren aceptación explícita, alternativa y política de recuperación; no reemplazan la autorización backend.
- Cifrado en tránsito, configuración TLS, bloqueo de tráfico inseguro, gestión de secretos de build y redacción de datos en telemetría requieren revisión con la infraestructura y backend. La web revisada no basta para establecer la configuración nativa o del servidor.
- Si se solicita push: acordar primero propósito, consentimiento, preferencias, contenido no sensible en payload/notificación, baja, ambiente y ciclo de tokens. La existencia de `CanalRecordatorio.PUSH`, el enum `Plataforma` (`ANDROID`/`IOS`) y `RegistrarDispositivoEntrada` en esquemas compartidos **no prueba** que exista un endpoint móvil de registro funcional: no aparece una llamada de registro en `src/api/queries/`. Definir y verificar contrato, autorización, almacenamiento, revocación y proveedor con backend antes de implementar.

## Fechas, horas y estados en operación

**Hecho del frontend:** citas y fechas se presentan en la zona IANA de la clínica (`Sesion.clinica.zonaHoraria`), no en la zona del dispositivo. Las marcas temporales de API se interpretan y muestran con esa zona; las horas para citas se serializan con desfase local. Ver [`src/lib/fechas.ts`](./src/lib/fechas.ts).

**Recomendación:** usar APIs de fecha/hora de cada plataforma con zona IANA explícita. Distinguir fecha civil de instante, evitar conversiones silenciosas a la zona del teléfono y probar cambios de horario estacional, medianoche, clínica en zona distinta, zona inválida y rangos de disponibilidad. Confirmar con backend la semántica de `fecha`, `desde`, `hasta`, offsets e inclusividad.

## Arquitectura nativa: opciones y límites

- **Opciones por evaluar, no decisiones:** Android nativo con Kotlin/Jetpack Compose; iOS nativo con Swift/SwiftUI.
- **Recomendación:** separar presentación/navegación, lógica de dominio y acceso a datos; centralizar cliente HTTP, sesión, contratos, errores y telemetría redactada. Organizar features con límites claros y tipos de API explícitos.
- Usar tipos compatibles con el contrato vigente y generar/validar modelos desde una fuente acordada cuando backend publique respuestas verificables. No duplicar reglas de negocio como fuente de verdad. Aislar por plataforma cualquier divergencia de interacción o capacidades del sistema.
- Definir estrategia de caché y ciclo de vida por dominio: datos transitorios, clínica/rol activos, actualización, invalidación, cierre de sesión y reautenticación. No importar automáticamente el comportamiento de TanStack Query ni sus intervalos.
- Mantener selección de cuenta/entorno y configuración de API segura por ambiente. Las bases, certificados y secretos no deben quedar hardcodeados.
- No escoger aún arquitectura offline-first, sincronización en segundo plano, proveedor push, almacenamiento de sesión ni librerías. Cada una depende de necesidades y contratos por confirmar.

## Checklist de aceptación para cada flujo móvil

### Producto y contratos

- [ ] La plataforma, rol, actor, objetivo y prioridad del flujo están aprobados; no se infirieron del menú web.
- [ ] El flujo, incluyendo estados alternos y errores, ha sido revisado por Producto y validado con UX/UI.
- [ ] Cada operación tiene método, path, autenticación, permisos, entrada, respuesta, códigos de error y política de repetición contrastados con backend vigente.
- [ ] El servidor aplica autorización y reglas clínicas/de negocio; el cliente no se usa como control de acceso.

### UX, UI y accesibilidad

- [ ] Interacción y navegación usan patrones nativos apropiados; el diseño no es una copia reducida de la web.
- [ ] Carga, vacío confirmado, error, éxito y datos obsoletos se distinguen; errores clínicos no se muestran como ausencia confirmada.
- [ ] Hay recuperación comprensible; acciones con resultado ambiguo no duplican citas, transiciones ni notas.
- [ ] VoiceOver/TalkBack, escalado de texto, contraste, foco, errores de formulario y estados dinámicos se verifican en dispositivo/simulador.
- [ ] Fechas/horas mantienen la zona de clínica y las unidades/formatos son explícitos.

### Privacidad, sesión y calidad

- [ ] Tokens y datos sensibles no aparecen en logs, analítica ni almacenamiento no aprobado.
- [ ] Cierre de sesión/cambio de cuenta limpia credenciales y datos en memoria/caché según política acordada.
- [ ] Renovación, expiración, revocación, reloj del dispositivo y reconexión se probaron con backend.
- [ ] Reintentos, concurrencia y recuperación ante timeout respetan semántica/idempotencia contractual.
- [ ] Hay pruebas unitarias de lógica, pruebas de integración de cliente/contrato, pruebas de interfaz accesible y pruebas end-to-end para los flujos aprobados en iOS/Android objetivo.
- [ ] Se probaron offline/online solo si ese comportamiento se aprueba como requisito; no se infiere soporte offline por el modo mock web.

## Validación y estrategia de pruebas

**Base comprobada en web:** Vitest prueba lógica y pantallas con MSW; Playwright cubre flujos end-to-end contra API con seed. El README lista `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` y `npm run test:e2e`. El E2E [`e2e/flujos.spec.ts`](./e2e/flujos.spec.ts) verifica agenda → llegada → triaje → consulta → indicaciones, cancelación por enlace público y una guarda de rol; también prueba agenda a 400 px. Esto aporta escenarios de dominio de referencia, pero no valida una app nativa.

**Para el proyecto nativo:** preparar test unitario por plataforma para fechas/validación/transiciones visuales, pruebas de repositorio/serialización contra fixtures aprobados, integración de autenticación/errores y recorridos instrumentados en dispositivos/emuladores representativos. Incluir pruebas manuales o automatizadas de lector de pantalla, tamaño de fuente, conectividad intermitente, sesión vencida, conflicto de cita, timeout tras mutación y contenido sensible en telemetría. Acordar matriz de SO/dispositivos cuando se confirme soporte.

## Decisiones pendientes

| Decisión | Por qué hace falta | Evidencia/confirmación necesaria |
| --- | --- | --- |
| ¿iOS, Android o ambos? ¿Versiones mínimas y dispositivos? | Determina plataforma, diseño, pruebas y distribución. | Aprobación de producto y estrategia de soporte. |
| ¿Qué roles, tareas y usuarios son objetivo de cada app? | La web cubre varios roles, pero no define prioridad móvil. | Investigación, requisitos de negocio y análisis de contexto de uso. |
| ¿Aplicaciones separadas o producto móvil común? | Afecta distribución, autenticación, navegación y aislamiento de datos. | Decisión de producto/arquitectura. |
| ¿Qué contrato backend soporta clientes nativos? | La web usa cookie de refresh y OpenAPI/respuestas no cubren todo. | Contrato publicado, validado por backend; política de tokens, renovación, revocación y errores. |
| ¿Qué contenido se puede cachear y por cuánto tiempo? | Hay datos clínicos sensibles y respaldos web específicos de sesión. | Evaluación de privacidad/seguridad, retención, amenaza y ciclo de cuenta. |
| ¿Se requieren capacidades offline? | Cambia consistencia, conflicto, cifrado, borradores y riesgo clínico. | Necesidad de usuario más diseño y soporte explícitos del backend. |
| ¿Se requieren push o recordatorios móviles? | Esquema compartido menciona canales y plataforma, pero no evidencia flujo de registro usado por web. | Requisito de producto y contrato/API/proveedor completo verificados. |
| ¿Se ofrecerá biometría u otra reautenticación local? | Afecta sesión y recuperación; no reemplaza permisos del servidor. | Evaluación de riesgo, alternativa accesible y política de seguridad. |
| ¿Cómo se gestionan varias clínicas/cuentas/zonas horarias? | El contexto web usa zona de clínica; movilidad puede cambiar de red/zona. | Reglas de producto y contrato de selección de clínica. |
| ¿Qué eventos de auditoría/telemetría se requieren? | Auditoría contiene campos sensibles; diagnóstico móvil debe evitar filtraciones. | Política de privacidad, seguridad y operaciones. |
| ¿Cómo se distribuye, actualiza y da soporte a la app? | Determina firma, ambientes, releases, soporte y respuesta a incidentes. | Decisión de operaciones/producto. |

## Roadmap condicional (sin estimaciones)

1. **Descubrimiento y decisiones:** cerrar plataformas, usuarios/tareas objetivo, riesgos, políticas de datos y responsables de contrato; validar journeys y criterios de éxito.
2. **Alineación de API y seguridad:** verificar endpoints/respuestas y permisos en backend; acordar sesión nativa, errores, idempotencia, fechas, telemetría y necesidades de capacidades opcionales.
3. **Fundación por plataforma:** solo tras elegir plataforma, crear estructura nativa, navegación, tema/accesibilidad, cliente de red, sesión segura y estrategia de datos aprobada; probar contratos/error handling.
4. **Flujos validados:** implementar y probar los recorridos que Producto priorice. No se fija aquí un MVP ni orden por rol.
5. **Preparación de operación:** validar accesibilidad/usabilidad, privacidad, pruebas de dispositivos, distribución, monitoreo sin datos sensibles, soporte y plan de actualización.

Cada fase puede volver a descubrimiento si una capacidad requerida carece de soporte backend o decisión de privacidad; no convertir una hipótesis en workaround local silencioso.

## Referencias del repositorio

- [`README.md`](./README.md): alcance, roles, sesiones, privacidad web, accesibilidad y comandos de prueba.
- [`ARQUITECTURA.md`](./ARQUITECTURA.md): arquitectura actual del frontend y límites de la copia de esquemas.
- [`FLUJOS-Y-FUNCIONALIDADES-PENDIENTES.md`](./FLUJOS-Y-FUNCIONALIDADES-PENDIENTES.md): hallazgos y límites explícitos de auditoría web.
- [`src/app/router.tsx`](./src/app/router.tsx), [`src/auth/rutas.ts`](./src/auth/rutas.ts), [`src/app/layout/menu.ts`](./src/app/layout/menu.ts): rutas, guardas, destinos y navegación por rol.
- [`src/api/client.ts`](./src/api/client.ts), [`src/api/queries/`](./src/api/queries/), [`src/api/tipos.ts`](./src/api/tipos.ts): cliente, paths invocados y tipos de respuesta del frontend.
- [`src/shared/`](./src/shared/): copia local de esquemas/enums compartidos; sincronizar y contrastar con backend antes de usar como contrato definitivo.
- [`src/lib/fechas.ts`](./src/lib/fechas.ts), [`src/api/errores.ts`](./src/api/errores.ts), [`src/shared/errores.ts`](./src/shared/errores.ts): zona horaria y errores.
- [`src/features/consulta/respaldo.ts`](./src/features/consulta/respaldo.ts), [`src/lib/preferencias.ts`](./src/lib/preferencias.ts): persistencia específica de la web.
- [`src/features/`](./src/features/), [`src/features/agenda/AgendaPage.test.tsx`](./src/features/agenda/AgendaPage.test.tsx), [`src/features/enfermeria/TriajePage.test.tsx`](./src/features/enfermeria/TriajePage.test.tsx), [`src/features/consulta/ConsultorioPage.test.tsx`](./src/features/consulta/ConsultorioPage.test.tsx), [`e2e/flujos.spec.ts`](./e2e/flujos.spec.ts): pantallas y pruebas web de referencia.
