import { Link, useParams } from 'react-router-dom';
import { useAgenda } from '@/api/queries/citas';
import type { Cita } from '@/api/tipos';
import { useUsuario } from '@/auth/sesion';
import { EstadoCita } from '@/components/EstadoCita';
import { ErrorEstado, Esqueleto, Vacio } from '@/components/ui/estados';
import { cn } from '@/lib/cn';
import { etiquetaDia, horaEn, hoyEn } from '@/lib/fechas';
import type { EstadoCita as Estado } from '@/shared/enums';
import { DetalleConsulta } from './DetalleConsulta';

const PRIORIDAD: Estado[] = ['EN_CONSULTA', 'LISTA', 'EN_ESPERA'];

/** Por defecto se abre la cita EN_CONSULTA, luego la LISTA y luego la EN_ESPERA (§6). */
export function citaPorDefecto(citas: Cita[]): Cita | undefined {
  for (const estado of PRIORIDAD) {
    const c = citas.find((x) => x.estado === estado);
    if (c) return c;
  }
  return undefined;
}

export default function ConsultorioPage() {
  const { citaId } = useParams();
  const { zona, usuario } = useUsuario();
  const hoy = hoyEn(zona);
  const agenda = useAgenda(hoy);
  const citas = [...(agenda.data?.citas ?? [])].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const elegida = citaId ? citas.find((c) => c.id === citaId) : citaPorDefecto(citas);

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <section aria-labelledby="titulo-dia" className={cn(citaId && 'hidden lg:block')}>
        <h1 id="titulo-dia" className="text-2xl font-bold">
          Pacientes de hoy
        </h1>
        <p className="mb-3 text-sm text-muted first-letter:uppercase">
          {etiquetaDia(hoy)}
          {usuario.personal?.consultorio && ` · ${usuario.personal.consultorio}`}
        </p>
        {agenda.isPending ? (
          <div className="flex flex-col gap-2" role="status" aria-label="Cargando pacientes">
            {[0, 1, 2, 3].map((i) => (
              <Esqueleto key={i} className="h-16" />
            ))}
          </div>
        ) : agenda.isError ? (
          <ErrorEstado error={agenda.error} reintentar={() => agenda.refetch()} />
        ) : citas.length === 0 ? (
          <Vacio titulo="Sin pacientes hoy" descripcion="No tienes citas agendadas para hoy." />
        ) : (
          <nav aria-label="Citas del día">
            <ul className="flex flex-col gap-1.5">
              {citas.map((c) => {
                const activa = c.id === elegida?.id;
                return (
                  <li key={c.id}>
                    <Link
                      to={`/consultorio/${c.id}`}
                      aria-current={activa ? 'page' : undefined}
                      className={cn(
                        'flex min-h-tap items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                        activa
                          ? 'border-accent bg-accent-soft'
                          : 'border-line bg-surface hover:bg-surface-2',
                        (c.estado === 'CANCELADA' || c.estado === 'NO_ASISTIO') && 'opacity-60',
                      )}
                    >
                      <span className="font-mono text-sm font-medium">
                        {horaEn(c.inicio, zona)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {c.paciente.apellidos}, {c.paciente.nombres}
                        </span>
                        <EstadoCita estado={c.estado} className="mt-0.5" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </section>

      <section aria-label="Detalle de la consulta" className={cn(!citaId && 'hidden lg:block')}>
        {agenda.isPending ? (
          <Esqueleto className="h-96" />
        ) : elegida ? (
          <DetalleConsulta key={elegida.id} cita={elegida} zona={zona} />
        ) : citaId ? (
          <Vacio
            titulo="No encontramos esta cita en tu agenda de hoy"
            accion={
              <Link to="/consultorio" className="font-medium text-accent hover:underline">
                Ver pacientes de hoy
              </Link>
            }
          />
        ) : (
          citas.length > 0 && (
            <Vacio
              titulo="Nadie en sala por ahora"
              descripcion="Elige un paciente de la lista para ver su ficha."
            />
          )
        )}
      </section>
    </div>
  );
}
