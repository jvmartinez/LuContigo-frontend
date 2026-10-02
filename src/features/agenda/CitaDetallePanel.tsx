import { Bell, CalendarClock, CheckCircle2, DoorOpen, UserX, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mensajeDeError } from '@/api/errores';
import { useCita, useTransicionCita, type AccionSimple } from '@/api/queries/citas';
import type { CitaDetalle } from '@/api/tipos';
import { CancelarCitaDialog } from '@/components/CancelarCitaDialog';
import { ETIQUETA_ESTADO, EstadoCita } from '@/components/EstadoCita';
import { Button } from '@/components/ui/button';
import { Cargando, ErrorEstado } from '@/components/ui/estados';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { aviso } from '@/components/ui/toast';
import { fechaHoraCorta, fechaLarga, horaEn } from '@/lib/fechas';
import { ReprogramarCitaDialog } from './ReprogramarCitaDialog';

const CANAL: Record<string, string> = {
  RECEPCION: 'Recepción',
  TELEFONO: 'Teléfono',
  PORTAL_WEB: 'Portal web',
  APP_MOVIL: 'App móvil',
  EMAIL: 'email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  PUSH: 'notificación',
};

const EXITO: Record<AccionSimple, string> = {
  confirmar: 'Cita confirmada',
  llegada: 'Llegada registrada: el paciente pasó a sala de espera',
  'no-asistio': 'Cita marcada como no asistida',
  iniciar: 'Consulta iniciada',
};

/** Acciones de recepción según el estado (máquina de estados, BACKEND.md §6). */
function accionesPara(cita: CitaDetalle, ahora = new Date()) {
  const abierta = cita.estado === 'PROGRAMADA' || cita.estado === 'CONFIRMADA';
  return {
    confirmar: cita.estado === 'PROGRAMADA',
    llegada: abierta,
    noAsistio: abierta && new Date(cita.inicio) <= ahora,
    reprogramar: abierta,
    cancelar: abierta,
  };
}

function Detalle({ cita, zona }: { cita: CitaDetalle; zona: string }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-line bg-surface-2 p-4">
        <p className="font-display text-lg font-bold first-letter:uppercase">
          {fechaLarga(cita.inicio, zona)}
        </p>
        <p className="font-mono text-2xl font-medium">
          {horaEn(cita.inicio, zona)}–{horaEn(cita.fin, zona)}
        </p>
        <p className="mt-1">
          {cita.medico.nombre}
          {cita.medico.especialidad && (
            <span className="text-muted"> · {cita.medico.especialidad}</span>
          )}
        </p>
        <p className="text-sm text-muted">{cita.consultorio.nombre}</p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Documento</dt>
        <dd className="font-mono">{cita.paciente.documento}</dd>
        <dt className="text-muted">Motivo</dt>
        <dd>{cita.motivo || <span className="text-muted">Sin motivo registrado</span>}</dd>
        <dt className="text-muted">Agendada por</dt>
        <dd>{CANAL[cita.canalOrigen] ?? cita.canalOrigen}</dd>
        {cita.motivoCancelacion && (
          <>
            <dt className="text-muted">Cancelación</dt>
            <dd>{cita.motivoCancelacion}</dd>
          </>
        )}
        {cita.recordatorio && (
          <>
            <dt className="text-muted">Recordatorio</dt>
            <dd className="flex items-center gap-1.5">
              <Bell className="size-3.5 text-muted" aria-hidden />
              {CANAL[cita.recordatorio.canal] ?? cita.recordatorio.canal} ·{' '}
              {fechaHoraCorta(cita.recordatorio.programadoPara, zona)}
              {cita.recordatorio.estado === 'FALLIDO' && (
                <span className="font-semibold text-crit"> — falló, llama al paciente</span>
              )}
            </dd>
          </>
        )}
      </dl>

      {cita.historialEstados.length > 0 && (
        <section aria-labelledby="historial-estados">
          <h3 id="historial-estados" className="mb-2 font-sans text-sm font-bold">
            Historial de estados
          </h3>
          <ol className="flex flex-col gap-1.5 text-sm">
            {cita.historialEstados.map((h, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <time dateTime={h.fecha} className="font-mono text-xs text-muted">
                  {fechaHoraCorta(h.fecha, zona)}
                </time>
                {h.de ? `${ETIQUETA_ESTADO[h.de]} → ` : 'Creada como '}
                {ETIQUETA_ESTADO[h.a]}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

/** Panel de detalle de una cita en la agenda con las acciones que admite su estado. */
export function CitaDetallePanel({
  citaId,
  zona,
  alCerrar,
}: {
  citaId: string | null;
  zona: string;
  alCerrar: () => void;
}) {
  const consulta = useCita(citaId ?? undefined);
  const transicion = useTransicionCita();
  const [cancelando, setCancelando] = useState(false);
  const [reprogramando, setReprogramando] = useState(false);
  const cita = consulta.data;

  const ejecutar = (accion: AccionSimple) =>
    cita &&
    transicion.mutate(
      { id: cita.id, accion },
      {
        onSuccess: () => aviso.exito(EXITO[accion]),
        onError: (e) => aviso.error('No se pudo completar la acción', mensajeDeError(e)),
      },
    );

  const acciones = cita ? accionesPara(cita) : null;
  const ocupado = transicion.isPending;

  return (
    <Sheet open={Boolean(citaId)} onOpenChange={(abierto) => !abierto && alCerrar()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {cita ? `${cita.paciente.nombres} ${cita.paciente.apellidos}` : 'Detalle de la cita'}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex items-center gap-2">
              {cita ? <EstadoCita estado={cita.estado} /> : 'Cargando…'}
              {cita && (
                <Link
                  to={`/pacientes/${cita.pacienteId}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Ver ficha del paciente
                </Link>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {consulta.isPending && <Cargando />}
          {consulta.isError && (
            <ErrorEstado error={consulta.error} reintentar={() => consulta.refetch()} />
          )}
          {cita && <Detalle cita={cita} zona={zona} />}
        </SheetBody>
        {cita && acciones && Object.values(acciones).some(Boolean) && (
          <SheetFooter>
            {acciones.confirmar && (
              <Button
                variante="secundario"
                disabled={ocupado}
                cargando={ocupado && transicion.variables?.accion === 'confirmar'}
                onClick={() => ejecutar('confirmar')}
              >
                <CheckCircle2 aria-hidden /> Confirmar
              </Button>
            )}
            {acciones.llegada && (
              <Button
                disabled={ocupado}
                cargando={ocupado && transicion.variables?.accion === 'llegada'}
                onClick={() => ejecutar('llegada')}
              >
                <DoorOpen aria-hidden /> Registrar llegada
              </Button>
            )}
            {acciones.reprogramar && (
              <Button
                variante="secundario"
                disabled={ocupado}
                onClick={() => setReprogramando(true)}
              >
                <CalendarClock aria-hidden /> Reprogramar
              </Button>
            )}
            {acciones.noAsistio && (
              <Button
                variante="secundario"
                disabled={ocupado}
                cargando={ocupado && transicion.variables?.accion === 'no-asistio'}
                onClick={() => ejecutar('no-asistio')}
              >
                <UserX aria-hidden /> No asistió
              </Button>
            )}
            {acciones.cancelar && (
              <Button
                variante="peligro-suave"
                disabled={ocupado}
                onClick={() => setCancelando(true)}
              >
                <XCircle aria-hidden /> Cancelar
              </Button>
            )}
          </SheetFooter>
        )}
        {cita && (
          <>
            <CancelarCitaDialog
              citaId={cita.id}
              descripcion={`${cita.paciente.nombres} ${cita.paciente.apellidos}, ${fechaHoraCorta(cita.inicio, zona)} con ${cita.medico.nombre}.`}
              abierto={cancelando}
              alCambiar={setCancelando}
            />
            <ReprogramarCitaDialog
              key={cita.id}
              cita={cita}
              zona={zona}
              abierto={reprogramando}
              alCambiar={setReprogramando}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
