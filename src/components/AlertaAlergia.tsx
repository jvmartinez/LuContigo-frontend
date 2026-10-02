import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

/** La alergia del paciente siempre arriba y en rojo (§6). Si no hay, lo dice explícitamente. */
export function AlertaAlergia({
  alergias,
  className,
  compacta = false,
}: {
  alergias: string | null | undefined;
  className?: string;
  compacta?: boolean;
}) {
  const texto = alergias?.trim();
  if (!texto) {
    return compacta ? null : (
      <p className={cn('text-sm text-muted', className)}>Sin alergias registradas.</p>
    );
  }
  return (
    <div
      role="note"
      aria-label={`Alergias: ${texto}`}
      className={cn(
        'flex items-start gap-2 rounded-lg border border-crit/50 bg-crit-soft font-semibold text-crit',
        compacta ? 'px-2 py-1 text-xs' : 'px-3 py-2.5 text-sm',
        className,
      )}
    >
      <ShieldAlert className={cn('shrink-0', compacta ? 'size-4' : 'mt-0.5 size-5')} aria-hidden />
      <span>
        <span className="uppercase tracking-wide">Alergia:</span> {texto}
      </span>
    </div>
  );
}
