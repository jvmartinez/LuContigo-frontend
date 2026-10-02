import type { QueryClient } from '@tanstack/react-query';
import { redirect, type LoaderFunctionArgs } from 'react-router-dom';
import type { Rol } from '@/shared/enums';
import { RUTA_INICIO } from './rutas';
import { asegurarSesion } from './sesion';

/** Error de ruta que la pantalla de error muestra como "sin acceso" sin cambiar la URL. */
export const SIN_ACCESO = 403;

/**
 * `loader` de las rutas protegidas: sin sesión redirige a /login (recordando a dónde iba);
 * con un rol que no corresponde responde 403 y se muestra la pantalla de "sin acceso".
 */
export function requiereSesion(qc: QueryClient, roles?: readonly Rol[]) {
  return async ({ request }: LoaderFunctionArgs) => {
    const sesion = await asegurarSesion(qc);
    if (!sesion) {
      const url = new URL(request.url);
      const siguiente = url.pathname + url.search;
      throw redirect(`/login?siguiente=${encodeURIComponent(siguiente)}`);
    }
    if (roles && !roles.includes(sesion.rol)) {
      throw new Response('Sin acceso', { status: SIN_ACCESO, statusText: 'Sin acceso' });
    }
    return null;
  };
}

/** `/` lleva a la pantalla principal del rol. */
export function redirigirAInicio(qc: QueryClient) {
  return async () => {
    const sesion = await asegurarSesion(qc);
    return redirect(sesion ? RUTA_INICIO[sesion.rol] : '/login');
  };
}

/** Las pantallas de acceso no se muestran a quien ya inició sesión. */
export function soloInvitados(qc: QueryClient) {
  return async () => {
    const sesion = await asegurarSesion(qc).catch(() => null);
    return sesion ? redirect(RUTA_INICIO[sesion.rol]) : null;
  };
}
