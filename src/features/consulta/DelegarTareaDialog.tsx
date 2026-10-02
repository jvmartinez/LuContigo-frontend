import { useForm } from 'react-hook-form';
import { mensajeDeError } from '@/api/errores';
import { useDelegarTarea } from '@/api/queries/consulta';
import { Button } from '@/components/ui/button';
import { Campo, Input, SelectNativo, Textarea } from '@/components/ui/campo';
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
import { CrearTareaEntrada } from '@/shared/consulta';

const TIPOS = [
  'Aplicar medicamento',
  'Curación',
  'Toma de muestra',
  'Nebulización',
  'Control de signos vitales',
  'Retiro de puntos',
];
const OTRA = '__otra__';

interface Formulario {
  tipo: string;
  otro: string;
  detalle: string;
}

/** Delegar una tarea a la enfermera asignada (RF-11): tipo más detalle opcional. */
export function DelegarTareaDialog({
  citaId,
  enfermera,
  abierto,
  alCambiar,
}: {
  citaId: string;
  enfermera: { id: string; nombre: string } | null;
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
}) {
  const delegar = useDelegarTarea(citaId);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Formulario, unknown, { tipo: string; detalle?: string; enfermeraId?: string }>({
    resolver: resolverZod(CrearTareaEntrada, (v) => ({
      tipo: v.tipo === OTRA ? v.otro : v.tipo,
      ...(v.detalle.trim() && { detalle: v.detalle }),
      ...(enfermera && { enfermeraId: enfermera.id }),
    })),
    defaultValues: { tipo: TIPOS[0], otro: '', detalle: '' },
  });
  const tipo = watch('tipo');

  const cerrar = (abierto: boolean) => {
    if (!abierto) {
      reset();
      delegar.reset();
    }
    alCambiar(abierto);
  };

  return (
    <Dialog open={abierto} onOpenChange={cerrar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{enfermera ? `Delegar a ${enfermera.nombre}` : 'Delegar tarea'}</DialogTitle>
          <DialogDescription>
            {enfermera
              ? 'La tarea aparecerá en su lista de pendientes.'
              : 'No encontramos una enfermera asignada a tu turno; la clínica intentará asignarla.'}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((datos) =>
            delegar.mutate(datos, {
              onSuccess: (t) => {
                aviso.exito('Tarea delegada', `${t.tipo} · ${t.enfermera.nombre}`);
                cerrar(false);
              },
            }),
          )}
        >
          <Campo etiqueta="Tipo de tarea" error={tipo === OTRA ? undefined : errors.tipo?.message}>
            <SelectNativo {...register('tipo')}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value={OTRA}>Otra…</option>
            </SelectNativo>
          </Campo>
          {tipo === OTRA && (
            <Campo etiqueta="¿Cuál?" error={errors.tipo?.message}>
              <Input {...register('otro')} />
            </Campo>
          )}
          <Campo etiqueta="Detalle" opcional error={errors.detalle?.message}>
            <Textarea placeholder="Ej.: Dipirona 1 g IM" {...register('detalle')} />
          </Campo>
          {delegar.isError && <Alerta>{mensajeDeError(delegar.error)}</Alerta>}
          <DialogFooter>
            <Button type="button" variante="secundario" onClick={() => cerrar(false)}>
              Cancelar
            </Button>
            <Button type="submit" cargando={delegar.isPending}>
              Delegar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
