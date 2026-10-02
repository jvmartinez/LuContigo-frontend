import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { esErrorApi, mensajeDeError } from '@/api/errores';
import { claves } from '@/api/queries/claves';
import { useCrearCita, useDisponibilidad } from '@/api/queries/citas';
import { useMedicos } from '@/api/queries/clinica';
import { usePaciente } from '@/api/queries/pacientes';
import type { PacienteResumen } from '@/api/tipos';
import { useUsuario } from '@/auth/sesion';
import { ERRORES_DE_HORA, MENSAJE_OCUPADO, SelectorHora } from '@/components/SelectorHora';
import { Button } from '@/components/ui/button';
import { Campo, Input, SelectNativo, Textarea } from '@/components/ui/campo';
import { Alerta } from '@/components/ui/estados';
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
import { fechaEn, fechaHoraCorta, hoyEn, instanteLocal } from '@/lib/fechas';
import { resolverZod, sinVacios } from '@/lib/formulario';
import { CrearCitaEntrada } from '@/shared/citas';
import type { CanalOrigen } from '@/shared/enums';
import { BuscadorPaciente } from './BuscadorPaciente';

interface Formulario {
  paciente: PacienteResumen | null;
  medicoId: string;
  fecha: string;
  hora: string;
  motivo: string;
  canalOrigen: CanalOrigen;
}

/** Para recepción el paciente es obligatorio (el paciente del portal agenda para sí mismo). */
const EsquemaRecepcion = CrearCitaEntrada.superRefine((v, ctx) => {
  if (!v.pacienteId) {
    ctx.addIssue({ code: 'custom', message: 'Busca y elige al paciente', path: ['pacienteId'] });
  }
});

/** Nueva cita (panel lateral) con médico, fecha y hora precargados desde la celda libre. */
export default function NuevaCitaPanel() {
  const { zona } = useUsuario();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const medicos = useMedicos();
  const crear = useCrearCita();
  const [horaPedida, setHoraPedida] = useState(params.get('hora'));
  // Desde la ficha del paciente se llega con él ya elegido.
  const pacientePedido = usePaciente(params.get('pacienteId') ?? undefined);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Formulario, unknown, CrearCitaEntrada>({
    resolver: resolverZod(
      EsquemaRecepcion,
      (v) =>
        sinVacios({
          pacienteId: v.paciente?.id ?? '',
          medicoId: v.medicoId,
          inicio: v.hora,
          motivo: v.motivo,
          canalOrigen: v.canalOrigen,
        }),
      (ruta) => ({ pacienteId: 'paciente', inicio: 'hora' })[ruta] ?? ruta,
    ),
    defaultValues: {
      paciente: null,
      medicoId: params.get('medicoId') ?? '',
      fecha: params.get('fecha') ?? hoyEn(zona),
      hora: '',
      motivo: '',
      canalOrigen: 'RECEPCION',
    },
  });

  const medicoId = watch('medicoId');

  // Un <select> nativo pierde su valor si se monta antes que sus opciones: se reaplica al llegar.
  useEffect(() => {
    if (medicos.data) setValue('medicoId', medicoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicos.data, setValue]);
  const fecha = watch('fecha');
  const disponibilidad = useDisponibilidad(medicoId || undefined, fecha);

  // La hora elegida en la cuadrícula se selecciona cuando llegan los huecos libres.
  useEffect(() => {
    if (!horaPedida || !disponibilidad.data) return;
    const buscado = instanteLocal(fecha, horaPedida, zona).getTime();
    const hueco = disponibilidad.data.huecos.find((h) => new Date(h.inicio).getTime() === buscado);
    if (hueco) setValue('hora', hueco.inicio);
    setHoraPedida(null);
  }, [horaPedida, disponibilidad.data, fecha, zona, setValue]);

  useEffect(() => {
    if (pacientePedido.data) setValue('paciente', pacientePedido.data);
  }, [pacientePedido.data, setValue]);

  const volver = (citaId?: string) => {
    const destino = new URLSearchParams({ fecha });
    if (citaId) destino.set('cita', citaId);
    navigate(`/agenda?${destino.toString()}`);
  };

  const enviar = handleSubmit((datos) =>
    crear.mutate(datos, {
      onSuccess: (cita) => {
        aviso.exito(
          'Cita agendada',
          `${cita.paciente.nombres} ${cita.paciente.apellidos} · ${fechaHoraCorta(cita.inicio, zona)}${
            cita.recordatorioProgramadoPara ? '. Se enviará un recordatorio 24 h antes.' : ''
          }`,
        );
        const nuevaFecha = fechaEn(cita.inicio, zona);
        navigate(`/agenda?${new URLSearchParams({ fecha: nuevaFecha, cita: cita.id }).toString()}`);
      },
      onError: (e) => {
        if (esErrorApi(e, 'HORARIO_OCUPADO')) {
          // Otro usuario tomó el hueco: se refrescan los libres y se pide otro.
          void qc.invalidateQueries({ queryKey: claves.disponibilidad(datos.medicoId) });
          setValue('hora', '');
          setError('hora', { message: MENSAJE_OCUPADO });
        } else if (ERRORES_DE_HORA.some((c) => esErrorApi(e, c))) {
          setError('hora', { message: mensajeDeError(e) });
        }
      },
    }),
  );

  const errorGeneral = crear.isError && !ERRORES_DE_HORA.some((c) => esErrorApi(crear.error, c));

  return (
    <Sheet open onOpenChange={(abierto) => !abierto && volver()}>
      <SheetContent ancho="lg">
        <SheetHeader>
          <SheetTitle>Nueva cita</SheetTitle>
          <SheetDescription>Solo se ofrecen horarios libres del médico elegido.</SheetDescription>
        </SheetHeader>
        <form noValidate onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="flex flex-col gap-4">
            <Campo
              etiqueta="Paciente"
              error={errors.paciente?.message}
              ayuda={
                <>
                  ¿No aparece?{' '}
                  <Link to="/pacientes/nuevo" className="font-medium text-accent hover:underline">
                    Registrar paciente nuevo
                  </Link>
                </>
              }
            >
              <Controller
                control={control}
                name="paciente"
                render={({ field }) => (
                  <BuscadorPaciente ref={field.ref} valor={field.value} alElegir={field.onChange} />
                )}
              />
            </Campo>

            <Campo etiqueta="Médico" error={errors.medicoId?.message}>
              <SelectNativo
                {...register('medicoId', { onChange: () => setValue('hora', '') })}
                disabled={medicos.isPending}
              >
                <option value="">
                  {medicos.isPending ? 'Cargando médicos…' : 'Elige un médico'}
                </option>
                {medicos.data?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                    {m.especialidad ? ` — ${m.especialidad.nombre}` : ''}
                  </option>
                ))}
              </SelectNativo>
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Fecha">
                <Input
                  type="date"
                  min={hoyEn(zona)}
                  {...register('fecha', { onChange: () => setValue('hora', '') })}
                />
              </Campo>
              <Campo etiqueta="Hora libre" error={errors.hora?.message}>
                <SelectorHora
                  medicoId={medicoId || undefined}
                  fecha={fecha}
                  zona={zona}
                  {...register('hora')}
                />
              </Campo>
            </div>

            <Campo etiqueta="Motivo de la consulta" opcional error={errors.motivo?.message}>
              <Textarea placeholder="Ej.: control de presión arterial" {...register('motivo')} />
            </Campo>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-semibold">¿Cómo la pidió?</legend>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ['RECEPCION', 'En recepción'],
                    ['TELEFONO', 'Por teléfono'],
                  ] as const
                ).map(([valor, texto]) => (
                  <label key={valor} className="flex min-h-tap items-center gap-2">
                    <input
                      type="radio"
                      value={valor}
                      className="size-4 accent-[var(--accent)]"
                      {...register('canalOrigen')}
                    />
                    {texto}
                  </label>
                ))}
              </div>
            </fieldset>

            {errorGeneral && <Alerta>{mensajeDeError(crear.error)}</Alerta>}
          </SheetBody>
          <SheetFooter className="justify-end">
            <Button type="button" variante="secundario" onClick={() => volver()}>
              Cancelar
            </Button>
            <Button type="submit" cargando={crear.isPending}>
              Agendar cita
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
