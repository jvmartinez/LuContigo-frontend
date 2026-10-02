import type { EstadoCita as Estado } from '@/shared/enums';
import { cn } from '@/lib/cn';

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  PROGRAMADA: 'Programada',
  CONFIRMADA: 'Confirmada',
  EN_ESPERA: 'En espera',
  LISTA: 'Lista para médico',
  EN_CONSULTA: 'En consulta',
  ATENDIDA: 'Atendida',
  CANCELADA: 'Cancelada',
  NO_ASISTIO: 'No asistió',
};

/** Colores por estado (FRONTEND.md §8). Un solo lugar para toda la app. */
export const ESTILO_ESTADO: Record<Estado, string> = {
  PROGRAMADA: 'border-line bg-surface-2 text-muted',
  CONFIRMADA: 'border-info/40 bg-info-soft text-info',
  EN_ESPERA: 'border-warn/40 bg-warn-soft text-warn',
  LISTA: 'border-accent/40 bg-accent-soft text-ink',
  EN_CONSULTA: 'border-accent bg-accent text-accent-ink',
  ATENDIDA: 'border-good/40 bg-good-soft text-good',
  CANCELADA: 'border-line bg-surface-2 text-muted line-through',
  NO_ASISTIO: 'border-crit/40 bg-crit-soft text-crit',
};

/** Fondo de la celda de la agenda según el estado (más suave que la píldora). */
export const FONDO_ESTADO: Record<Estado, string> = {
  PROGRAMADA: 'border-line bg-surface',
  CONFIRMADA: 'border-info/50 bg-info-soft',
  EN_ESPERA: 'border-warn/50 bg-warn-soft',
  LISTA: 'border-accent/50 bg-accent-soft',
  EN_CONSULTA: 'border-accent bg-accent-soft ring-1 ring-accent',
  ATENDIDA: 'border-good/40 bg-good-soft',
  CANCELADA: 'border-line bg-surface-2 opacity-70',
  NO_ASISTIO: 'border-crit/40 bg-crit-soft',
};

export function EstadoCita({ estado, className }: { estado: Estado; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold',
        ESTILO_ESTADO[estado],
        className,
      )}
    >
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}
