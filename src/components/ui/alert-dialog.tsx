import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button, type BotonProps } from './button';

/** Confirmación propia (nunca `window.confirm`): foco atrapado y Escape para cancelar. */
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export const AlertDialogContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay className="fixed inset-0 z-40 animate-aparecer bg-[#0b1418]/50" />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 animate-aparecer flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-xl',
        className,
      )}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
));
AlertDialogContent.displayName = 'AlertDialogContent';

export const AlertDialogTitle = forwardRef<
  HTMLHeadingElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn('font-display text-xl font-bold', className)}
    {...props}
  />
));
AlertDialogTitle.displayName = 'AlertDialogTitle';

export const AlertDialogDescription = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted', className)}
    {...props}
  />
));
AlertDialogDescription.displayName = 'AlertDialogDescription';

/** Diálogo de confirmación listo para usar. */
export function Confirmar({
  abierto,
  alCambiar,
  titulo,
  descripcion,
  children,
  textoConfirmar,
  textoCancelar = 'Volver',
  variante = 'primario',
  cargando,
  alConfirmar,
}: {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  titulo: string;
  descripcion?: ReactNode;
  children?: ReactNode;
  textoConfirmar: string;
  textoCancelar?: string;
  variante?: BotonProps['variante'];
  cargando?: boolean;
  alConfirmar: () => void;
}) {
  return (
    <AlertDialog open={abierto} onOpenChange={alCambiar}>
      <AlertDialogContent>
        <AlertDialogTitle>{titulo}</AlertDialogTitle>
        {descripcion && <AlertDialogDescription>{descripcion}</AlertDialogDescription>}
        {children}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogPrimitive.Cancel asChild>
            <Button variante="secundario">{textoCancelar}</Button>
          </AlertDialogPrimitive.Cancel>
          {/* No se usa Action: el diálogo se cierra cuando la operación termina bien. */}
          <Button variante={variante} cargando={cargando} onClick={alConfirmar}>
            {textoConfirmar}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
