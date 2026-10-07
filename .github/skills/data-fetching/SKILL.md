---
name: data-fetching
description: >
  Guía de MediCita para consultas, mutaciones, claves e invalidación con TanStack Query y el cliente
  API centralizado. Úsala al cambiar la carga o actualización de datos del servidor.
---

# Consultas y mutaciones de datos

## Convenciones del proyecto

- Revisa primero `src/api/queries/` y reutiliza sus hooks, tipos y patrones de invalidación.
- Todas las peticiones pasan por `api` desde `src/api/client.ts`. Usa `api.get<T>(ruta, parametros)`,
  `api.post<T>(ruta, cuerpo)`, `api.put<T>`, `api.patch<T>` o `api.delete<T>`; el wrapper devuelve
  directamente el dato tipado. No encadenes `.json()` ni crees otra instancia de `ky`.
- Declara y reutiliza claves desde `src/api/queries/claves.ts` (`claves`). Respeta la jerarquía de
  prefijos de los recursos para que `invalidateQueries` alcance todas las vistas relacionadas.
- Usa `useQuery` para lecturas y `useMutation` para cambios. Después de una mutación, invalida las
  consultas realmente afectadas; reutiliza `invalidarCitas` para cambios de citas cuando aplique.
- Usa tipos de `src/api/tipos.ts`, esquemas compartidos de `src/shared/` y tipos OpenAPI generados
  cuando correspondan. No inventes endpoints, contratos ni errores.
- Los errores se normalizan como `ErrorApi` (`codigo`, no `code`). Conserva el error para que la
  interfaz pueda mostrar el estado y mensaje adecuados; no uses fallbacks con forma de éxito.
- Respeta las políticas de sesión del cliente central, la zona horaria de la clínica y las reglas de
  permisos de la aplicación.

## Verificación

Comprueba los hooks afectados y las invalidaciones; ejecuta pruebas del dominio o de pantalla y el
typecheck cuando estén disponibles.
