import { CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { esErrorApi, mensajeDeError } from '@/api/errores';
import { useRestablecerContrasena } from '@/api/queries/auth';
import { Button } from '@/components/ui/button';
import { Campo, Input } from '@/components/ui/campo';
import { Alerta } from '@/components/ui/estados';
import { resolverZod } from '@/lib/formulario';
import { Contrasena } from '@/shared/auth';
import { PantallaAcceso } from './PantallaAcceso';

const Esquema = z
  .object({ password: Contrasena, repetir: z.string() })
  .refine((v) => v.password === v.repetir, {
    message: 'Las contraseñas no coinciden',
    path: ['repetir'],
  });

type Formulario = z.input<typeof Esquema>;

export default function RestablecerPage() {
  const { token = '' } = useParams();
  const restablecer = useRestablecerContrasena();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario, unknown, z.output<typeof Esquema>>({
    resolver: resolverZod(Esquema),
    defaultValues: { password: '', repetir: '' },
  });

  if (restablecer.isSuccess) {
    return (
      <PantallaAcceso titulo="Contraseña actualizada">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-10 text-good" aria-hidden />
          <p role="status">Ya puedes iniciar sesión con tu contraseña nueva.</p>
          <Button asChild>
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso
      titulo="Crea tu contraseña"
      descripcion="Usa al menos 10 caracteres, con letras y números."
    >
      <form
        onSubmit={handleSubmit(({ password }) => restablecer.mutate({ token, password }))}
        noValidate
        className="flex flex-col gap-4"
      >
        <Campo etiqueta="Contraseña nueva" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Campo>
        <Campo etiqueta="Repite la contraseña" error={errors.repetir?.message}>
          <Input type="password" autoComplete="new-password" {...register('repetir')} />
        </Campo>
        {restablecer.isError && (
          <Alerta>
            {mensajeDeError(restablecer.error)}{' '}
            {esErrorApi(restablecer.error, 'TOKEN_INVALIDO') && (
              <Link to="/olvide-contrasena" className="font-semibold underline">
                Pide un enlace nuevo.
              </Link>
            )}
          </Alerta>
        )}
        <Button type="submit" tamano="lg" cargando={restablecer.isPending}>
          Guardar contraseña
        </Button>
      </form>
    </PantallaAcceso>
  );
}
