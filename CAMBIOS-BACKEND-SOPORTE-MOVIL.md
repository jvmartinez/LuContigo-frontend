# Cambios del backend por soporte móvil: impacto en la web

Fecha: 2026-10-03. Origen: cambios en `LuContigo-backend` (aún sin commit) para la app móvil.

## Resumen

La web **no necesita cambios funcionales**: login, refresh con cookie `mc_refresh`, logout con
cuerpo vacío, `GET /auth/yo` y los formatos de error se mantienen igual.

Solo hay un paso **obligatorio por convención** del proyecto ([ARQUITECTURA.md](./ARQUITECTURA.md)):
el contrato cambió en el backend, así que hay que sincronizar `src/shared` y regenerar
`src/api/schema.d.ts`.

## Obligatorio: sincronizar el contrato

1. Cuando el cambio del backend esté integrado:

   ```bash
   npm run sync:shared
   npm run gen:api   # con la API levantada en http://localhost:3000
   ```

2. Archivos que cambian en `src/shared` (solo se añaden exportaciones; no se modifica ni elimina
   ninguna existente):

   | Archivo | Nuevo |
   | --- | --- |
   | `auth.ts` | `LogoutEntrada` (`refreshToken?`, `dispositivoToken?`), `TokensSalida`, `UsuarioActualSalida` |
   | `pacientes.ts` | `PacienteSalida`, `MisIndicacionesSalida` |
   | `errores.ts` | `ErrorSalida` (esquema Zod de `{ error: { codigo, mensaje, detalles? } }`); ahora importa `zod` |

3. `schema.d.ts` incorporará:
   - `GET /api/v1/pacientes/yo` (nuevo).
   - `dispositivoToken` opcional en el cuerpo de `POST /api/v1/auth/logout`.
   - Esquemas de respuesta y errores en auth, dispositivos y `/pacientes/yo*`, que antes no tenían
     tipo de respuesta.

4. Verificar: `npm run typecheck`, `npm test`, `npm run lint`.

Se simuló `sync:shared` en una copia del proyecto: los 86 tests de Vitest pasan y `tsc` no reporta
errores nuevos (los dos de `src/main.tsx` y `vite.config.ts` ya existían).

## Opcional: aprovechar `GET /pacientes/yo`

El portal del paciente no tiene pantalla de "Mis datos". Ahora existe lectura de los datos propios
(teléfono, email, canal preferido, etc.), que junto con el `PATCH /pacientes/yo` ya existente
permite construirla. Es una mejora de producto, no un requisito.

`PacienteSalida` también incluye documento, fecha de nacimiento, alergias, antecedentes, seguro y
consentimiento, además de contacto y canal preferido. Es información personal y clínica sensible:
antes de diseñar «Mis datos», confirmar con producto y backend qué campos necesita el flujo y si
corresponde una respuesta más acotada. La existencia del contrato no obliga a exponer todos los
campos en una pantalla.

| Endpoint | Rol | Respuesta |
| --- | --- | --- |
| `GET /pacientes/yo` | `PACIENTE` (otros roles: `403 SIN_PERMISO`) | `PacienteSalida` |
| `PATCH /pacientes/yo` | `PACIENTE` | `PacienteSalida` (sin cambios) |

## Sin impacto en la web

- `dispositivoToken` en logout y `POST/DELETE /dispositivos`: solo app móvil (push FCM).
- `citaId` en los datos de la notificación push de recordatorio: solo app móvil.
- Los enlaces de email (invitación, restablecer contraseña, confirmación) siguen apuntando a
  `APP_WEB_URL`; las rutas web `/restablecer/:token` y `/c/:token` no cambian.
  `POST /auth/restablecer-contrasena` es el endpoint de la API, no la ruta de la pantalla web.
- Configuración de Jest del backend: solo pruebas.

## Aplicación y verificación en el frontend

Se ejecutaron `npm run sync:shared` desde el backend local y `npm run gen:api` contra la API
disponible en `http://localhost:3000`. Antes de generar se comprobó que OpenAPI incluía
`GET /api/v1/pacientes/yo` y el contrato actualizado de logout. La fuente backend continúa
con cambios sin commit; esta sincronización local no acredita su integración ni despliegue.

- Se actualizaron `src/shared/auth.ts`, `src/shared/pacientes.ts`, `src/shared/errores.ts` y
  `src/api/schema.d.ts` mediante los scripts existentes, sin edición manual de contratos.
- `npm test`: 86 pruebas aprobadas en 14 archivos.
- `npm run lint`: sin errores; 14 advertencias en archivos ajenos a esta sincronización.
- `npm run typecheck`: permanecen los dos errores conocidos de `src/main.tsx` y `vite.config.ts`,
  sin nuevos errores reportados.
- No se modificaron login, refresh, logout ni pantallas del portal; «Mis datos» sigue siendo
  una capacidad opcional, no implementada.
