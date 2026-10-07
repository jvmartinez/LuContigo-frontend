# Arquitectura de MediCita Web

## 1. Visión general

MediCita Web es una aplicación de página única (SPA) desarrollada con React y TypeScript. Proporciona interfaces para recepción, enfermería, médicos, administración y pacientes. La interfaz está en español y consume la API de `LuContigo-backend`; este repositorio contiene el frontend, no la implementación del servidor.

La aplicación separa las responsabilidades en rutas y composición, autenticación, acceso a datos, funcionalidades por dominio, componentes compartidos y utilidades. Las páginas se cargan de forma diferida por ruta para reducir el código que se descarga al entrar a una sección.

## 2. Tecnologías

| Área | Tecnología | Uso |
| --- | --- | --- |
| Interfaz | React 18, React DOM | Componentes y vistas |
| Lenguaje | TypeScript 5, configuración estricta | Tipos para la aplicación y sus contratos |
| Desarrollo y empaquetado | Vite 8 | Servidor local y build de producción |
| Navegación | React Router 7 | Rutas, carga diferida y guardas |
| Datos remotos | TanStack Query 5 | Caché, consultas, mutaciones e invalidación |
| HTTP | ky | Cliente HTTP con credenciales, renovación de sesión y errores normalizados |
| Formularios y validación | React Hook Form, Zod | Estado de formularios y validación consistente con el contrato |
| Estilos | Tailwind CSS 3, PostCSS, tokens CSS | Diseño adaptable y temas |
| Componentes accesibles | Radix UI | Primitivas de diálogo, selectores, pestañas, alertas y notificaciones |
| Iconos y visualizaciones | Lucide React, Recharts | Iconografía y gráficos del panel de indicadores |
| Fechas | date-fns, date-fns-tz | Formato y operaciones de fecha considerando la zona horaria de la clínica |
| Pruebas | Vitest, Testing Library, jsdom, MSW, Playwright | Pruebas unitarias, de interfaz y de flujos end-to-end |

## 3. Estructura del código

```text
src/
  main.tsx                 Punto de entrada de la SPA
  app/
    router.tsx             Definición de rutas y carga diferida
    providers.tsx          Proveedores globales, incluyendo notificaciones
    query-client.ts        Configuración de TanStack Query
    tema.ts                Preferencia de tema claro, oscuro o sistema
    layout/                Estructura principal y menú por rol
  auth/
    sesion.tsx             Sesión, contexto de usuario y rol
    guardas.ts             Guardas y redirecciones de navegación
    rutas.ts               Acceso a secciones y destinos iniciales por rol
  api/
    client.ts              Cliente HTTP y normalización de errores
    token.ts               Access token en memoria y eventos de sesión
    tipos.ts               Tipos de respuestas de la API
    schema.d.ts            Tipos generados desde OpenAPI
    queries/               Consultas y mutaciones agrupadas por dominio
  features/                Páginas y lógica propia de cada funcionalidad
  components/
    ui/                    Componentes visuales reutilizables
                           y componentes clínicos compartidos
  shared/                  Esquemas Zod, enums y contrato compartido
  lib/                     Utilidades de fechas, edad, signos y formularios
  styles/                  Estilos globales y tokens de tema
  test/                    Configuración, utilidades y mocks de pruebas
e2e/                       Escenarios end-to-end de Playwright
```

`src/shared/` es una copia de los esquemas compartidos con el backend. Se sincroniza mediante `npm run sync:shared`; los cambios al contrato se realizan en el backend y luego se sincronizan, en vez de editar esta copia de forma independiente. `src/api/schema.d.ts` se genera desde el documento OpenAPI y no debe editarse manualmente.

## 4. Organización y flujo de datos

1. `src/main.tsx` inicializa la aplicación y el router.
2. `src/app/router.tsx` define las rutas públicas y privadas. Las páginas se importan de forma diferida.
3. Las rutas protegidas cargan la sesión y aplican las restricciones de rol antes de mostrar sus secciones.
4. Las páginas de `features/` usan hooks agrupados en `src/api/queries/` para consultar o modificar datos.
5. Las consultas y respuestas del servidor se administran con TanStack Query. Las mutaciones invalidan las claves relacionadas para mantener actualizadas las vistas.
6. Las peticiones pasan por `src/api/client.ts`, que centraliza credenciales, autorización y conversión de errores a `ErrorApi`.
7. Los componentes de `components/` y las utilidades de `lib/` ofrecen comportamiento y presentación reutilizables.

La URL base de la API se configura con `VITE_API_URL`; si no se define, el cliente usa `/api/v1`. La sesión se consulta en la API y se mantiene en la caché de TanStack Query. El access token se guarda en memoria; la cookie `httpOnly` de refresh la administra la API. Ante un `401`, el cliente coordina una renovación compartida y reintenta la solicitud; si la sesión ya no es válida, la aplicación redirige al inicio de sesión.

Los formularios se validan con esquemas Zod y React Hook Form. Los errores de validación recibidos de la API pueden asociarse a los campos correspondientes.

## 5. Autenticación, permisos y navegación

El menú y las guardas de rutas distinguen los siguientes roles:

| Rol | Secciones principales |
| --- | --- |
| Recepción (`RECEPCION`) | Agenda y pacientes |
| Enfermería (`ENFERMERA`) | Sala de espera y triaje |
| Médico (`MEDICO`) | Consultorio y atención de pacientes |
| Paciente (`PACIENTE`) | Citas e indicaciones |
| Administración (`ADMIN`) | Indicadores, personal, asignaciones, consultorios y bitácora |

Las rutas públicas incluyen inicio de sesión, recuperación y restablecimiento de contraseña, y confirmación de cita. Las rutas internas requieren sesión y, cuando corresponde, el rol permitido para la sección. Los destinos iniciales de cada rol se definen en `src/auth/rutas.ts`.

## 6. Funcionalidades

- **Acceso:** inicio de sesión, solicitud de recuperación y restablecimiento de contraseña.
- **Agenda:** vista diaria, búsqueda de pacientes, creación, detalle y reprogramación de citas, con disponibilidad consultada a la API.
- **Pacientes:** listado, registro y ficha de paciente.
- **Enfermería:** sala de espera y flujo de triaje, incluidos los signos vitales.
- **Consultorio:** atención, notas de consulta y delegación de tareas.
- **Portal del paciente:** consulta de citas, solicitud de cita e indicaciones.
- **Confirmación:** pantalla pública de confirmación de cita por enlace.
- **Administración:** indicadores, gestión del personal y horarios, asignaciones, consultorios y bitácora de auditoría.
- **Interfaz común:** estados de cita, alertas de alergia, signos vitales, línea de tiempo, selector de hora, diálogos, tablas, pestañas y notificaciones.
- **Preferencias:** tema automático, claro u oscuro; se conserva la preferencia visual, no información clínica.

La agenda y la atención clínica consideran la zona horaria de la clínica. Las notas de consulta contemplan autoguardado y respaldo temporal de borradores en `sessionStorage`, según la implementación de la funcionalidad de consulta.

## 7. Interfaz y accesibilidad

La interfaz utiliza clases de Tailwind y variables CSS para colores y tokens visuales. El layout adapta la navegación a escritorio y móvil, muestra un menú lateral en pantallas grandes y un menú desplegable en pantallas pequeñas. Se incluyen elementos de accesibilidad como etiquetas para controles, primitivas accesibles de Radix UI y un enlace para saltar al contenido principal.

## 8. Pruebas y calidad

- Las pruebas unitarias y de interfaz viven junto al código con extensión `.test.ts` o `.test.tsx` y se ejecutan con Vitest.
- MSW simula la API en pruebas y en el modo de demostración (`npm run dev:mock`).
- Los flujos end-to-end están en `e2e/` y usan Playwright contra la API configurada para ese entorno.
- ESLint incluye reglas para React y accesibilidad; TypeScript y Prettier forman parte de los comandos de validación.

## 9. Desarrollo y comandos

Requisito: Node.js 20 o superior. Configura `VITE_API_URL` para apuntar al backend disponible antes de iniciar el modo normal.

| Comando | Descripción |
| --- | --- |
| `npm install` | Instala dependencias |
| `npm run dev` | Inicia Vite para desarrollo con la API |
| `npm run dev:mock` | Inicia la aplicación con una API simulada por MSW |
| `npm run build` | Ejecuta la compilación de TypeScript y genera el build |
| `npm run preview` | Sirve localmente el build de producción |
| `npm run typecheck` | Comprueba los tipos de TypeScript |
| `npm run lint` | Ejecuta ESLint |
| `npm run format:check` | Comprueba formato con Prettier |
| `npm test` | Ejecuta pruebas unitarias y de interfaz |
| `npm run test:e2e` | Ejecuta los escenarios Playwright |
| `npm run gen:api` | Regenera tipos a partir del documento OpenAPI disponible |
| `npm run sync:shared` | Sincroniza los esquemas compartidos desde el backend |

El modo mock utiliza datos ficticios en memoria; al recargar, vuelve al estado inicial. El modo normal requiere que la API de backend esté disponible.
