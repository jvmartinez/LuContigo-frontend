# MediCita · Web

Aplicación web de MediCita (React 18 · Vite 8 · TypeScript estricto · TanStack Query · Tailwind + Radix).
Implementa `FRONTEND.md`: una sola SPA responsiva, en español, con vistas para recepción, enfermería,
médicos, administración y el portal del paciente. Consume solo la API de `LuContigo-backend`.

## Puesta en marcha

```bash
# requisitos: Node 20+
npm install
cp .env.example .env              # VITE_API_URL=http://localhost:3000/api/v1
npm run dev                       # http://localhost:5173 (la API debe estar arriba, ver LuContigo-backend)
```

> **"Port 5173 is already in use".** La web usa siempre el puerto 5173 (`strictPort`) porque la API
> solo acepta ese origen (`CORS_ORIGINS`) y sus enlaces apuntan a él (`APP_WEB_URL`). Si sale este
> error, ya hay otro `npm run dev` o `dev:mock` abierto: ciérralo (Ctrl+C en su terminal) o, en
> PowerShell, `Get-NetTCPConnection -LocalPort 5173 -State Listen | % { Stop-Process -Id $_.OwningProcess }`.

### Sin API: modo demostración

```bash
npm run dev:mock                  # MSW sirve una API simulada en el navegador con datos ficticios
```

El modo mock reproduce el contrato y las reglas principales del backend (máquina de estados,
disponibilidad, `409 HORARIO_OCUPADO`, permisos por rol). Los datos viven en memoria: al recargar
la página vuelven al estado inicial.

### Cuentas de desarrollo

Las mismas del seed del backend, contraseña `Demo2026medicita` (también en modo mock):

| Rol | Email | Aterriza en |
| --- | --- | --- |
| Recepción | recepcion@demo.medicita.app | `/agenda` |
| Enfermera | enfermera1@demo.medicita.app | `/enfermeria` |
| Médico | medico.general@demo.medicita.app | `/consultorio` |
| Paciente | paciente@demo.medicita.app | `/mis-citas` |
| Admin | admin@demo.medicita.app | `/admin/panel` |

Enlace público de prueba en modo mock: `/c/enlace-demo`.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` · `npm run dev:mock` | Servidor de desarrollo contra la API · contra la API simulada |
| `npm run build` · `npm run preview` | `tsc -b` + build de producción · sirve `dist/` |
| `npm run lint` · `npm run typecheck` · `npm run format` | ESLint (con jsx-a11y) · `tsc --noEmit` · Prettier |
| `npm test` | Vitest: unitarias de `lib/` y pantallas completas con MSW |
| `npm run test:e2e` | Playwright contra la API real con el seed (levanta la web sola) |
| `npm run gen:api` | Regenera `src/api/schema.d.ts` desde `http://localhost:3000/api/docs/openapi.json` |
| `npm run sync:shared` | Copia los esquemas Zod de `../LuContigo-backend/src/shared` a `src/shared` |

## Estructura

```
src/
  main.tsx
  app/            router.tsx (rutas + guardas por rol), providers.tsx, layout/ (barra y menú por rol),
                  query-client.ts, tema.ts, ErrorRuta.tsx (403/404)
  api/            client.ts (ky + refresh), errores.ts (ErrorApi), token.ts (access token en memoria),
                  tipos.ts (respuestas), schema.d.ts (generado, no editar), queries/ (hooks por dominio)
  auth/           sesion.tsx (SesionProvider, useUsuario, <RequiereRol>), guardas.ts, rutas.ts
  features/       acceso · agenda · pacientes · enfermeria · consulta · portal · confirmacion ·
                  indicadores · personal · asignaciones · consultorios · auditoria
  components/     ui/ (Button, Input, Select, Dialog, Sheet, Toast, Tabs, Table… estilo shadcn),
                  EstadoCita, SignosVitales, AlertaAlergia, LineaTiempo, SelectorHora, CancelarCitaDialog
  lib/            fechas (zona de la clínica), edad, signos (IMC y alertas), formulario (Zod ↔ RHF), cn
  shared/         esquemas Zod del contrato (copia del backend)
  styles/         tokens.css (tema claro/oscuro), index.css
  test/           setup, utils (renderApp) y mocks/ (API simulada con MSW)
e2e/              Playwright
```

## Cómo se cumplen las reglas clave

- **Sesión.** El access token vive en memoria; el refresh token, en la cookie `httpOnly` que pone la
  API. Ante un 401 el cliente llama una sola vez a `/auth/refresh` (compartido entre peticiones
  concurrentes) y reintenta; si falla, vuelve a `/login?siguiente=…`. La sesión (`GET /auth/yo`) vive
  en TanStack Query y se expone con `useUsuario()`.
- **Rutas por rol.** Cada sección tiene un `loader` que exige sesión y rol. Un rol ajeno ve "No tienes
  acceso a esta pantalla" sin cambiar la URL (p. ej. una enfermera en `/consultorio`).
- **Datos del servidor.** Solo en TanStack Query, con claves estables (`['citas', { fecha }]`,
  `['cola', fecha]`, `['paciente', id, 'historial']`). Cada mutación invalida lo que afecta
  (`invalidarCitas`). Agenda, cola y tareas se refrescan cada 30 s.
- **Fechas.** Llegan en UTC y se muestran en la zona de la clínica (`lib/fechas.ts`, siempre con
  `zona`); la agenda nunca usa la zona del navegador. Las horas se envían con el desfase de la clínica.
- **Formularios.** React Hook Form validado con los mismos esquemas Zod de la API (`resolverZod`), con
  mensajes en español; los errores 422 por campo de la API se muestran junto al campo.
- **Agenda.** Columnas por médico con celdas de la duración de su especialidad. El selector de hora
  solo ofrece huecos de `GET /disponibilidad`; ante `409 HORARIO_OCUPADO` se refrescan los huecos y
  se pide otro. Médico ausente: sus celdas aparecen bloqueadas.
- **Nota de consulta.** Autoguardado cada 10 s si hubo cambios y respaldo inmediato en
  `sessionStorage` (se borra cuando el servidor confirma); si al volver hay un respaldo más nuevo, se
  recupera. Finalizar exige diagnóstico y tratamiento y confirma en un diálogo propio.
- **Privacidad.** Nada clínico en `localStorage` (ESLint lo impide fuera de `lib/preferencias.ts`, que
  solo guarda el tema) ni en `console.log` (regla `no-console`).
- **Accesibilidad.** Etiquetas asociadas a todos los campos (`<Campo>`), `aria-invalid` y
  `aria-describedby` automáticos, avisos en región `aria-live`, foco visible, "Saltar al contenido",
  objetivos táctiles de 44 px, tablas y agenda con scroll propio (sin scroll horizontal de la página a
  400 px), tema oscuro por `prefers-color-scheme` y selector manual.

## Pruebas

- **Vitest (77 pruebas):** fechas, edad, IMC y alertas, horario, modelo de la agenda; y pantallas
  completas con router y guardas reales sobre MSW: agenda (agendar desde celda libre, 409,
  confirmar, llegada, error), triaje (alergia arriba, IMC en vivo, rangos en rojo, validación),
  cierre de consulta (obligatorios, diálogo, respaldo local, borrador, delegar), confirmación desde
  el enlace y guardas por rol. Corren con la fecha fijada (lunes 07:30 en Bogotá).
- **Playwright (`e2e/flujos.spec.ts`):** los tres flujos de §9 más la agenda a 400 px, contra la API
  con el seed. El flujo 1 necesita un hueco libre hoy para la médica general (la cola de enfermería
  es del día); si no lo hay, se omite con aviso. El flujo 2 firma el enlace del recordatorio con
  `CONFIRMACION_TOKEN_SECRET` (por defecto `cambiar`, el del `.env` de desarrollo).

## Decisiones y desviaciones respecto a FRONTEND.md

- **Repositorio independiente con npm**, como el backend: la app vive en la raíz y no en `apps/web`.
  Los esquemas compartidos se copian del backend a `src/shared` (`npm run sync:shared`) hasta que
  exista `packages/shared`.
- **Tipos de respuesta escritos a mano** (`src/api/tipos.ts`): el OpenAPI del backend documenta las
  entradas pero no las respuestas. `schema.d.ts` se genera igual; la ruta real del JSON es
  `/api/docs/openapi.json`.
- **Cuentas del seed:** las reales del backend (`medico.general@…`, `paciente@…`, contraseña
  `Demo2026medicita`), no las de la tabla de FRONTEND.md.
- **Componentes shadcn escritos a mano** sobre Radix con `class-variance-authority` (mismo resultado
  que el CLI). En formularios se usa `<select>` nativo: en tabletas y celulares abre el selector del
  sistema.
- **Carpetas añadidas en `features/`:** `acceso` (login y recuperación), `confirmacion` (`/c/:token`)
  y `consultorios`.
- **Encabezado de enfermería:** `GET /asignaciones` no trae el consultorio del médico; se toma de las
  citas de la cola cuando hay alguna.
- **Ficha del personal:** no existe `GET /personal/:id`; se usa la lista.
- **Bitácora:** la API devuelve identificadores de usuario y paciente (sin nombres), y así se muestran.

## Pendiente

- Correr los E2E contra la API real (necesitan Postgres y Redis del backend) y medir Lighthouse en
  `/agenda` (rendimiento ≥ 85, accesibilidad ≥ 95) y la carga con 3G rápido simulado.
- Pantalla para que el paciente edite su teléfono, email y canal preferido (`PATCH /pacientes/yo`):
  la API existe, pero no está en las rutas de §5.
- Texto de consentimiento según el país de lanzamiento (pendiente también en el backend).
