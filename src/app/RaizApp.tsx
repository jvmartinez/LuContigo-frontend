import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom';
import { claves } from '@/api/queries/claves';
import { alExpirarSesion } from '@/api/token';

const PUBLICAS = /^\/(login|olvide-contrasena|restablecer|c\/)/;

/** Raíz del router: vuelve a /login cuando el refresh del token falla. */
export function RaizApp() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(
    () =>
      alExpirarSesion(() => {
        if (PUBLICAS.test(pathname)) return;
        qc.clear();
        qc.setQueryData(claves.sesion, null);
        const siguiente = encodeURIComponent(pathname + search);
        navigate(`/login?expirada=1&siguiente=${siguiente}`, { replace: true });
      }),
    [qc, navigate, pathname, search],
  );

  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
