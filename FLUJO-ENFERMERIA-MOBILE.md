# Flujo de enfermería para aplicación móvil nativa

**Estado:** referencia de descubrimiento, no especificación aprobada de producto.  
**Fecha:** 2026-10-03.  
**Fuente:** comportamiento observable en este frontend web. No hay una app nativa ni capturas de las pantallas en este repositorio.

## Cómo leer este documento

- **Hecho del frontend** describe una ruta, dato, llamada o comportamiento que existe en el código web. No demuestra que el backend desplegado permita la operación ni que esta deba incluirse en móvil.
- **Propuesta nativa** es una opción de diseño para validar con Producto, UX/UI, usuarios clínicos, backend y privacidad; no es una decisión aprobada.
- **Pendiente** identifica una definición que no puede inferirse del frontend.

Este flujo complementa [CONTEXTO-APLICACIONES-MOVILES-NATIVAS.md](./CONTEXTO-APLICACIONES-MOVILES-NATIVAS.md). iOS y Android siguen siendo plataformas candidatas; Kotlin/Jetpack Compose y Swift/SwiftUI son opciones por evaluar, no requisitos.

## Alcance observado

El rol `ENFERMERA` tiene dos rutas web y un destino inicial: `/enfermeria` (sala de espera) y `/enfermeria/triaje/:citaId` (triaje); al iniciar sesión aterriza en `/enfermeria`. La navegación del rol muestra «Sala de espera». La definición está en [src/auth/rutas.ts](./src/auth/rutas.ts), [src/app/router.tsx](./src/app/router.tsx) y [src/app/layout/menu.ts](./src/app/layout/menu.ts).

El recorrido observado comprende:

1. Abrir la cola del día de la clínica; recepción registra previamente la llegada del paciente.
2. Revisar pacientes en espera, sus alergias, alertas, hora, tiempo de espera, médico y consultorio.
3. Abrir una cita en triaje, registrar cero o más signos (pero al menos una medida) y una nota opcional.
4. Guardar los signos; la respuesta exitosa coloca la cita en estado `LISTA` y la web regresa a la sala.
5. Consultar tareas delegadas pendientes y marcarlas como hechas.

El flujo end-to-end confirma el contexto anterior a enfermería —recepción agenda y registra llegada— y el posterior —el médico abre la consulta— en [e2e/flujos.spec.ts](./e2e/flujos.spec.ts). Enfermería no registra la llegada, no inicia la consulta ni tiene una pantalla de historial en este alcance. No añadir esas capacidades por analogía con otros roles.

## Mapa de pantallas y adaptación propuesta

| Referencia web | Hecho del frontend | Propuesta para evaluar en móvil |
| --- | --- | --- |
| `/enfermeria` — [EnfermeriaPage.tsx](./src/features/enfermeria/EnfermeriaPage.tsx) | Resumen diario con bloques de pacientes en espera, pacientes listos para médico y tareas pendientes. Muestra médicos asignados, fecha de clínica y refresco web cada 30 s. | Una pantalla de inicio con secciones accesibles y conteos; evaluar pestañas/segmentos o secciones apiladas para alternar «En espera», «Listos» y «Tareas». No copiar la cuadrícula de escritorio. Mantener visible el estado de actualización y dar acceso manual a actualizar; 30 s es un intervalo web, no un requisito móvil. |
| Elemento «Paciente» en cola — componente `Paciente` de [EnfermeriaPage.tsx](./src/features/enfermeria/EnfermeriaPage.tsx) | Tarjeta con alergia, nombre, edad, hora de cita en zona de clínica, médico, consultorio, tiempo desde llegada y alertas. Solo los de `EN_ESPERA` muestran «Tomar signos». | Lista de tarjetas compactas con identidad y alergia/alertas en primer nivel; detalles de hora, profesional y espera en jerarquía secundaria. Área táctil cómoda y acción inequívoca «Tomar signos». No depender solo del color o el icono para señalar alertas. |
| `/enfermeria/triaje/:citaId` — [TriajePage.tsx](./src/features/enfermeria/TriajePage.tsx) | Cabecera de paciente/cita y alergia destacada; formulario de presión, frecuencia cardiaca, temperatura, SpO₂, peso, talla y nota opcional. IMC y alertas se calculan durante la entrada. | Pantalla de captura en una columna, con secciones agrupadas y controles numéricos nativos cuando sean apropiados. Repetir nombre del paciente y señal de alergia durante la captura; mostrar unidad, error y rango junto a cada campo. Considerar agrupación/secciones para evitar scroll y pérdida de contexto, sin omitir campos. |
| Confirmación del triaje | Éxito muestra que el paciente está listo y las alertas devueltas; después navega a `/enfermeria`. | Confirmación solo después de respuesta satisfactoria del servidor. Ofrecer regreso a la cola y reconciliar su estado. No inferir que una alerta equivale a una decisión clínica ni agregar escalamiento sin aprobación clínica. |
| Tareas pendientes dentro de `/enfermeria` — `Tareas` de [EnfermeriaPage.tsx](./src/features/enfermeria/EnfermeriaPage.tsx) | Cada tarea muestra tipo, detalle si existe, paciente, médico y hora de creación; «Hecha» marca la tarea como completada. | Lista separable del flujo de signos, con acción explícita por tarea y confirmación de estado al completar. Si se evalúa una confirmación adicional o un detalle de tarea, validar que no agregue pasos innecesarios en el contexto clínico. |

Estas son referencias funcionales, no diseños visuales ni capturas. Validar los prototipos nativos con personal de enfermería en contexto de uso real y con ambas plataformas si finalmente se aprueban.

## Recorrido principal, paso a paso

### 1. Entrada y sesión

**Hecho del frontend:** una ruta privada exige sesión y rol `ENFERMERA`; el destino inicial del rol es `/enfermeria`. La guarda web redirige a login si falta sesión y presenta «sin acceso» para un rol no permitido. El menú no concede permisos de backend. Ver [src/app/router.tsx](./src/app/router.tsx), [src/auth/guardas.ts](./src/auth/guardas.ts) y [src/auth/rutas.ts](./src/auth/rutas.ts).

**Propuesta nativa:** diseñar estados explícitos de carga/autenticación, sesión vencida, acceso denegado y salida/cambio de cuenta. Confirmar con backend el mecanismo de sesión nativa antes de implementar; la web usa access token en memoria y refresh con cookie `httpOnly`, lo que no define por sí solo la estrategia móvil.

### 2. Cola de hoy

**Hecho del frontend:** la fecha de consulta se deriva de la zona IANA de la clínica, no de la zona del teléfono. `GET enfermeria/cola?fecha=…` trae las citas y la página separa `EN_ESPERA` de `LISTA`. `GET asignaciones?fecha=…` aporta los médicos asignados. La cola se vuelve a consultar cada 30 s en web. Ver [src/api/queries/enfermeria.ts](./src/api/queries/enfermeria.ts), [src/api/queries/clinica.ts](./src/api/queries/clinica.ts), [src/lib/fechas.ts](./src/lib/fechas.ts) y [src/api/tipos.ts](./src/api/tipos.ts).

- En espera: muestra alergia, identidad/edad, hora, médico/consultorio, llegada relativa y alertas; ofrece «Tomar signos».
- Listos para el médico: muestra la misma información contextual, sin acción de triaje.
- Sin citas en espera/listas: se muestran estados vacíos distintos.
- Error al cargar cola: se muestra error y opción de reintentar; no debe presentarse como cola vacía.
- Asignación: se muestra el nombre del médico y, si una cita lo permite, el consultorio. En la web, si la consulta de asignaciones falla y no hay datos, la pantalla también cae en «No tienes médicos asignados hoy»; la app no debe reproducir esa ambigüedad, sino distinguir error de ausencia confirmada.

**Precondición:** la llegada la registra recepción, no enfermería. Confirmado por [e2e/flujos.spec.ts](./e2e/flujos.spec.ts); la pantalla de enfermería no ofrece acción de llegada.

### 3. Seleccionar cita y abrir triaje

**Hecho del frontend:** «Tomar signos» navega con el `citaId`. La pantalla busca esa cita dentro de la cola del día ya cargada; no hace una lectura individual de cita. Si la cita no aparece —por ejemplo, ya no pertenece a la cola de esa enfermera— se muestra un estado con regreso a sala. Si ya está `LISTA`, se informa que los signos ya se registraron y no se muestra formulario editable. Ver [src/features/enfermeria/TriajePage.tsx](./src/features/enfermeria/TriajePage.tsx).

**Propuesta nativa:** volver a validar estado y acceso con datos vigentes antes de mostrar acciones de escritura. Si el servidor rechaza el acceso/estado, explicar el resultado y permitir volver a actualizar la cola; no asumir que la visibilidad previa autoriza la mutación.

### 4. Capturar medidas y validar

**Hecho del frontend:** el formulario presenta unidades explícitas, calcula IMC cuando peso y talla son válidos y anuncia visualmente alertas. Los campos de medidas son opcionales individualmente, pero no se permite guardar solo una nota o el formulario vacío. La presión debe escribirse como pareja `sistólica/diastólica`, ambas deben estar presentes y la sistólica debe ser mayor. Se aceptan coma o punto decimal en los campos decimales de la web. La nota admite hasta 1000 caracteres.

Los rangos de entrada que define el esquema compartido [src/shared/signos-vitales.ts](./src/shared/signos-vitales.ts) son:

| Medida | Rango aceptado | Unidad |
| --- | ---: | --- |
| Sistólica | 50–260 | mmHg |
| Diastólica | 30–160 | mmHg |
| Frecuencia cardiaca | 30–220 | lpm |
| Temperatura | 34–42.5 | °C |
| SpO₂ | 50–100 | % |
| Peso | 0.5–300 | kg |
| Talla | 30–250 | cm |

El código web marca alertas cuando presión sistólica ≥140 o diastólica ≥90; frecuencia cardiaca >100 en pacientes mayores de 12 años; temperatura ≥38 °C; o SpO₂ <94 %. El IMC se calcula con peso/talla y muestra una categoría web. Estos son umbrales y cálculos implementados, no una guía clínica móvil aprobada ni un sustituto del criterio profesional. No crear umbrales adicionales ni decisiones automáticas.

### 5. Guardar signos y volver a cola

**Hecho del frontend:** la web invoca `POST citas/{citaId}/signos-vitales` con las medidas disponibles y la nota opcional. Con respuesta satisfactoria muestra el resultado/alertas, invalida consultas relacionadas y regresa a la sala; la cita pasa a `LISTA` según las pruebas con MSW. Ver [src/api/queries/enfermeria.ts](./src/api/queries/enfermeria.ts), [src/features/enfermeria/TriajePage.tsx](./src/features/enfermeria/TriajePage.tsx) y [src/features/enfermeria/TriajePage.test.tsx](./src/features/enfermeria/TriajePage.test.tsx).

**Recuperación propuesta:** durante el envío, bloquear envíos duplicados y mantener identidad de cita. Ante error de validación, mostrar el mensaje junto al campo; ante error de red/timeout o respuesta ambigua, no reintentar a ciegas: consultar nuevamente la cola/estado con backend y decidir si los signos quedaron registrados antes de repetir. La API no se documenta aquí como idempotente. No anunciar éxito sin confirmación del servidor.

### 6. Revisar y completar tareas

**Hecho del frontend:** `GET enfermeria/tareas?estado=PENDIENTE` muestra las tareas pendientes. «Hecha» envía `POST tareas/{id}/completar`; mientras muta, la acción queda ocupada y las tareas se invalidan/refrescan. Éxito o error se notifican al usuario. Ver [src/api/queries/enfermeria.ts](./src/api/queries/enfermeria.ts) y [src/features/enfermeria/EnfermeriaPage.tsx](./src/features/enfermeria/EnfermeriaPage.tsx).

**Propuesta nativa:** tras completar, reflejar el estado confirmado del servidor y proteger contra doble toque. Ante error o timeout, conservar el contexto y reconciliar con la lista antes de reintentar. No asumir que la tarea pertenece solo a la enfermera autenticada por el hecho de que la web consulta esta ruta; validar autorización y asignación en backend.

## Operaciones, contratos y límites de autorización

Los siguientes paths son relativos a `/api/v1` por defecto. Son las llamadas que usa el frontend, no una afirmación de que el servidor desplegado las implemente con una autorización o respuesta concreta.

| Operación observada | Uso en la web | Contrato/tipo que consume el frontend | Por verificar antes de móvil |
| --- | --- | --- | --- |
| `GET enfermeria/cola?fecha=YYYY-MM-DD` | Cargar sala del día | `Cola` con citas de estado `EN_ESPERA` o `LISTA` (`src/api/tipos.ts`) | Rol permitido, alcance por clínica/asignación, orden/paginación, respuestas y errores. |
| `GET asignaciones?fecha=YYYY-MM-DD` | Mostrar médicos asignados hoy | `Asignacion[]` (`src/api/tipos.ts`) | Permisos, alcance y semántica cuando no hay asignación. |
| `POST citas/{id}/signos-vitales` | Guardar triaje | `SignosVitalesEntrada` de `src/shared/signos-vitales.ts`; la web tipa la respuesta como signos vitales con `pacienteId` | Respuesta real, permisos por cita/asignación, regla de estado, conflictos, auditoría, idempotencia y manejo de timeout. |
| `GET enfermeria/tareas?estado=PENDIENTE` | Listar tareas pendientes | `Tarea[]` (`src/api/tipos.ts`) | Si el resultado se filtra por enfermera/clinica, privacidad, paginación y contrato/error. |
| `POST tareas/{id}/completar` | Completar tarea | Respuesta tipada por la web como `{ id, estado: 'HECHA', pacienteId }` | Permiso del actor, transición válida, repetición segura y respuesta real. |

Las llamadas de este frontend no prueban los controles del servidor. La guarda `ENFERMERA` protege rutas de la SPA, no sustituye autorización por operación en API. La matriz de la guía móvil también advierte que validar la respuesta, permisos y errores con backend es un prerequisito. La documentación OpenAPI compartida no describe todas las respuestas; contrastar con implementación y contrato backend vigente antes de codificar.

## Estados alternos y recuperación a cubrir

| Situación | Evidencia web | Comportamiento móvil a diseñar/validar |
| --- | --- | --- |
| Carga inicial de cola | Esqueleto de carga | Mostrar progreso accesible; evitar controles que aparenten operar antes de tener datos. |
| Cola vacía | Mensaje «Nadie en espera» y «Nadie listo todavía» | Vacío confirmado distinto de error; conservar fecha/zona de clínica. |
| Error de cola | Mensaje y reintento | Mantener que el contenido no se pudo cargar; actualizar explícitamente y no mostrarlo como vacío. |
| Cita dejó de aparecer | Triaje muestra que no está en sala y ofrece volver | Volver a consultar cola; no crear una cita ni permitir editar signos sin estado autorizado. |
| Cita ya `LISTA` | Aviso informativo, sin formulario | Mostrar lectura/estado claro y retorno; no proponer editar o reemplazar signos sin decisión de producto/API. |
| Formulario sin medidas | Error: registrar al menos un signo | Enfocar/anunciar validación y señalar requisito; no aceptar solo nota. |
| Presión incompleta/mal formada | Error de formato; no permite una sola cifra | Asociar mensaje al control y explicar pareja/unidad. |
| Valor fuera de rango o inválido | Validación del esquema; interfaz marca fuera de rango | Diferenciar error que bloquea el guardado de alerta mostrada; no basarse solo en color. |
| Respuesta API de validación | La mutación asigna errores de API a campos conocidos | Traducir solo errores contractuales; conservar valores para corrección. |
| Sesión expirada / sin permiso | Guardas y cliente web gestionan sesión/403; endpoints deben verificarse | Renovación/reautenticación y 403 explícitos según contrato móvil; no reintentar automáticamente una mutación no autorizada. |
| Timeout al guardar o completar tarea | El cliente clasifica timeout/red como `SIN_CONEXION` | Resultado potencialmente ambiguo: consultar estado antes de reintentar. No suponer modo offline. |
| Error al cargar tareas | La sección tiene estado de error y reintento | Aislar error de tareas del estado de la cola; permitir recuperación sin presentar tareas vacías. |
| Error al completar tarea | Se notifica fallo de forma explícita | Mantener el estado pendiente hasta confirmación; reconciliar con servidor tras resultado incierto. |

## Accesibilidad, privacidad y ergonomía

Recomendaciones a validar en dispositivos, no propiedades nativas ya implementadas:

- Mantener nombre completo del paciente y señal de alergia junto al contexto de la cita durante la captura. Mostrar alergia como texto legible, con contraste; no comunicar riesgo únicamente con rojo.
- Antes de aprobar cada pantalla, validar con Producto y responsables clínicos/privacidad qué datos son mínimos para esa tarea. Esto incluye confirmar la necesidad de exponer alergias y alertas en la lista, sin omitir información necesaria durante el triaje aprobado.
- Usar VoiceOver/TalkBack para comprobar orden de lectura, nombres de controles, unidades, asociación de errores, anuncios de alertas/carga/guardado y retorno de foco al cerrar una pantalla.
- Probar aumento de texto, contraste, teclado numérico/decimal, orientación y tamaños de pantalla. No ocultar botones tras el teclado; ofrecer áreas táctiles cómodas y navegación compatible con una sola mano como hipótesis de UX a validar.
- Mantener legibles fecha y hora en zona de clínica, sin convertir silenciosamente a zona del teléfono.
- Limitar notificaciones, vista previa, capturas, portapapeles, telemetría y persistencia a política aprobada. Alergias, identidad, tareas y signos son datos sensibles; no almacenar localmente/offline por defecto.
- Diferenciar carga, error, vacío confirmado y éxito. En alertas, comunicar texto y semántica accesible además del color.
- Validar el flujo con personal representativo y condiciones reales de trabajo antes de congelar navegación, densidad o número de pasos.

## Criterios de aceptación para una futura implementación móvil

### Cola y navegación

- [ ] Producto confirma que enfermería y este escenario pertenecen al alcance móvil, la plataforma objetivo y la prioridad.
- [ ] La entrada autenticada distingue sesión vencida, rol sin permiso, error de cola y vacío confirmado.
- [ ] La fecha de cola corresponde a la zona horaria de la clínica; las asignaciones vacías y fallidas se muestran de forma distinta.
- [ ] Pacientes en espera y listos se diferencian por estado y acción. «Tomar signos» solo se ofrece en un elemento elegible según datos vigentes.
- [ ] Identidad, alergia, alertas, profesional, consultorio y hora se entienden sin depender solo de color o gestos.
- [ ] Producto y responsables clínicos/privacidad aprueban los campos sensibles mínimos por pantalla; la lista no expone datos por mera paridad con la web.

### Triaje y envío

- [ ] La pantalla identifica al paciente/cita y mantiene visible la alergia.
- [ ] Cada medida muestra etiqueta y unidad; presión exige pareja, sistólica > diastólica y todos los rangos/validaciones vigentes se contrastan con backend.
- [ ] Nota es opcional, respeta máximo contractual y no basta por sí sola para guardar.
- [ ] IMC/alertas, si se conservan, reproducen la lógica aprobada y se presentan como apoyo visual, no diagnóstico ni decisión clínica.
- [ ] Errores de campo se anuncian y conservan entradas; carga, envío y éxito se distinguen; no se producen dobles envíos.
- [ ] Un resultado ambiguo de red se reconcilia con el servidor antes de reintentar; una cita ya lista/no disponible no se edita silenciosamente.
- [ ] El estado `LISTA` se confirma y la cola se actualiza después del guardado confirmado.

### Tareas, permisos y calidad

- [ ] La lista contiene solo tareas autorizadas según contrato backend; carga, vacío y error son estados distintos.
- [ ] «Hecha» solo se anuncia tras confirmación del servidor; errores y timeouts no dejan un falso éxito y no producen duplicación.
- [ ] Backend confirma métodos, rutas, cuerpos, respuestas, errores, roles, asignación, transiciones, idempotencia y versión de API.
- [ ] No se presume acceso a historial, edición de signos, asignación de citas o consulta médica.
- [ ] VoiceOver/TalkBack, texto escalado, contraste, foco, teclados, dimensiones táctiles y estados dinámicos se verifican en cada plataforma aprobada.
- [ ] Pruebas nativas incluyen cola vacía/error, cita ya lista/ausente, validaciones, alertas, guardado exitoso, timeout ambiguo, tareas vacías/error/completado, sesión expirada y permisos.
- [ ] No se incluye offline, push, biometría o almacenamiento persistente sin decisión independiente de producto/seguridad y soporte de backend.

## Decisiones pendientes

1. ¿El rol enfermería forma parte del producto móvil? ¿iOS, Android o ambos, y en qué dispositivos/contextos de trabajo?
2. ¿Qué acciones se priorizan: cola y triaje, tareas delegadas o ambas? ¿Quién confirma orden de secciones y datos mínimos visibles?
3. ¿Qué respuesta/permiso backend aplica a cada endpoint para ENFERMERA? ¿La cola/tareas se limita a asignación por turno/fecha y cómo se expresa ese alcance?
4. ¿Qué hace el backend ante un segundo registro de signos o una tarea ya completada? ¿Hay idempotencia, versión o consulta para resolver timeout ambiguo?
5. ¿Las alertas y cálculo de IMC se mantienen en móvil con los mismos umbrales? ¿Qué contenido/acción clínica requieren validación profesional adicional?
6. ¿Qué política de caché, retención, privacidad en pantalla bloqueada y cierre/cambio de cuenta aplica a datos clínicos?
7. ¿Se requiere conectividad intermitente u offline? No se asume en este flujo; definirlo exigiría estrategia de consistencia y seguridad.
8. ¿Qué patrón nativo de navegación, actualización de cola y confirmación de tarea es preferido por personal de enfermería?

## Referencias funcionales y pruebas web

- [src/features/enfermeria/EnfermeriaPage.tsx](./src/features/enfermeria/EnfermeriaPage.tsx): cola, datos contextuales, tareas, estados de carga/error/vacío y acciones.
- [src/features/enfermeria/TriajePage.tsx](./src/features/enfermeria/TriajePage.tsx): selección de cita, formulario, validaciones, alertas y éxito.
- [src/api/queries/enfermeria.ts](./src/api/queries/enfermeria.ts): paths, métodos, consultas, mutaciones, refresco e invalidación.
- [src/shared/signos-vitales.ts](./src/shared/signos-vitales.ts) y [src/lib/signos.ts](./src/lib/signos.ts): rangos, conversión/alertas e IMC.
- [src/auth/rutas.ts](./src/auth/rutas.ts), [src/app/router.tsx](./src/app/router.tsx), [src/auth/guardas.ts](./src/auth/guardas.ts), [src/app/layout/menu.ts](./src/app/layout/menu.ts): destino, navegación y guarda web por rol.
- [src/features/enfermeria/TriajePage.test.tsx](./src/features/enfermeria/TriajePage.test.tsx): alergia, alertas, cálculo IMC, validación, vacío y transición al estado listo.
- [e2e/flujos.spec.ts](./e2e/flujos.spec.ts): recorrido integrado de llegada → triaje → consulta y restricción de rol.
- [CONTEXTO-APLICACIONES-MOVILES-NATIVAS.md](./CONTEXTO-APLICACIONES-MOVILES-NATIVAS.md): límites de evidencia, datos sensibles, contratos y arquitectura móvil pendiente de decisión.
