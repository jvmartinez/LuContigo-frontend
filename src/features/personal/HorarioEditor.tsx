import { CopyPlus, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { mensajeDeError } from '@/api/errores';
import { useGuardarHorarios } from '@/api/queries/clinica';
import type { BloqueHorario } from '@/api/tipos';
import { Button } from '@/components/ui/button';
import { Input, Label, SelectNativo } from '@/components/ui/campo';
import { Alerta } from '@/components/ui/estados';
import { aviso } from '@/components/ui/toast';
import { DIAS_SEMANA } from '@/lib/fechas';
import { resolverZod } from '@/lib/formulario';
import { HorariosEntrada } from '@/shared/personal';

interface Formulario {
  bloques: { diaSemana: string; horaInicio: string; horaFin: string }[];
}

const ordenar = (b: BloqueHorario[]) =>
  [...b].sort((x, y) => x.diaSemana - y.diaSemana || x.horaInicio.localeCompare(y.horaInicio));

/** Plantilla semanal de atención (RF-14). Se reemplaza completa al guardar. */
export function HorarioEditor({
  personalId,
  bloques,
}: {
  personalId: string;
  bloques: BloqueHorario[];
}) {
  const guardar = useGuardarHorarios(personalId);
  const {
    control,
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isDirty },
  } = useForm<Formulario, unknown, HorariosEntrada>({
    resolver: resolverZod(HorariosEntrada, (v) => ({
      bloques: v.bloques.map((b) => ({ ...b, diaSemana: Number(b.diaSemana) })),
    })),
    defaultValues: {
      bloques: ordenar(bloques).map((b) => ({ ...b, diaSemana: String(b.diaSemana) })),
    },
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'bloques' });

  const copiarLunes = () => {
    const actuales = getValues('bloques');
    const lunes = actuales.filter((b) => b.diaSemana === '1');
    if (lunes.length === 0) return;
    const resto = actuales.filter((b) => !['2', '3', '4', '5'].includes(b.diaSemana));
    const copia = ['2', '3', '4', '5'].flatMap((dia) =>
      lunes.map((b) => ({ ...b, diaSemana: dia })),
    );
    replace(
      [...resto, ...copia].sort(
        (a, b) =>
          a.diaSemana.localeCompare(b.diaSemana) || a.horaInicio.localeCompare(b.horaInicio),
      ),
    );
  };

  const errorGeneral = errors.bloques?.message ?? errors.bloques?.root?.message;

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={handleSubmit((datos) =>
        guardar.mutate(datos, {
          onSuccess: (h) => {
            reset({
              bloques: ordenar(h.bloques).map((b) => ({ ...b, diaSemana: String(b.diaSemana) })),
            });
            aviso.exito('Horario guardado', 'La agenda ya ofrece los nuevos horarios.');
          },
        }),
      )}
    >
      {fields.length === 0 && (
        <p className="text-sm text-muted">Sin bloques de atención. Agrega el primero.</p>
      )}
      <ul className="flex flex-col gap-2">
        {fields.map((f, i) => {
          const error = errors.bloques?.[i];
          const mensaje =
            error?.message ??
            error?.horaInicio?.message ??
            error?.horaFin?.message ??
            error?.root?.message;
          return (
            <li key={f.id} className="flex flex-col gap-1">
              <div className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[1fr_120px_120px_auto]">
                <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                  <Label htmlFor={`dia-${f.id}`} className={i > 0 ? 'sm:sr-only' : undefined}>
                    Día
                  </Label>
                  <SelectNativo id={`dia-${f.id}`} {...register(`bloques.${i}.diaSemana`)}>
                    {DIAS_SEMANA.map((d, n) => (
                      <option key={d} value={String(n + 1)}>
                        {d}
                      </option>
                    ))}
                  </SelectNativo>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`ini-${f.id}`} className={i > 0 ? 'sm:sr-only' : undefined}>
                    Desde
                  </Label>
                  <Input
                    id={`ini-${f.id}`}
                    type="time"
                    step={300}
                    aria-invalid={Boolean(mensaje) || undefined}
                    {...register(`bloques.${i}.horaInicio`)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`fin-${f.id}`} className={i > 0 ? 'sm:sr-only' : undefined}>
                    Hasta
                  </Label>
                  <Input
                    id={`fin-${f.id}`}
                    type="time"
                    step={300}
                    aria-invalid={Boolean(mensaje) || undefined}
                    {...register(`bloques.${i}.horaFin`)}
                  />
                </div>
                <Button
                  type="button"
                  variante="fantasma"
                  tamano="icono"
                  aria-label={`Quitar bloque ${i + 1}`}
                  onClick={() => remove(i)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              {mensaje && <p className="text-sm font-medium text-crit">{mensaje}</p>}
            </li>
          );
        })}
      </ul>
      {errorGeneral && <Alerta>{errorGeneral}</Alerta>}
      {guardar.isError && <Alerta>{mensajeDeError(guardar.error)}</Alerta>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variante="secundario"
          onClick={() => append({ diaSemana: '1', horaInicio: '08:00', horaFin: '12:00' })}
        >
          <Plus aria-hidden /> Agregar bloque
        </Button>
        <Button type="button" variante="secundario" onClick={copiarLunes}>
          <CopyPlus aria-hidden /> Copiar lunes a martes–viernes
        </Button>
        <Button type="submit" cargando={guardar.isPending} disabled={!isDirty}>
          Guardar horario
        </Button>
      </div>
    </form>
  );
}
