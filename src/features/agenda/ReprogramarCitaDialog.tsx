import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { esErrorApi, mensajeDeError } from '@/api/errores';
import { claves } from '@/api/queries/claves';
import { useReprogramarCita } from '@/api/queries/citas';
import type { Cita } from '@/api/tipos';
import { MENSAJE_OCUPADO, SelectorHora } from '@/components/SelectorHora';
import { Button } from '@/components/ui/button';
import { Campo, Input } from '@/components/ui/campo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alerta } from '@/components/ui/estados';
import { aviso } from '@/components/ui/toast';
import { fechaEn, fechaHoraCorta, hoyEn } from '@/lib/fechas';

interface Formulario {
  fecha: string;
  inicio: string;
}

export function ReprogramarCitaDialog({
  cita,
  zona,
  abierto,
  alCambiar,
}: {
  cita: Cita;
  zona: string;
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
}) {
  const qc = useQueryClient();
  const reprogramar = useReprogramarCita();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<Formulario>({
    defaultValues: { fecha: fechaEn(cita.inicio, zona), inicio: '' },
  });
  const fecha = watch('fecha');

  const cerrar = (abierto: boolean) => {
    if (!abierto) {
      reset({ fecha: fechaEn(cita.inicio, zona), inicio: '' });
      reprogramar.reset();
    }
    alCambiar(abierto);
  };

  const enviar = handleSubmit(({ inicio }) =>
    reprogramar.mutate(
      { id: cita.id, inicio },
      {
        onSuccess: (r) => {
          aviso.exito('Cita reprogramada', `Nuevo horario: ${fechaHoraCorta(r.inicio, zona)}.`);
          cerrar(false);
        },
        onError: (e) => {
          if (esErrorApi(e, 'HORARIO_OCUPADO')) {
            void qc.invalidateQueries({ queryKey: claves.disponibilidad(cita.medico.id) });
            setValue('inicio', '');
            setError('inicio', { message: MENSAJE_OCUPADO });
          }
        },
      },
    ),
  );

  return (
    <Dialog open={abierto} onOpenChange={cerrar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprogramar cita</DialogTitle>
          <DialogDescription>
            {cita.paciente.nombres} {cita.paciente.apellidos} con {cita.medico.nombre}. Hoy está el{' '}
            {fechaHoraCorta(cita.inicio, zona)}.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
          <Campo etiqueta="Fecha" error={errors.fecha?.message}>
            <Input
              type="date"
              min={hoyEn(zona)}
              {...register('fecha', {
                required: 'Elige la fecha',
                onChange: () => setValue('inicio', ''),
              })}
            />
          </Campo>
          <Campo etiqueta="Hora libre" error={errors.inicio?.message}>
            <SelectorHora
              medicoId={cita.medico.id}
              fecha={fecha}
              zona={zona}
              {...register('inicio', { required: 'Elige una hora libre' })}
            />
          </Campo>
          {reprogramar.isError && !esErrorApi(reprogramar.error, 'HORARIO_OCUPADO') && (
            <Alerta>{mensajeDeError(reprogramar.error)}</Alerta>
          )}
          <DialogFooter>
            <Button type="button" variante="secundario" onClick={() => cerrar(false)}>
              Volver
            </Button>
            <Button type="submit" cargando={reprogramar.isPending}>
              Guardar nuevo horario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
