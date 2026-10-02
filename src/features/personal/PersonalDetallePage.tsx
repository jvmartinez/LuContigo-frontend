import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { mensajeDeError } from '@/api/errores';
import {
  useActualizarPersonal,
  useConsultorios,
  useEspecialidades,
  useHorarios,
  usePersonal,
} from '@/api/queries/clinica';
import type { MiembroPersonal } from '@/api/tipos';
import { NOMBRE_ROL } from '@/auth/rutas';
import { useUsuario } from '@/auth/sesion';
import { Confirmar } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Campo, Input, SelectNativo } from '@/components/ui/campo';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EncabezadoPagina,
} from '@/components/ui/card';
import { Alerta, Cargando, ErrorEstado, Esqueleto, Vacio } from '@/components/ui/estados';
import { aviso } from '@/components/ui/toast';
import { resolverZod } from '@/lib/formulario';
import { ActualizarPersonalEntrada } from '@/shared/personal';
import { Ausencias } from './Ausencias';
import { HorarioEditor } from './HorarioEditor';

interface Formulario {
  nombre: string;
  especialidadId: string;
  licencia: string;
  consultorioId: string;
}

function Datos({ persona }: { persona: MiembroPersonal }) {
  const actualizar = useActualizarPersonal(persona.id);
  const especialidades = useEspecialidades();
  const consultorios = useConsultorios();
  const esMedico = persona.rol === 'MEDICO';
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm<Formulario, unknown, ActualizarPersonalEntrada>({
    resolver: resolverZod(ActualizarPersonalEntrada, (v) => ({
      nombre: v.nombre,
      licencia: v.licencia.trim() || null,
      ...(esMedico && {
        especialidadId: v.especialidadId || null,
        consultorioId: v.consultorioId || null,
      }),
    })),
    defaultValues: {
      nombre: persona.nombre,
      especialidadId: persona.especialidad?.id ?? '',
      licencia: persona.licencia ?? '',
      consultorioId: persona.consultorio?.id ?? '',
    },
  });

  // Un <select> nativo pierde su valor si se monta antes que sus opciones: se reaplica al llegar.
  useEffect(() => {
    setValue('especialidadId', getValues('especialidadId'));
    setValue('consultorioId', getValues('consultorioId'));
  }, [especialidades.data, consultorios.data, getValues, setValue]);

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((datos) =>
        actualizar.mutate(datos, {
          onSuccess: (p) => {
            reset({
              nombre: p.nombre,
              especialidadId: p.especialidad?.id ?? '',
              licencia: p.licencia ?? '',
              consultorioId: p.consultorio?.id ?? '',
            });
            aviso.exito('Datos actualizados');
          },
        }),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" error={errors.nombre?.message}>
          <Input {...register('nombre')} />
        </Campo>
        <Campo etiqueta="Licencia profesional" opcional error={errors.licencia?.message}>
          <Input className="font-mono" {...register('licencia')} />
        </Campo>
        {esMedico && (
          <>
            <Campo etiqueta="Especialidad">
              <SelectNativo {...register('especialidadId')}>
                <option value="">Sin especialidad</option>
                {especialidades.data?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} ({e.duracionCitaMin} min)
                  </option>
                ))}
              </SelectNativo>
            </Campo>
            <Campo
              etiqueta="Consultorio"
              ayuda="Sin consultorio activo no se le pueden agendar citas."
            >
              <SelectNativo {...register('consultorioId')}>
                <option value="">Sin consultorio</option>
                {consultorios.data?.map((c) => (
                  <option key={c.id} value={c.id} disabled={!c.activo}>
                    {c.nombre}
                    {!c.activo && ' (inactivo)'}
                  </option>
                ))}
              </SelectNativo>
            </Campo>
          </>
        )}
      </div>
      {actualizar.isError && <Alerta>{mensajeDeError(actualizar.error)}</Alerta>}
      <Button
        type="submit"
        className="self-start"
        cargando={actualizar.isPending}
        disabled={!isDirty}
      >
        Guardar datos
      </Button>
    </form>
  );
}

function Estado({ persona }: { persona: MiembroPersonal }) {
  const actualizar = useActualizarPersonal(persona.id);
  const [confirmando, setConfirmando] = useState(false);
  const activar = !persona.activo;
  return (
    <>
      <Button
        variante={activar ? 'secundario' : 'peligro-suave'}
        onClick={() => setConfirmando(true)}
      >
        {activar ? 'Reactivar' : 'Desactivar'}
      </Button>
      <Confirmar
        abierto={confirmando}
        alCambiar={setConfirmando}
        titulo={activar ? `¿Reactivar a ${persona.nombre}?` : `¿Desactivar a ${persona.nombre}?`}
        descripcion={
          activar
            ? 'Podrá volver a iniciar sesión.'
            : 'Se cerrarán sus sesiones y no podrá iniciar sesión. Sus citas futuras no se cancelan: revísalas con recepción.'
        }
        textoConfirmar={activar ? 'Reactivar' : 'Desactivar'}
        variante={activar ? 'primario' : 'peligro'}
        cargando={actualizar.isPending}
        alConfirmar={() =>
          actualizar.mutate(
            { activo: activar },
            {
              onSuccess: () => {
                setConfirmando(false);
                aviso.exito(activar ? 'Cuenta reactivada' : 'Cuenta desactivada');
              },
              onError: (e) => aviso.error('No se pudo cambiar el estado', mensajeDeError(e)),
            },
          )
        }
      />
    </>
  );
}

/** Ficha del personal: datos, estado, horario semanal y ausencias (RF-13, RF-14, RF-16). */
export default function PersonalDetallePage() {
  const { id = '' } = useParams();
  const { zona } = useUsuario();
  const personal = usePersonal();
  const horarios = useHorarios(id);
  const persona = personal.data?.find((p) => p.id === id);

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variante="enlace" className="mb-2">
        <Link to="/admin/personal">
          <ArrowLeft aria-hidden /> Personal
        </Link>
      </Button>
      {personal.isPending ? (
        <Cargando />
      ) : personal.isError ? (
        <ErrorEstado error={personal.error} reintentar={() => personal.refetch()} />
      ) : !persona ? (
        <Vacio titulo="No encontramos a esta persona" />
      ) : (
        <>
          <EncabezadoPagina
            titulo={persona.nombre}
            descripcion={
              <span className="flex flex-wrap items-center gap-2">
                {NOMBRE_ROL[persona.rol]} · {persona.email}
                {persona.activo ? <Badge tono="good">Activo</Badge> : <Badge>Inactivo</Badge>}
              </span>
            }
            acciones={<Estado persona={persona} />}
          />
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Datos</CardTitle>
              </CardHeader>
              <CardContent>
                <Datos key={persona.id} persona={persona} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Horario semanal</CardTitle>
              </CardHeader>
              <CardContent>
                {horarios.isPending ? (
                  <Esqueleto className="h-32" />
                ) : horarios.isError ? (
                  <ErrorEstado error={horarios.error} reintentar={() => horarios.refetch()} />
                ) : (
                  <HorarioEditor
                    key={horarios.dataUpdatedAt}
                    personalId={id}
                    bloques={horarios.data.bloques}
                  />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ausencias</CardTitle>
              </CardHeader>
              <CardContent>
                <Ausencias personalId={id} zona={zona} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
