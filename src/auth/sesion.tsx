import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { cargarSesion, cerrarSesion } from '@/api/queries/auth';
import { claves } from '@/api/queries/claves';
import type { Sesion } from '@/api/tipos';
import type { Rol } from '@/shared/enums';

export const consultaSesion = {
  queryKey: claves.sesion,
  queryFn: cargarSesion,
  staleTime: Infinity,
  retry: false,
} as const;

/** Usado por los `loader` del router: carga la sesión una sola vez y la deja en caché. */
export function asegurarSesion(qc: QueryClient): Promise<Sesion | null> {
  return qc.ensureQueryData(consultaSesion);
}

interface ContextoSesion {
  usuario: Sesion;
  rol: Rol;
  /** Zona horaria IANA de la clínica: toda fecha se muestra en ella. */
  zona: string;
  nombre: string;
  salir: () => Promise<void>;
}

const Contexto = createContext<ContextoSesion | null>(null);

/**
 * Sesión (usuario, rol y clínica) cargada desde GET /auth/yo. El dato vive en TanStack Query;
 * el contexto solo lo expone con una forma cómoda. Se monta detrás de la guarda de sesión.
 */
export function SesionProvider({
  children,
  alSalir,
}: {
  children: ReactNode;
  alSalir: () => void;
}) {
  const qc = useQueryClient();
  const { data: usuario } = useQuery(consultaSesion);

  const salir = useCallback(async () => {
    try {
      await cerrarSesion();
    } finally {
      qc.clear();
      alSalir();
    }
  }, [qc, alSalir]);

  const valor = useMemo<ContextoSesion | null>(
    () =>
      usuario
        ? {
            usuario,
            rol: usuario.rol,
            zona: usuario.clinica.zonaHoraria,
            nombre:
              usuario.personal?.nombre ??
              (usuario.paciente
                ? `${usuario.paciente.nombres} ${usuario.paciente.apellidos}`
                : usuario.email),
            salir,
          }
        : null,
    [usuario, salir],
  );

  if (!valor) return null;
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useUsuario(): ContextoSesion {
  const c = useContext(Contexto);
  if (!c) throw new Error('useUsuario se usa dentro de <SesionProvider>');
  return c;
}

export const useZona = () => useUsuario().zona;

/** Muestra su contenido solo a los roles indicados. */
export function RequiereRol({
  roles,
  children,
  alternativa = null,
}: {
  roles: readonly Rol[];
  children: ReactNode;
  alternativa?: ReactNode;
}) {
  const { rol } = useUsuario();
  return <>{roles.includes(rol) ? children : alternativa}</>;
}
