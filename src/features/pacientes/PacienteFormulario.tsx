import type { ReactNode } from 'react';
import { useForm, type DefaultValues } from 'react-hook-form';
import type { z } from 'zod';
import { mensajeDeError } from '@/api/errores';
import type { Paciente } from '@/api/tipos';
import { Button } from '@/components/ui/button';
import { Campo, Input, SelectNativo, Textarea } from '@/components/ui/campo';
import { Alerta } from '@/components/ui/estados';
import { erroresDeApiEnFormulario, resolverZod, sinVacios } from '@/lib/formulario';
import { ActualizarPacienteEntrada, CrearPacienteEntrada } from '@/shared/pacientes';

export interface FormularioPaciente {
  nombres: string;
  apellidos: string;
  documento: string;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  alergias: string;
  antecedentes: string;
  seguro: string;
  canalPreferido: string;
  consentimientoDatos: boolean;
  crearAccesoPortal: boolean;
}

const CAMPOS = [
  'nombres',
  'apellidos',
  'documento',
  'fechaNacimiento',
  'telefono',
  'email',
  'alergias',
  'antecedentes',
  'seguro',
  'canalPreferido',
  'consentimientoDatos',
  'crearAccesoPortal',
] as const;

export function valoresDesdePaciente(p: Paciente): FormularioPaciente {
  return {
    nombres: p.nombres,
    apellidos: p.apellidos,
    documento: p.documento,
    fechaNacimiento: p.fechaNacimiento,
    telefono: p.telefono ?? '',
    email: p.email ?? '',
    alergias: p.alergias ?? '',
    antecedentes: p.antecedentes ?? '',
    seguro: p.seguro ?? '',
    canalPreferido: p.canalPreferido ?? '',
    consentimientoDatos: true,
    crearAccesoPortal: p.tieneAccesoPortal,
  };
}

const VACIO: FormularioPaciente = {
  nombres: '',
  apellidos: '',
  documento: '',
  fechaNacimiento: '',
  telefono: '',
  email: '',
  alergias: '',
  antecedentes: '',
  seguro: '',
  canalPreferido: '',
  consentimientoDatos: false,
  crearAccesoPortal: false,
};

type Props<S extends typeof CrearPacienteEntrada | typeof ActualizarPacienteEntrada> = {
  modo: S extends typeof CrearPacienteEntrada ? 'crear' : 'editar';
  valores?: DefaultValues<FormularioPaciente>;
  guardando: boolean;
  error: unknown;
  alGuardar: (datos: z.output<S>) => Promise<unknown>;
  acciones?: ReactNode;
};

/** Registro y edición de datos demográficos (RF-06). Valida con los esquemas compartidos. */
export function PacienteFormulario<
  S extends typeof CrearPacienteEntrada | typeof ActualizarPacienteEntrada,
>({ modo, valores, guardando, error, alGuardar, acciones }: Props<S>) {
  const crear = modo === 'crear';
  const esquema = (crear ? CrearPacienteEntrada : ActualizarPacienteEntrada) as S;
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormularioPaciente, unknown, z.output<S>>({
    resolver: resolverZod(esquema, (v) => {
      const { consentimientoDatos, crearAccesoPortal, ...datos } = v;
      return crear
        ? { ...sinVacios(datos), consentimientoDatos, crearAccesoPortal }
        : sinVacios(datos);
    }),
    defaultValues: { ...VACIO, ...valores },
  });

  const enviar = handleSubmit(async (datos) => {
    try {
      await alGuardar(datos);
    } catch (e) {
      erroresDeApiEnFormulario(e, setError, CAMPOS);
    }
  });

  const accesoPortal = watch('crearAccesoPortal');

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-lg font-bold">Identificación</legend>
        <Campo etiqueta="Nombres" error={errors.nombres?.message}>
          <Input autoComplete="off" {...register('nombres')} />
        </Campo>
        <Campo etiqueta="Apellidos" error={errors.apellidos?.message}>
          <Input autoComplete="off" {...register('apellidos')} />
        </Campo>
        <Campo etiqueta="Documento" error={errors.documento?.message}>
          <Input className="font-mono" autoComplete="off" {...register('documento')} />
        </Campo>
        <Campo etiqueta="Fecha de nacimiento" error={errors.fechaNacimiento?.message}>
          <Input type="date" {...register('fechaNacimiento')} />
        </Campo>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-lg font-bold">Contacto</legend>
        <Campo
          etiqueta="Teléfono"
          opcional
          error={errors.telefono?.message}
          ayuda="Formato internacional, p. ej. +573001234567"
        >
          <Input type="tel" inputMode="tel" className="font-mono" {...register('telefono')} />
        </Campo>
        <Campo etiqueta="Email" opcional={!accesoPortal} error={errors.email?.message}>
          <Input type="email" inputMode="email" {...register('email')} />
        </Campo>
        <Campo
          etiqueta="Canal preferido para recordatorios"
          opcional
          error={errors.canalPreferido?.message}
        >
          <SelectNativo {...register('canalPreferido')}>
            <option value="">Automático (según los datos de contacto)</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
            <option value="PUSH">Notificación de la app</option>
          </SelectNativo>
        </Campo>
        <Campo etiqueta="Seguro médico" opcional error={errors.seguro?.message}>
          <Input {...register('seguro')} />
        </Campo>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-3 font-display text-lg font-bold">Datos clínicos</legend>
        <Campo
          etiqueta="Alergias"
          opcional
          error={errors.alergias?.message}
          ayuda="Se mostrará en rojo a enfermería y al médico."
        >
          <Textarea rows={2} {...register('alergias')} />
        </Campo>
        <Campo etiqueta="Antecedentes" opcional error={errors.antecedentes?.message}>
          <Textarea rows={3} {...register('antecedentes')} />
        </Campo>
      </fieldset>

      {crear && (
        <fieldset className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-4">
          <legend className="sr-only">Consentimiento y acceso</legend>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
              aria-invalid={Boolean(errors.consentimientoDatos) || undefined}
              aria-describedby={errors.consentimientoDatos ? 'error-consentimiento' : undefined}
              {...register('consentimientoDatos')}
            />
            <span>
              <span className="font-semibold">
                El paciente autoriza el tratamiento de sus datos personales
              </span>
              <span className="block text-sm text-muted">
                Obligatorio para registrarlo. Se guarda la fecha del consentimiento.
              </span>
            </span>
          </label>
          {errors.consentimientoDatos && (
            <p id="error-consentimiento" className="text-sm font-medium text-crit">
              {errors.consentimientoDatos.message}
            </p>
          )}
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
              {...register('crearAccesoPortal')}
            />
            <span>
              <span className="font-semibold">Crear acceso al portal de pacientes</span>
              <span className="block text-sm text-muted">
                Le enviaremos una invitación al email para crear su contraseña.
              </span>
            </span>
          </label>
        </fieldset>
      )}

      {error !== null && error !== undefined && <Alerta>{mensajeDeError(error)}</Alerta>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" cargando={guardando} disabled={!crear && !isDirty}>
          {crear ? 'Registrar paciente' : 'Guardar cambios'}
        </Button>
        {acciones}
      </div>
    </form>
  );
}
