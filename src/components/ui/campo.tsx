import * as LabelPrimitive from '@radix-ui/react-label';
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

interface ContextoCampo {
  id: string;
  errorId: string;
  ayudaId: string;
  invalido: boolean;
  conAyuda: boolean;
}

const Contexto = createContext<ContextoCampo | null>(null);

/**
 * Asocia etiqueta, ayuda y error con su control (WCAG 1.3.1 / 3.3.1): los controles de este
 * archivo leen el contexto y ponen `id`, `aria-invalid` y `aria-describedby` solos.
 */
export function Campo({
  etiqueta,
  error,
  ayuda,
  opcional,
  className,
  children,
  id: idPropio,
}: {
  etiqueta: ReactNode;
  error?: string;
  ayuda?: ReactNode;
  opcional?: boolean;
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  const generado = useId();
  const id = idPropio ?? generado;
  const valor: ContextoCampo = {
    id,
    errorId: `${id}-error`,
    ayudaId: `${id}-ayuda`,
    invalido: Boolean(error),
    conAyuda: Boolean(ayuda),
  };
  return (
    <Contexto.Provider value={valor}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        <Label htmlFor={id}>
          {etiqueta}
          {opcional && <span className="font-normal text-muted"> (opcional)</span>}
        </Label>
        {children}
        {ayuda && !error && (
          <p id={valor.ayudaId} className="text-xs text-muted">
            {ayuda}
          </p>
        )}
        {error && (
          <p id={valor.errorId} className="text-sm font-medium text-crit">
            {error}
          </p>
        )}
      </div>
    </Contexto.Provider>
  );
}

function useAtributosCampo(props: {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: unknown;
}) {
  const c = useContext(Contexto);
  if (!c) return {};
  const describe = [
    props['aria-describedby'],
    c.invalido ? c.errorId : c.conAyuda ? c.ayudaId : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  return {
    id: props.id ?? c.id,
    'aria-invalid': (props['aria-invalid'] as boolean | undefined) ?? (c.invalido || undefined),
    'aria-describedby': describe || undefined,
  };
}

export const Label = forwardRef<
  HTMLLabelElement,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-sm font-semibold text-ink', className)}
    {...props}
  />
));
Label.displayName = 'Label';

const baseControl =
  'w-full rounded-lg border border-line bg-surface px-3 text-ink placeholder:text-muted/80 focus-visible:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-crit aria-[invalid=true]:outline-crit';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const a11y = useAtributosCampo(props);
    return (
      <input ref={ref} className={cn(baseControl, 'min-h-tap', className)} {...props} {...a11y} />
    );
  },
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 3, ...props }, ref) => {
  const a11y = useAtributosCampo(props);
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(baseControl, 'py-2.5 leading-relaxed', className)}
      {...props}
      {...a11y}
    />
  );
});
Textarea.displayName = 'Textarea';

const flecha =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235a6c73' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

/** Selector nativo: en tabletas y celulares abre el selector del sistema, el más cómodo. */
export const SelectNativo = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, style, ...props }, ref) => {
    const a11y = useAtributosCampo(props);
    return (
      <select
        ref={ref}
        className={cn(
          baseControl,
          'min-h-tap appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9',
          className,
        )}
        style={{ backgroundImage: flecha, ...style }}
        {...props}
        {...a11y}
      >
        {children}
      </select>
    );
  },
);
SelectNativo.displayName = 'SelectNativo';
