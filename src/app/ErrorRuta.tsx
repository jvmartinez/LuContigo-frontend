import { useQueryClient } from '@tanstack/react-query';
import { Lock, SearchX, TriangleAlert } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { claves } from '@/api/queries/claves';
import type { Sesion } from '@/api/tipos';
import { SIN_ACCESO } from '@/auth/guardas';
import { RUTA_INICIO } from '@/auth/rutas';
import { Button } from '@/components/ui/button';

function Pantalla({
  icono,
  titulo,
  texto,
}: {
  icono: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  const qc = useQueryClient();
  const sesion = qc.getQueryData<Sesion | null>(claves.sesion);
  const inicio = sesion ? RUTA_INICIO[sesion.rol] : '/login';
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center"
    >
      <span className="text-muted">{icono}</span>
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <p className="text-muted">{texto}</p>
      <Button asChild className="mt-2">
        <Link to={inicio}>Ir a mi pantalla principal</Link>
      </Button>
    </div>
  );
}

export function NoEncontrada() {
  return (
    <Pantalla
      icono={<SearchX className="size-10" aria-hidden />}
      titulo="Esta página no existe"
      texto="Revisa la dirección o vuelve a tu pantalla principal."
    />
  );
}

export function ErrorRuta() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === SIN_ACCESO) {
    return (
      <Pantalla
        icono={<Lock className="size-10" aria-hidden />}
        titulo="No tienes acceso a esta pantalla"
        texto="Tu rol no puede abrirla. Si crees que es un error, pide el acceso a administración."
      />
    );
  }
  if (isRouteErrorResponse(error) && error.status === 404) return <NoEncontrada />;
  console.error(error instanceof Error ? error.message : 'Error de ruta');
  return (
    <Pantalla
      icono={<TriangleAlert className="size-10 text-crit" aria-hidden />}
      titulo="Algo salió mal"
      texto="Ocurrió un error al abrir esta pantalla. Recarga la página; si sigue pasando, avisa a soporte."
    />
  );
}
