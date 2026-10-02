import { useForm } from 'react-hook-form';
import { mensajeDeError } from '@/api/errores';
import { useCancelarCita } from '@/api/queries/citas';
import { Button } from '@/components/ui/button';
import { Campo, Textarea } from '@/components/ui/campo';
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
import { resolverZod } from '@/lib/formulario';
import { CancelarCitaEntrada } from '@/shared/citas';

/** Cancelar con motivo (recepción y portal del paciente). */
export function CancelarCitaDialog({
  citaId,
  descripcion,
  abierto,
  alCambiar,
  alCancelar,
}: {
  citaId: string;
  descripcion: string;
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  alCancelar?: () => void;
}) {
  const cancelar = useCancelarCita();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ motivo: string }, unknown, { motivo: string }>({
    resolver: resolverZod(CancelarCitaEntrada),
    defaultValues: { motivo: '' },
  });

  const cerrar = (abierto: boolean) => {
    if (!abierto) {
      reset();
      cancelar.reset();
    }
    alCambiar(abierto);
  };

  return (
    <Dialog open={abierto} onOpenChange={cerrar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar cita</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(({ motivo }) =>
            cancelar.mutate(
              { id: citaId, motivo },
              {
                onSuccess: () => {
                  aviso.exito('Cita cancelada', 'El horario quedó libre.');
                  cerrar(false);
                  alCancelar?.();
                },
              },
            ),
          )}
        >
          <Campo etiqueta="Motivo de la cancelación" error={errors.motivo?.message}>
            <Textarea placeholder="Ej.: el paciente tiene un viaje" {...register('motivo')} />
          </Campo>
          {cancelar.isError && <Alerta>{mensajeDeError(cancelar.error)}</Alerta>}
          <DialogFooter>
            <Button type="button" variante="secundario" onClick={() => cerrar(false)}>
              Volver
            </Button>
            <Button type="submit" variante="peligro" cargando={cancelar.isPending}>
              Cancelar cita
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
