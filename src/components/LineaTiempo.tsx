import { Activity, ClipboardCheck, Stethoscope } from 'lucide-react';
import type { EventoHistorial } from '@/api/tipos';
import { fechaHoraCorta } from '@/lib/fechas';
import { etiquetaAlerta } from '@/lib/signos';
import { EstadoCita } from './EstadoCita';
import { Vacio } from './ui/estados';

function Signos({ s }: { s: NonNullable<EventoHistorial['signosVitales']> }) {
  const partes = [
    s.presionSistolica !== null && `PA ${s.presionSistolica}/${s.presionDiastolica}`,
    s.frecuenciaCardiaca !== null && `FC ${s.frecuenciaCardiaca}`,
    s.temperatura !== null && `T ${s.temperatura.toFixed(1)} °C`,
    s.spo2 !== null && `SpO₂ ${s.spo2}%`,
    s.pesoKg !== null && `${s.pesoKg} kg`,
    s.imc !== null && `IMC ${s.imc.toFixed(1)}`,
  ].filter(Boolean);
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <Activity className="size-4 text-muted" aria-label="Signos vitales" />
      <span className="font-mono">{partes.join(' · ')}</span>
      {s.alertas.map((a) => (
        <span key={a} className="text-xs font-bold text-crit">
          {etiquetaAlerta(a)}
        </span>
      ))}
    </p>
  );
}

/** Historial clínico del paciente, del más reciente al más antiguo. */
export function LineaTiempo({
  eventos,
  zona,
  excluirCitaId,
}: {
  eventos: EventoHistorial[];
  zona: string;
  excluirCitaId?: string;
}) {
  const lista = eventos.filter((e) => e.citaId !== excluirCitaId);
  if (lista.length === 0) {
    return (
      <Vacio
        titulo="Sin consultas anteriores"
        descripcion="Esta es la primera atención registrada."
      />
    );
  }
  return (
    <ol className="relative flex flex-col gap-4 border-l-2 border-line pl-5">
      {lista.map((e) => (
        <li key={e.citaId} className="relative">
          <span
            aria-hidden
            className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-surface bg-accent"
          />
          <div className="flex flex-wrap items-center gap-2">
            <time dateTime={e.fecha} className="font-mono text-sm font-medium">
              {fechaHoraCorta(e.fecha, zona)}
            </time>
            <EstadoCita estado={e.estado} />
          </div>
          <p className="text-sm text-muted">
            {e.medico.nombre}
            {e.medico.especialidad && ` · ${e.medico.especialidad}`}
          </p>
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3">
            {e.signosVitales && <Signos s={e.signosVitales} />}
            {e.consulta ? (
              <div className="flex flex-col gap-1 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <Stethoscope className="size-4 text-muted" aria-hidden />
                  {e.consulta.diagnostico ?? 'Sin diagnóstico'}
                  {e.consulta.cie10 && (
                    <span className="font-mono text-xs text-muted">{e.consulta.cie10}</span>
                  )}
                  {!e.consulta.cerradaEn && (
                    <span className="text-xs font-normal text-warn">(borrador)</span>
                  )}
                </p>
                {e.consulta.motivo && (
                  <p>
                    <span className="text-muted">Motivo:</span> {e.consulta.motivo}
                  </p>
                )}
                {e.consulta.tratamiento && (
                  <p>
                    <span className="text-muted">Tratamiento:</span> {e.consulta.tratamiento}
                  </p>
                )}
                {e.consulta.indicaciones && (
                  <p>
                    <span className="text-muted">Indicaciones:</span> {e.consulta.indicaciones}
                  </p>
                )}
              </div>
            ) : (
              !e.signosVitales && <p className="text-sm text-muted">Sin registros clínicos.</p>
            )}
            {e.tareas.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {e.tareas.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <ClipboardCheck className="size-4 text-muted" aria-hidden />
                    {t.tipo}
                    {t.detalle && <span className="text-muted">— {t.detalle}</span>}
                    <span
                      className={t.estado === 'HECHA' ? 'text-xs text-good' : 'text-xs text-warn'}
                    >
                      {t.estado === 'HECHA'
                        ? 'Hecha'
                        : t.estado === 'PENDIENTE'
                          ? 'Pendiente'
                          : 'Cancelada'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
