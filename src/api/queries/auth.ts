import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, refrescarToken } from '../client';
import { ErrorApi } from '../errores';
import type { RespuestaLogin, Sesion } from '../tipos';
import { tokenAcceso } from '../token';
import { claves } from './claves';

/**
 * Carga la sesión desde GET /auth/yo. Sin access token en memoria (recarga de página) intenta
 * antes el refresh con la cookie; si no hay sesión devuelve `null` en lugar de fallar.
 */
export async function cargarSesion(): Promise<Sesion | null> {
  if (!tokenAcceso.obtener() && !(await refrescarToken())) return null;
  try {
    return await api.get<Sesion>('auth/yo');
  } catch (e) {
    if (e instanceof ErrorApi && e.codigo === 'NO_AUTENTICADO') return null;
    throw e;
  }
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: { email: string; password: string }) => {
      const r = await api.post<RespuestaLogin>('auth/login', datos);
      tokenAcceso.guardar(r.accessToken);
      return api.get<Sesion>('auth/yo');
    },
    onSuccess: (sesion) => {
      // Una sesión nueva no hereda datos de la anterior.
      qc.clear();
      qc.setQueryData(claves.sesion, sesion);
    },
  });
}

export async function cerrarSesion(): Promise<void> {
  try {
    await api.post('auth/logout');
  } finally {
    tokenAcceso.guardar(null);
  }
}

export function useOlvideContrasena() {
  return useMutation({
    mutationFn: (datos: { email: string }) => api.post<void>('auth/olvide-contrasena', datos),
  });
}

export function useRestablecerContrasena() {
  return useMutation({
    mutationFn: (datos: { token: string; password: string }) =>
      api.post<void>('auth/restablecer-contrasena', datos),
  });
}
