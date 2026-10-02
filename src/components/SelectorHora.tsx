import { forwardRef, type SelectHTMLAttributes } from 'react';
import { useDisponibilidad } from '@/api/queries/citas';
import { horaEn } from '@/lib/fechas';
import { SelectNativo } from './ui/campo';

/** Mensaje ante 409 HORARIO_OCUPADO: otro usuario tomó el hueco mientras se llenaba el formulario. */
export const MENSAJE_OCUPADO = 'Ese horario acaba de ocuparse. Elige otro.';

/** Errores de la API que se explican mejor junto al selector de hora. */
export const ERRORES_DE_HORA = ['HORARIO_OCUPADO', 'MEDICO_AUSENTE', 'FUERA_DE_HORARIO'] as const;

/**
 * Selector de hora que solo ofrece huecos de GET /disponibilidad (§6). El valor es el instante
 * ISO del hueco, listo para enviar como `inicio`.
 */
export const SelectorHora = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & {
    medicoId: string | undefined;
    fecha: string;
    zona: string;
    ahora?: Date;
  }
>(({ medicoId, fecha, zona, ahora, ...props }, ref) => {
  const disponibilidad = useDisponibilidad(medicoId, fecha);
  const limite = ahora ?? new Date();
  const huecos = (disponibilidad.data?.huecos ?? []).filter((h) => new Date(h.inicio) > limite);

  const placeholder = !medicoId
    ? 'Elige primero el médico'
    : !fecha
      ? 'Elige primero la fecha'
      : disponibilidad.isPending
        ? 'Buscando horarios libres…'
        : disponibilidad.isError
          ? 'No pudimos cargar los horarios'
          : huecos.length === 0
            ? 'Sin horarios libres ese día'
            : 'Elige una hora';

  return (
    <SelectNativo ref={ref} disabled={!medicoId || !fecha || huecos.length === 0} {...props}>
      <option value="">{placeholder}</option>
      {huecos.map((h) => (
        <option key={h.inicio} value={h.inicio}>
          {horaEn(h.inicio, zona)}
        </option>
      ))}
    </SelectNativo>
  );
});
SelectorHora.displayName = 'SelectorHora';
