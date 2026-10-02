import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { mensajeDeError } from '@/api/errores';
import { useLogin } from '@/api/queries/auth';
import { RUTA_INICIO, rutaPermitida } from '@/auth/rutas';
import { Button } from '@/components/ui/button';
import { Campo, Input } from '@/components/ui/campo';
import { Alerta } from '@/components/ui/estados';
import { resolverZod } from '@/lib/formulario';
import { LoginEntrada } from '@/shared/auth';
import { PantallaAcceso } from './PantallaAcceso';

interface Formulario {
  email: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario, unknown, LoginEntrada>({
    resolver: resolverZod(LoginEntrada),
    defaultValues: { email: '', password: '' },
  });

  const enviar = handleSubmit((datos) =>
    login.mutate(datos, {
      onSuccess: (sesion) => {
        const siguiente = params.get('siguiente');
        const destino =
          siguiente && rutaPermitida(sesion.rol, siguiente) ? siguiente : RUTA_INICIO[sesion.rol];
        navigate(destino, { replace: true });
      },
    }),
  );

  return (
    <PantallaAcceso
      titulo="Inicia sesión"
      descripcion="Entra con el email y la contraseña de tu cuenta."
    >
      {params.get('expirada') && !login.isError && (
        <Alerta tipo="aviso" className="mb-4">
          Tu sesión terminó por inactividad. Vuelve a iniciar sesión para continuar.
        </Alerta>
      )}
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <Campo etiqueta="Email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="username"
            inputMode="email"

            {...register('email')}
          />
        </Campo>
        <Campo etiqueta="Contraseña" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Campo>
        {login.isError && <Alerta>{mensajeDeError(login.error)}</Alerta>}
        <Button type="submit" tamano="lg" cargando={login.isPending}>
          Entrar
        </Button>
        <Link
          to="/olvide-contrasena"
          className="text-center text-sm font-medium text-accent hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
    </PantallaAcceso>
  );
}
