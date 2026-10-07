# Funcionalidades pendientes y flujos por mejorar

## Resumen ejecutivo

La revisión del frontend no confirmó la ausencia de un dominio funcional completo descrito para MediCita. Sí identificó tres limitaciones concretas en el manejo de errores: la solicitud de citas del portal no ofrece recuperación visible si falla la carga de catálogos, el bloque de signos vitales puede comunicar una ausencia no confirmada si falla el historial y los horarios del personal pueden permanecer como “Cargando…”.

También se detectó una discrepancia documental en la versión de Vite indicada en el README. Las observaciones se limitan al frontend de este repositorio; no permiten concluir que una función esté ausente en el producto completo ni describen capacidades del backend.

## Hallazgos priorizados

### P2 — Solicitud de cita: diferenciar error de carga y permitir recuperarse

- **Clasificación:** falta comprobada de manejo de error/recuperación en la interfaz; no es evidencia de que falte la funcionalidad de solicitar citas.
- **Rol y escenario:** paciente en `/mis-citas/nueva`, cuando falla la carga de médicos o especialidades.
- **Evidencia:** la pantalla trata los estados de carga y selección de médicos, pero no presenta un estado de error ni una acción de reintento para la consulta fallida. Los datos se obtienen mediante consultas separadas. La sección requiere el rol `PACIENTE`.
  - [SolicitarCitaPage.tsx](src/features/portal/SolicitarCitaPage.tsx#L100-L132)
  - [clinica.ts](src/api/queries/clinica.ts#L27-L40)
  - [rutas.ts](src/auth/rutas.ts#L22-L29)
- **Impacto:** una falla temporal puede parecer falta de disponibilidad y bloquear el flujo sin explicar al paciente qué ocurrió ni cómo continuar.
- **Mejora propuesta:** representar por separado carga, error y lista vacía; incluir una acción para reintentar la consulta fallida. Si falla la lista de especialidades, comunicarlo claramente sin bloquear la solicitud cuando el flujo pueda continuar sin ese filtro.
- **Criterios de aceptación:**
  1. Si falla la carga de médicos, se muestra un error comprensible y se puede reintentar.
  2. Una respuesta exitosa sin médicos disponibles se presenta como estado vacío, distinto de un error.
  3. Si la consulta de especialidades falla, su estado se distingue de la lista vacía y el paciente puede continuar cuando la selección de especialidad no sea necesaria.
  4. Tras un reintento exitoso, el formulario permite continuar con los datos recibidos.

### P2 — Consulta médica: no presentar como ausencia un historial que no se pudo cargar

- **Clasificación:** mejora comprobada del flujo de error.
- **Rol y escenario:** médico en `/consultorio` o `/consultorio/:citaId`, cuando falla la consulta del historial.
- **Evidencia:** “Signos de hoy” distingue carga y presencia de datos, pero ante un error sin datos muestra “No se registraron signos vitales en esta cita”. El bloque de historial más abajo sí presenta un estado de error con reintento. La sección requiere el rol `MEDICO`.
  - [DetalleConsulta.tsx](src/features/consulta/DetalleConsulta.tsx#L140-L152)
  - [DetalleConsulta.tsx](src/features/consulta/DetalleConsulta.tsx#L166-L172)
  - [rutas.ts](src/auth/rutas.ts#L22-L29)
- **Impacto:** el mensaje puede interpretarse como un dato clínico confirmado, aunque la consulta no haya podido verificarlo.
- **Mejora propuesta:** mostrar el error y una opción de reintento también en “Signos de hoy”; reservar el mensaje de ausencia para una consulta exitosa sin signos registrados.
- **Criterios de aceptación:**
  1. Si falla la carga del historial, “Signos de hoy” indica que los datos no están disponibles y ofrece recuperación.
  2. Si la consulta termina correctamente sin signos para esa cita, se muestra el estado de ausencia actual.
  3. Error y ausencia confirmada no se representan con el mismo mensaje.

### P3 — Administración de personal: distinguir carga y error de horarios

- **Clasificación:** mejora comprobada del flujo de error.
- **Rol y escenario:** administración en `/admin/personal`, cuando falla la consulta del horario de una persona.
- **Evidencia:** un horario sin datos se convierte en `null` y la tabla lo muestra como “Cargando…”, sin diferenciar una consulta pendiente de una consulta fallida.
  - [PersonalPage.tsx](src/features/personal/PersonalPage.tsx#L53-L57)
  - [PersonalPage.tsx](src/features/personal/PersonalPage.tsx#L71-L79)
- **Impacto:** la indicación de carga puede permanecer después de un error y no informa que el dato no pudo obtenerse ni cómo recuperarlo.
- **Mejora propuesta:** representar de manera diferenciada carga, error y horario disponible, con reintento para la consulta fallida de cada persona.
- **Criterios de aceptación:**
  1. Una consulta pendiente muestra un estado de carga.
  2. Si falla un horario, su fila muestra un error y una acción para reintentar, sin alterar el estado de las demás filas.
  3. Tras un reintento exitoso, la fila muestra el horario recibido.

### P3 — README: corregir la versión de Vite documentada

- **Clasificación:** diferencia documental comprobada; sin impacto directo observado en la experiencia de uso.
- **Escenario:** persona que consulta la descripción técnica del frontend.
- **Evidencia:** README indica Vite 5; `package.json` declara `vite: ^8.3.2` y la arquitectura documenta Vite 8.
  - [README.md](README.md#L3)
  - [package.json](package.json#L74)
  - [ARQUITECTURA.md](ARQUITECTURA.md#L13)
- **Impacto:** la documentación no coincide con la dependencia declarada y ofrece información técnica contradictoria.
- **Mejora propuesta:** actualizar la mención del README para que coincida con `package.json`.
- **Criterio de aceptación:** la versión indicada en README coincide con la versión principal declarada en `package.json` y con `ARQUITECTURA.md`.

## Faltantes no confirmados y propuestas sujetas a validación

La revisión no encontró evidencia suficiente para afirmar que falte una funcionalidad de negocio completa ni para proponer nuevas capacidades como requisitos confirmados. Los tres primeros hallazgos describen estados y acciones de recuperación ausentes en pantallas existentes, no una ausencia demostrada en el backend o en el producto completo. Cualquier ampliación más allá de corregir estos flujos requiere validación de producto y, cuando corresponda, confirmación del contrato y comportamiento del backend.

## Alcance y limitaciones de la auditoría inicial

- Auditoría de lectura del frontend: rutas y roles, flujos existentes y estados de carga/error de las pantallas señaladas; contraste de la documentación con el código revisado.
- La evidencia no confirma disponibilidad, lógica ni ausencia de comportamiento en el backend u otros componentes del producto.
- En el momento de la auditoría inicial no se realizó una validación visual en navegador ni se ejecutaron pruebas, lint, typecheck o build. El informe inicial documentó hallazgos y no modificó la implementación.

## Seguimiento de implementación

Se implementaron las cuatro mejoras descritas en los hallazgos priorizados, sin cambios en contratos de API, permisos ni reglas del flujo de negocio:

- **Solicitud de cita:** médicos y especialidades muestran estados diferenciados de carga, error y lista vacía. Cada consulta fallida tiene reintento independiente; un fallo de especialidades no impide continuar sin filtro. Los médicos ausentes o no disponibles para el filtro actual se identifican explícitamente.
- **Signos de hoy:** un fallo al cargar el historial ahora muestra un error y permite reintentar. El mensaje de ausencia se conserva solo para una consulta exitosa sin signos de esa cita. El bloque de historial mantiene su propio estado de error y recuperación.
- **Horarios del personal:** cada fila distingue carga, error y horario disponible. El reintento afecta solo la consulta de horarios de esa persona.
- **README:** la versión de Vite indicada se actualizó a Vite 8, en concordancia con `package.json` y `ARQUITECTURA.md`.

### Validación de implementación

- Pruebas focalizadas: 12 pruebas aprobadas en `SolicitarCitaPage.test.tsx`, `ConsultorioPage.test.tsx` y `PersonalPage.test.tsx`. Cubren errores, estados vacíos, reintentos y recuperación.
- ESLint y Prettier: aprobados para los siete archivos TypeScript modificados o añadidos.
- Typecheck: ejecutado, pero bloqueado por dos incompatibilidades preexistentes confirmadas en `HEAD`: `fallbackElement` en `src/main.tsx` y `manualChunks` en `vite.config.ts`. No se modificaron estos archivos ni se ejecutó el build.
- Revisión UX: `product-ux-reviewer` señaló que los reintentos debían mostrar progreso y evitar pulsaciones repetidas. Se integró con el estado `Reintentando…` y botón ocupado cuando la consulta conserva el error, además de estados accesibles de carga durante el reintento.
- Validación visual en navegador: no realizada.
