import { ClipboardList } from 'lucide-react';
import { useMisIndicaciones } from '@/api/queries/pacientes';
import { useUsuario } from '@/auth/sesion';
import { Card, EncabezadoPagina } from '@/components/ui/card';
import { ErrorEstado, Esqueleto, Vacio } from '@/components/ui/estados';
import { fechaLarga } from '@/lib/fechas';

/**
 * Indicaciones de los médicos (RF-12), de la más reciente a la más antigua. La API solo
 * devuelve indicaciones: el paciente nunca ve notas internas ni el examen físico.
 */
export default function IndicacionesPage() {
  const { zona } = useUsuario();
  const indicaciones = useMisIndicaciones();
  const lista = [...(indicaciones.data ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina
        titulo="Mis indicaciones"
        descripcion="Lo que te recomendaron tus médicos en cada consulta."
      />
      {indicaciones.isPending ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Cargando indicaciones">
          <Esqueleto className="h-28" />
          <Esqueleto className="h-28" />
        </div>
      ) : indicaciones.isError ? (
        <ErrorEstado error={indicaciones.error} reintentar={() => indicaciones.refetch()} />
      ) : lista.length === 0 ? (
        <Vacio
          icono={<ClipboardList className="size-8" aria-hidden />}
          titulo="Aún no tienes indicaciones"
          descripcion="Después de cada consulta, las indicaciones de tu médico aparecerán aquí."
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {lista.map((i) => (
            <li key={i.citaId}>
              <Card className="p-4">
                <p className="font-display text-lg font-bold first-letter:uppercase">
                  <time dateTime={i.fecha}>{fechaLarga(i.fecha, zona)}</time>
                </p>
                <p className="text-sm text-muted">
                  {i.medico}
                  {i.especialidad && ` · ${i.especialidad}`}
                </p>
                <p className="mt-3 whitespace-pre-line">
                  {i.indicaciones?.trim() || (
                    <span className="text-muted">
                      El médico no dejó indicaciones en esta consulta.
                    </span>
                  )}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
