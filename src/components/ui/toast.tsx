import * as ToastPrimitive from '@radix-ui/react-toast';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useSyncExternalStore, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type TipoAviso = 'exito' | 'error' | 'info';

interface Aviso {
  id: number;
  tipo: TipoAviso;
  titulo: string;
  descripcion?: ReactNode;
}

let avisos: Aviso[] = [];
let siguienteId = 1;
const oyentes = new Set<() => void>();
const emitir = () => oyentes.forEach((o) => o());

/**
 * Avisos breves. Radix los anuncia en una región `aria-live` (los errores con prioridad alta),
 * así que el lector de pantalla los lee sin mover el foco.
 */
export function avisar(tipo: TipoAviso, titulo: string, descripcion?: ReactNode): void {
  avisos = [...avisos, { id: siguienteId++, tipo, titulo, descripcion }].slice(-4);
  emitir();
}

export const aviso = {
  exito: (titulo: string, descripcion?: ReactNode) => avisar('exito', titulo, descripcion),
  error: (titulo: string, descripcion?: ReactNode) => avisar('error', titulo, descripcion),
  info: (titulo: string, descripcion?: ReactNode) => avisar('info', titulo, descripcion),
};

function quitar(id: number) {
  avisos = avisos.filter((a) => a.id !== id);
  emitir();
}

const suscribir = (o: () => void) => {
  oyentes.add(o);
  return () => {
    oyentes.delete(o);
  };
};

const ICONO: Record<TipoAviso, ReactNode> = {
  exito: <CheckCircle2 className="size-5 text-good" aria-hidden />,
  error: <AlertTriangle className="size-5 text-crit" aria-hidden />,
  info: <Info className="size-5 text-info" aria-hidden />,
};

export function Toaster() {
  const lista = useSyncExternalStore(suscribir, () => avisos);
  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={6000} label="Avisos">
      {lista.map((a) => (
        <ToastPrimitive.Root
          key={a.id}
          type={a.tipo === 'error' ? 'foreground' : 'background'}
          duration={a.tipo === 'error' ? 10_000 : 6000}
          onOpenChange={(abierto) => !abierto && quitar(a.id)}
          className={cn(
            'flex animate-aparecer items-start gap-3 rounded-xl border bg-surface p-4 pr-12 shadow-lg',
            a.tipo === 'error' ? 'border-crit/50' : 'border-line',
          )}
        >
          <span className="mt-0.5">{ICONO[a.tipo]}</span>
          <div className="flex flex-col gap-0.5">
            <ToastPrimitive.Title className="font-semibold">{a.titulo}</ToastPrimitive.Title>
            {a.descripcion && (
              <ToastPrimitive.Description className="text-sm text-muted">
                {a.descripcion}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close className="absolute right-1.5 top-1.5 inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-surface-2">
            <X className="size-4" aria-hidden />
            <span className="sr-only">Cerrar aviso</span>
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[60] flex w-full max-w-sm flex-col gap-2 p-4 [&>li]:relative" />
    </ToastPrimitive.Provider>
  );
}
