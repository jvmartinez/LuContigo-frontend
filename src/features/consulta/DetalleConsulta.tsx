import { ArrowLeft, ClipboardPlus, Play } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mensajeDeError } from '@/api/errores';
import { useTransicionCita } from '@/api/queries/citas';
import { useAsignaciones } from '@/api/queries/clinica';
import { useNotaConsulta } from '@/api/queries/consulta';
import { useHistorial, usePaciente } from '@/api/queries/pacientes';
import type { Cita } from '@/api/tipos';
import { AlertaAlergia } from '@/components/AlertaAlergia';
import { EstadoCita } from '@/components/EstadoCita';
import { LineaTiempo } from '@/components/LineaTiempo';
import { SignosVitales } from '@/components/SignosVitales';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alerta, Cargando, ErrorEstado, Esqueleto } from '@/components/ui/estados';
import { aviso } from '@/components/ui/toast';
import { edadEnAnios, textoEdad } from '@/lib/edad';
import { fechaEn, horaEn, minutosEn } from '@/lib/fechas';
import { DelegarTareaDialog } from './DelegarTareaDialog';
import { NotaConsulta } from './NotaConsulta';

function NotaCerrada({ citaId }: { citaId: string }) {
  const nota = useNotaConsulta(citaId);
  if (nota.isPending) return <Esqueleto className="h-32" />;
  if (nota.isError) return <ErrorEstado error={nota.error} reintentar={() => nota.refetch()} />;
  if (!nota.data) return <p className="text-muted">Esta cita no tiene nota registrada.</p>;
  const n = nota.data;
  const filas: [string, string | null][] = [
    ['Motivo', n.motivo],
    ['Examen físico', n.examenFisico],
    ['Diagnóstico', n.cie10 ? `${n.diagnostico} (${n.cie10})` : n.diagnostico],
    ['Tratamiento', n.tratamiento],
    ['Indicaciones', n.indicaciones],
  ];
  return (
    <dl className="flex flex-col gap-3">
      {filas
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm font-semibold text-muted">{k}</dt>
            <dd className="whitespace-pre-line">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

function EditorNota({ cita }: { cita: Cita }) {
  const nota = useNotaConsulta(cita.id);
  if (nota.isPending) return <Cargando texto="Abriendo la nota…" />;
  if (nota.isError) return <ErrorEstado error={nota.error} reintentar={() => nota.refetch()} />;
  return <NotaConsulta key={cita.id} citaId={cita.id} nota={nota.data} motivoCita={cita.motivo} />;
}

/** Consulta del médico: datos, alergias, signos de hoy, historial, nota y delegar (RF-07, RF-08, RF-11). */
export function DetalleConsulta({ cita, zona }: { cita: Cita; zona: string }) {
  const paciente = usePaciente(cita.pacienteId);
  const historial = useHistorial(cita.pacienteId);
  const asignaciones = useAsignaciones(fechaEn(cita.inicio, zona));
  const iniciar = useTransicionCita();
  const [delegando, setDelegando] = useState(false);

  const turno = minutosEn(cita.inicio, zona) < 13 * 60 ? 'MANANA' : 'TARDE';
  const filas = asignaciones.data ?? [];
  const enfermera = (filas.find((a) => a.turno === turno) ?? filas[0])?.enfermera ?? null;

  const signosHoy =
    historial.data?.eventos.find((e) => e.citaId === cita.id)?.signosVitales ?? null;
  const edad = paciente.data ? edadEnAnios(paciente.data.fechaNacimiento) : 0;
  const puedeIniciar = cita.estado === 'EN_ESPERA' || cita.estado === 'LISTA';
  const puedeDelegar = cita.estado === 'EN_CONSULTA' || cita.estado === 'ATENDIDA';

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variante="enlace" className="self-start lg:hidden">
        <Link to="/consultorio">
          <ArrowLeft aria-hidden /> Pacientes de hoy
        </Link>
      </Button>

      {paciente.isError ? (
        <ErrorEstado error={paciente.error} reintentar={() => paciente.refetch()} />
      ) : (
        <>
          <AlertaAlergia alergias={paciente.data?.alergias} compacta={!paciente.data} />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">
                {cita.paciente.nombres} {cita.paciente.apellidos}
              </h2>
              <p className="text-muted">
                {paciente.data && `${textoEdad(paciente.data.fechaNacimiento)} · `}
                <span className="font-mono">{cita.paciente.documento}</span> · cita{' '}
                <span className="font-mono">{horaEn(cita.inicio, zona)}</span>
              </p>
              <div className="mt-1">
                <EstadoCita estado={cita.estado} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {puedeIniciar && (
                <Button
                  cargando={iniciar.isPending}
                  onClick={() =>
                    iniciar.mutate(
                      { id: cita.id, accion: 'iniciar' },
                      {
                        onSuccess: () => aviso.exito('Consulta iniciada'),
                        onError: (e) =>
                          aviso.error('No se pudo iniciar la consulta', mensajeDeError(e)),
                      },
                    )
                  }
                >
                  <Play aria-hidden /> Iniciar consulta
                </Button>
              )}
              {puedeDelegar && (
                <Button variante="secundario" onClick={() => setDelegando(true)}>
                  <ClipboardPlus aria-hidden />{' '}
                  {enfermera ? `Delegar a ${enfermera.nombre}` : 'Delegar tarea'}
                </Button>
              )}
            </div>
          </div>
          {paciente.data?.antecedentes && (
            <p className="text-sm">
              <span className="font-semibold">Antecedentes:</span> {paciente.data.antecedentes}
            </p>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Signos de hoy</CardTitle>
        </CardHeader>
        <CardContent>
          {historial.isPending ? (
            <Esqueleto className="h-24" />
          ) : signosHoy ? (
            <SignosVitales signos={signosHoy} edad={edad} />
          ) : (
            <p className="text-sm text-muted">
              {cita.estado === 'EN_ESPERA'
                ? 'Enfermería aún no toma los signos. Puedes iniciar la consulta sin ellos.'
                : 'No se registraron signos vitales en esta cita.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nota de consulta</CardTitle>
        </CardHeader>
        <CardContent>
          {cita.estado === 'EN_CONSULTA' ? (
            <EditorNota cita={cita} />
          ) : cita.estado === 'ATENDIDA' ? (
            <NotaCerrada citaId={cita.id} />
          ) : puedeIniciar ? (
            <Alerta tipo="info">Inicia la consulta para escribir la nota.</Alerta>
          ) : (
            <p className="text-sm text-muted">
              {cita.estado === 'CANCELADA' || cita.estado === 'NO_ASISTIO'
                ? 'Esta cita no se realizó.'
                : 'El paciente aún no llega a la clínica.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial clínico</CardTitle>
        </CardHeader>
        <CardContent>
          {historial.isPending ? (
            <Esqueleto className="h-32" />
          ) : historial.isError ? (
            <ErrorEstado error={historial.error} reintentar={() => historial.refetch()} />
          ) : (
            <LineaTiempo eventos={historial.data.eventos} zona={zona} excluirCitaId={cita.id} />
          )}
        </CardContent>
      </Card>

      <DelegarTareaDialog
        citaId={cita.id}
        enfermera={enfermera}
        abierto={delegando}
        alCambiar={setDelegando}
      />
    </div>
  );
}
