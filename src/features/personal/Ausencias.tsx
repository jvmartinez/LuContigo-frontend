import { CalendarOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { mensajeDeError } from '@/api/errores';
import { useAusencias, useCrearAusencia, useEliminarAusencia } from '@/api/queries/clinica';
import type { Cita } from '@/api/tipos';
import { EstadoCita } from '@/components/EstadoCita';
import { Button } from '@/components/ui/button';
import { Campo, Input } from '@/components/ui/campo';
import { Alerta, ErrorEstado, Esqueleto } from '@/components/ui/estados';
import { aviso } from '@/components/ui/toast';
import { fechaHoraCorta, hoyEn, instanteLocal, isoConZona } from '@/lib/fechas';
import { resolverZod } from '@/lib/formulario';
import { CrearAusenciaEntrada } from '@/shared/personal';

interface Formulario {
  desdeFecha: string;
  desdeHora: string;
  hastaFecha: string;
  hastaHora: string;
  motivo: string;
}

/** Ausencias (RF-16). Al registrar una se listan las citas afectadas para que recepción las reprograme. */
export function Ausencias({ personalId, zona }: { personalId: string; zona: string }) {
  const ausencias = useAusencias(personalId);
  const crear = useCrearAusencia(personalId);
  const eliminar = useEliminarAusencia(personalId);
  const [afectadas, setAfectadas] = useState<Cita[] | null>(null);
  const hoy = hoyEn(zona);

  const aInstante = (fecha: string, hora: string) =>
    fecha && hora ? isoConZona(instanteLocal(fecha, hora, zona), zona) : '';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Formulario, unknown, { desde: string; hasta: string; motivo?: string }>({
    resolver: resolverZod(
      CrearAusenciaEntrada,
      (v) => ({
        desde: aInstante(v.desdeFecha, v.desdeHora),
        hasta: aInstante(v.hastaFecha, v.hastaHora),
        ...(v.motivo.trim() && { motivo: v.motivo }),
      }),
      (ruta) => ({ desde: 'desdeFecha', hasta: 'hastaFecha' })[ruta] ?? ruta,
    ),
    defaultValues: {
      desdeFecha: hoy,
      desdeHora: '00:00',
      hastaFecha: hoy,
      hastaHora: '23:59',
      motivo: '',
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {ausencias.isPending ? (
        <Esqueleto className="h-16" />
      ) : ausencias.isError ? (
        <ErrorEstado error={ausencias.error} reintentar={() => ausencias.refetch()} />
      ) : ausencias.data.length === 0 ? (
        <p className="text-sm text-muted">No tiene ausencias vigentes ni programadas.</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Ausencias vigentes y futuras">
          {ausencias.data.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2"
            >
              <div>
                <p className="font-mono text-sm">
                  {fechaHoraCorta(a.desde, zona)} → {fechaHoraCorta(a.hasta, zona)}
                </p>
                {a.motivo && <p className="text-sm text-muted">{a.motivo}</p>}
              </div>
              <Button
                variante="fantasma"
                tamano="icono"
                aria-label={`Eliminar ausencia del ${fechaHoraCorta(a.desde, zona)}`}
                cargando={eliminar.isPending && eliminar.variables === a.id}
                onClick={() =>
                  eliminar.mutate(a.id, {
                    onSuccess: () =>
                      aviso.exito(
                        'Ausencia eliminada',
                        'Sus horarios vuelven a estar disponibles.',
                      ),
                    onError: (e) => aviso.error('No se pudo eliminar', mensajeDeError(e)),
                  })
                }
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        noValidate
        className="flex flex-col gap-3 rounded-xl border border-line p-4"
        onSubmit={handleSubmit((datos) =>
          crear.mutate(datos, {
            onSuccess: (r) => {
              setAfectadas(r.citasAfectadas);
              reset();
              aviso.exito(
                'Ausencia registrada',
                r.citasAfectadas.length
                  ? `${r.citasAfectadas.length} citas quedan por reprogramar.`
                  : 'No hay citas afectadas.',
              );
            },
          }),
        )}
      >
        <p className="flex items-center gap-2 font-semibold">
          <CalendarOff className="size-4 text-muted" aria-hidden /> Registrar ausencia
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid grid-cols-[1fr_110px] gap-2">
            <Campo etiqueta="Desde" error={errors.desdeFecha?.message}>
              <Input type="date" {...register('desdeFecha')} />
            </Campo>
            <Campo etiqueta="Hora">
              <Input type="time" {...register('desdeHora')} />
            </Campo>
          </div>
          <div className="grid grid-cols-[1fr_110px] gap-2">
            <Campo etiqueta="Hasta" error={errors.hastaFecha?.message}>
              <Input type="date" {...register('hastaFecha')} />
            </Campo>
            <Campo etiqueta="Hora">
              <Input type="time" {...register('hastaHora')} />
            </Campo>
          </div>
        </div>
        <Campo etiqueta="Motivo" opcional error={errors.motivo?.message}>
          <Input placeholder="Ej.: congreso médico" {...register('motivo')} />
        </Campo>
        {crear.isError && <Alerta>{mensajeDeError(crear.error)}</Alerta>}
        <Button type="submit" className="self-start" cargando={crear.isPending}>
          Registrar ausencia
        </Button>
      </form>

      {afectadas && afectadas.length > 0 && (
        <Alerta tipo="aviso">
          <p className="font-semibold">
            {afectadas.length === 1
              ? 'Hay 1 cita afectada'
              : `Hay ${afectadas.length} citas afectadas`}
            . Avisa a recepción para reprogramarlas:
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {afectadas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="font-mono">{fechaHoraCorta(c.inicio, zona)}</span>
                <span>
                  {c.paciente.apellidos}, {c.paciente.nombres}
                </span>
                <EstadoCita estado={c.estado} />
              </li>
            ))}
          </ul>
        </Alerta>
      )}
    </div>
  );
}
