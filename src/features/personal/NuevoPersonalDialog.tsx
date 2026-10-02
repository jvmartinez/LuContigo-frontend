import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { mensajeDeError } from '@/api/errores';
import { useConsultorios, useCrearPersonal, useEspecialidades } from '@/api/queries/clinica';
import { NOMBRE_ROL } from '@/auth/rutas';
import { Button } from '@/components/ui/button';
import { Campo, Input, SelectNativo } from '@/components/ui/campo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alerta } from '@/components/ui/estados';
import { aviso } from '@/components/ui/toast';
import { erroresDeApiEnFormulario, resolverZod, sinVacios } from '@/lib/formulario';
import { CrearPersonalEntrada } from '@/shared/personal';

interface Formulario {
  nombre: string;
  email: string;
  rol: string;
  especialidadId: string;
  licencia: string;
  consultorioId: string;
}

/** Alta de personal: crea el usuario y lo invita por email (RF-13). */
export function NuevoPersonalDialog({
  abierto,
  alCambiar,
}: {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
}) {
  const navigate = useNavigate();
  const crear = useCrearPersonal();
  const especialidades = useEspecialidades();
  const consultorios = useConsultorios();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<Formulario, unknown, CrearPersonalEntrada>({
    resolver: resolverZod(CrearPersonalEntrada, (v) => sinVacios({ ...v })),
    defaultValues: {
      nombre: '',
      email: '',
      rol: 'MEDICO',
      especialidadId: '',
      licencia: '',
      consultorioId: '',
    },
  });
  const esMedico = watch('rol') === 'MEDICO';

  const cerrar = (abierto: boolean) => {
    if (!abierto) {
      reset();
      crear.reset();
    }
    alCambiar(abierto);
  };

  return (
    <Dialog open={abierto} onOpenChange={cerrar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar personal</DialogTitle>
          <DialogDescription>Le enviaremos un email para que cree su contraseña.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((datos) =>
            crear.mutate(
              esMedico ? datos : { ...datos, especialidadId: undefined, consultorioId: undefined },
              {
                onSuccess: (p) => {
                  aviso.exito(`${p.nombre} fue agregado`, 'Invitación enviada por email.');
                  cerrar(false);
                  navigate(`/admin/personal/${p.id}`);
                },
                onError: (e) =>
                  erroresDeApiEnFormulario(e, setError, [
                    'nombre',
                    'email',
                    'especialidadId',
                    'consultorioId',
                  ]),
              },
            ),
          )}
        >
          <Campo etiqueta="Nombre completo" error={errors.nombre?.message}>
            <Input placeholder="Dra. Laura Méndez" {...register('nombre')} />
          </Campo>
          <Campo etiqueta="Email" error={errors.email?.message}>
            <Input type="email" inputMode="email" {...register('email')} />
          </Campo>
          <Campo etiqueta="Rol" error={errors.rol?.message}>
            <SelectNativo {...register('rol')}>
              {(['MEDICO', 'ENFERMERA', 'RECEPCION', 'ADMIN'] as const).map((r) => (
                <option key={r} value={r}>
                  {NOMBRE_ROL[r]}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          {esMedico && (
            <>
              <Campo etiqueta="Especialidad" error={errors.especialidadId?.message}>
                <SelectNativo {...register('especialidadId')}>
                  <option value="">Sin especialidad</option>
                  {especialidades.data?.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </SelectNativo>
              </Campo>
              <Campo
                etiqueta="Consultorio"
                error={errors.consultorioId?.message}
                ayuda="Necesario para poder agendarle citas."
              >
                <SelectNativo {...register('consultorioId')}>
                  <option value="">Sin consultorio</option>
                  {consultorios.data
                    ?.filter((c) => c.activo)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                </SelectNativo>
              </Campo>
            </>
          )}
          <Campo etiqueta="Licencia profesional" opcional error={errors.licencia?.message}>
            <Input className="font-mono" {...register('licencia')} />
          </Campo>
          {crear.isError && <Alerta>{mensajeDeError(crear.error)}</Alerta>}
          <DialogFooter>
            <Button type="button" variante="secundario" onClick={() => cerrar(false)}>
              Cancelar
            </Button>
            <Button type="submit" cargando={crear.isPending}>
              Agregar e invitar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
