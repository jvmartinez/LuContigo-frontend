import { CalendarPlus, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mensajeDeError } from '@/api/errores';
import { useMisCitas, useTransicionCita } from '@/api/queries/citas';
import type { Cita } from '@/api/tipos';
import { useUsuario } from '@/auth/sesion';
import { CancelarCitaDialog } from '@/components/CancelarCitaDialog';
import { EstadoCita } from '@/components/EstadoCita';
import { Button } from '@/components/ui/button';
import { Card, EncabezadoPagina } from '@/components/ui/card';
import { ErrorEstado, Esqueleto, Vacio } from '@/components/ui/estados';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { aviso } from '@/components/ui/toast';
import { fechaHoraCorta, fechaLarga, horaEn } from '@/lib/fechas';

function TarjetaCita({
  cita,
  zona,
  alCancelar,
}: {
  cita: Cita;
  zona: string;
  alCancelar?: () => void;
}) {
  const confirmar = useTransicionCita();
  const abierta = cita.estado === 'PROGRAMADA' || cita.estado === 'CONFIRMADA';
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-4">
        <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-accent-soft py-2 text-center">
          <span className="font-mono text-lg font-medium">{horaEn(cita.inicio, zona)}</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold first-letter:uppercase">
            {fechaLarga(cita.inicio, zona)}
          </p>
          <p>
            {cita.medico.nombre}
            {cita.medico.especialidad && (
              <span className="text-muted"> · {cita.medico.especialidad}</span>
            )}
          </p>
          <p className="flex items-center gap-1 text-sm text-muted">
            <MapPin className="size-3.5" aria-hidden /> {cita.consultorio.nombre}
          </p>
          <EstadoCita estado={cita.estado} className="mt-1.5" />
        </div>
      </div>
      {abierta && alCancelar && (
        <div className="flex flex-wrap gap-2 sm:flex-col">
          {cita.estado === 'PROGRAMADA' && (
            <Button
              cargando={confirmar.isPending}
              onClick={() =>
                confirmar.mutate(
                  { id: cita.id, accion: 'confirmar' },
                  {
                    onSuccess: () => aviso.exito('Asistencia confirmada', '¡Te esperamos!'),
                    onError: (e) => aviso.error('No pudimos confirmar', mensajeDeError(e)),
                  },
                )
              }
            >
              Confirmar asistencia
            </Button>
          )}
          <Button variante="peligro-suave" onClick={alCancelar}>
            Cancelar
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Portal del paciente: próximas y pasadas; confirmar o cancelar (RF-01, RF-02). */
export default function MisCitasPage() {
  const { zona, usuario } = useUsuario();
  const citas = useMisCitas();
  const [cancelar, setCancelar] = useState<Cita | null>(null);

  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina
        titulo="Mis citas"
        descripcion={`Hola, ${usuario.paciente?.nombres ?? ''}. Aquí ves y gestionas tus citas en ${usuario.clinica.nombre}.`}
        acciones={
          <Button asChild>
            <Link to="/mis-citas/nueva">
              <CalendarPlus aria-hidden /> Solicitar cita
            </Link>
          </Button>
        }
      />
      {citas.isPending ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Cargando tus citas">
          <Esqueleto className="h-28" />
          <Esqueleto className="h-28" />
        </div>
      ) : citas.isError ? (
        <ErrorEstado error={citas.error} reintentar={() => citas.refetch()} />
      ) : (
        <Tabs defaultValue="proximas">
          <TabsList aria-label="Tus citas">
            <TabsTrigger value="proximas">Próximas ({citas.data.proximas.length})</TabsTrigger>
            <TabsTrigger value="pasadas">Pasadas</TabsTrigger>
          </TabsList>
          <TabsContent value="proximas">
            {citas.data.proximas.length === 0 ? (
              <Vacio
                titulo="No tienes citas próximas"
                accion={
                  <Button asChild variante="secundario">
                    <Link to="/mis-citas/nueva">Solicitar una cita</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {citas.data.proximas.map((c) => (
                  <li key={c.id}>
                    <TarjetaCita cita={c} zona={zona} alCancelar={() => setCancelar(c)} />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="pasadas">
            {citas.data.pasadas.length === 0 ? (
              <Vacio titulo="Todavía no tienes citas pasadas" />
            ) : (
              <ul className="flex flex-col gap-3">
                {citas.data.pasadas.map((c) => (
                  <li key={c.id}>
                    <TarjetaCita cita={c} zona={zona} />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}

      {cancelar && (
        <CancelarCitaDialog
          citaId={cancelar.id}
          descripcion={`Tu cita del ${fechaHoraCorta(cancelar.inicio, zona)} con ${cancelar.medico.nombre}. Cuéntanos el motivo para liberar el horario.`}
          abierto
          alCambiar={(abierto) => !abierto && setCancelar(null)}
        />
      )}
    </div>
  );
}
