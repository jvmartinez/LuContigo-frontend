import { CalendarCheck2, CalendarX2, LinkIcon, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { esErrorApi, mensajeDeError } from '@/api/errores';
import { useAccionConfirmacion, useConfirmacion } from '@/api/queries/citas';
import { EstadoCita } from '@/components/EstadoCita';
import { Confirmar } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Alerta, Cargando } from '@/components/ui/estados';
import { fechaLarga, horaEn } from '@/lib/fechas';
import { PantallaAcceso } from '../acceso/PantallaAcceso';

/** Enlace del recordatorio (`/c/:token`): confirmar o cancelar sin iniciar sesión (RF-04). */
export default function ConfirmacionPage() {
  const { token = '' } = useParams();
  const consulta = useConfirmacion(token);
  const accion = useAccionConfirmacion(token);
  const [confirmarCancelacion, setConfirmarCancelacion] = useState(false);

  if (consulta.isPending) {
    return (
      <PantallaAcceso titulo="Tu cita">
        <Cargando texto="Buscando tu cita…" />
      </PantallaAcceso>
    );
  }

  if (consulta.isError) {
    const vencido = esErrorApi(consulta.error, 'TOKEN_INVALIDO');
    return (
      <PantallaAcceso titulo={vencido ? 'Este enlace ya no es válido' : 'No pudimos abrir tu cita'}>
        <div className="flex flex-col items-center gap-3 text-center">
          <LinkIcon className="size-10 text-muted" aria-hidden />
          <p role="alert">
            {vencido
              ? `${mensajeDeError(consulta.error)} Si necesitas cambiar tu cita, llama a la clínica o entra al portal de pacientes.`
              : mensajeDeError(consulta.error)}
          </p>
          {!vencido && (
            <Button variante="secundario" onClick={() => consulta.refetch()}>
              Reintentar
            </Button>
          )}
        </div>
      </PantallaAcceso>
    );
  }

  const { cita, accionesDisponibles } = consulta.data;
  const zona = cita.clinica.zonaHoraria;

  if (accion.isSuccess) {
    const confirmada = accion.data.estado === 'CONFIRMADA';
    return (
      <PantallaAcceso
        titulo={confirmada ? '¡Listo, tu cita está confirmada!' : 'Tu cita fue cancelada'}
      >
        <div role="status" className="flex flex-col items-center gap-3 text-center">
          {confirmada ? (
            <CalendarCheck2 className="size-12 text-good" aria-hidden />
          ) : (
            <CalendarX2 className="size-12 text-muted" aria-hidden />
          )}
          <p>
            {confirmada
              ? `Te esperamos el ${fechaLarga(cita.inicio, zona)} a las ${horaEn(cita.inicio, zona)}. Llega 10 minutos antes.`
              : 'Liberamos el horario. Si quieres otra cita, llama a la clínica o pídela en el portal.'}
          </p>
          {cita.clinica.telefono && (
            <a
              href={`tel:${cita.clinica.telefono}`}
              className="font-medium text-accent hover:underline"
            >
              {cita.clinica.telefono}
            </a>
          )}
        </div>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso titulo={`Hola, ${cita.paciente}`} descripcion="Estos son los datos de tu cita.">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <p className="font-display text-xl font-bold first-letter:uppercase">
            {fechaLarga(cita.inicio, zona)}
          </p>
          <p className="font-mono text-2xl font-medium">{horaEn(cita.inicio, zona)}</p>
          <p className="mt-2">
            {cita.medico}
            {cita.especialidad && <span className="text-muted"> · {cita.especialidad}</span>}
          </p>
          <p className="text-muted">
            {cita.consultorio} · {cita.clinica.nombre}
          </p>
          <div className="mt-3">
            <EstadoCita estado={cita.estado} />
          </div>
        </div>
        {cita.clinica.direccion && (
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            {cita.clinica.direccion}
          </p>
        )}
        {cita.clinica.telefono && (
          <p className="flex items-center gap-2 text-sm">
            <Phone className="size-4 text-muted" aria-hidden />
            <a href={`tel:${cita.clinica.telefono}`} className="text-accent hover:underline">
              {cita.clinica.telefono}
            </a>
          </p>
        )}

        {accion.isError && <Alerta>{mensajeDeError(accion.error)}</Alerta>}

        {accionesDisponibles.length === 0 ? (
          <Alerta tipo="info">
            Esta cita ya no se puede confirmar ni cancelar desde aquí. Si necesitas un cambio, llama
            a la clínica.
          </Alerta>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            {accionesDisponibles.includes('confirmar') && (
              <Button
                tamano="lg"
                className="flex-1"
                cargando={accion.isPending && accion.variables === 'confirmar'}
                disabled={accion.isPending}
                onClick={() => accion.mutate('confirmar')}
              >
                Confirmar asistencia
              </Button>
            )}
            {accionesDisponibles.includes('cancelar') && (
              <Button
                tamano="lg"
                variante="peligro-suave"
                className="flex-1"
                disabled={accion.isPending}
                onClick={() => setConfirmarCancelacion(true)}
              >
                Cancelar cita
              </Button>
            )}
          </div>
        )}
      </div>

      <Confirmar
        abierto={confirmarCancelacion}
        alCambiar={setConfirmarCancelacion}
        titulo="¿Cancelar tu cita?"
        descripcion="Liberaremos el horario para otro paciente. Esta acción no se puede deshacer."
        textoConfirmar="Sí, cancelar"
        textoCancelar="No, mantenerla"
        variante="peligro"
        cargando={accion.isPending}
        alConfirmar={() =>
          accion.mutate('cancelar', { onSettled: () => setConfirmarCancelacion(false) })
        }
      />
    </PantallaAcceso>
  );
}
