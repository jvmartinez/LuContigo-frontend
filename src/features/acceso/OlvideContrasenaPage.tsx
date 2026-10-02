import { MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { mensajeDeError } from '@/api/errores';
import { useOlvideContrasena } from '@/api/queries/auth';
import { Button } from '@/components/ui/button';
import { Campo, Input } from '@/components/ui/campo';
import { Alerta } from '@/components/ui/estados';
import { resolverZod } from '@/lib/formulario';
import { OlvideContrasenaEntrada } from '@/shared/auth';
import { PantallaAcceso } from './PantallaAcceso';

export default function OlvideContrasenaPage() {
  const olvide = useOlvideContrasena();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }, unknown, { email: string }>({
    resolver: resolverZod(OlvideContrasenaEntrada),
    defaultValues: { email: '' },
  });

  if (olvide.isSuccess) {
    return (
      <PantallaAcceso titulo="Revisa tu correo">
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-10 text-good" aria-hidden />
          <p role="status">
            Si el email está registrado, te enviamos un enlace para crear una contraseña nueva.
            Vence en poco tiempo: úsalo pronto.
          </p>
          <Link to="/login" className="font-medium text-accent hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso
      titulo="Recupera tu acceso"
      descripcion="Escribe tu email y te enviaremos un enlace para restablecer la contraseña."
    >
      <form
        onSubmit={handleSubmit((d) => olvide.mutate(d))}
        noValidate
        className="flex flex-col gap-4"
      >
        <Campo etiqueta="Email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"

            {...register('email')}
          />
        </Campo>
        {olvide.isError && <Alerta>{mensajeDeError(olvide.error)}</Alerta>}
        <Button type="submit" tamano="lg" cargando={olvide.isPending}>
          Enviar enlace
        </Button>
        <Link to="/login" className="text-center text-sm font-medium text-accent hover:underline">
          Volver a iniciar sesión
        </Link>
      </form>
    </PantallaAcceso>
  );
}
