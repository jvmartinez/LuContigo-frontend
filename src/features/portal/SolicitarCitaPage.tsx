import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { esErrorApi, mensajeDeError } from '@/api/errores';
import { claves } from '@/api/queries/claves';
import { useCrearCita } from '@/api/queries/citas';
import { useEspecialidades, useMedicos } from '@/api/queries/clinica';
import { useUsuario } from '@/auth/sesion';
import { ERRORES_DE_HORA, MENSAJE_OCUPADO, SelectorHora } from '@/components/SelectorHora';
import { Button } from '@/components/ui/button';
import { Campo, Input, SelectNativo, Textarea } from '@/components/ui/campo';
import { Card, CardContent, EncabezadoPagina } from '@/components/ui/card';
import { Alerta } from '@/components/ui/estados';
import { aviso } from '@/components/ui/toast';
import { fechaHoraCorta, hoyEn, sumarDias } from '@/lib/fechas';
import { resolverZod, sinVacios } from '@/lib/formulario';
import { CrearCitaEntrada } from '@/shared/citas';

interface Formulario {
  especialidadId: string;
  medicoId: string;
  fecha: string;
  hora: string;
  motivo: string;
}

/** Solicitar cita: especialidad → médico → fecha → hora libre → motivo (§6). */
export default function SolicitarCitaPage() {
  const { zona } = useUsuario();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const especialidades = useEspecialidades();
  const medicos = useMedicos();
  const crear = useCrearCita();
  const manana = sumarDias(hoyEn(zona), 1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Formulario, unknown, CrearCitaEntrada>({
    resolver: resolverZod(
      CrearCitaEntrada,
      (v) =>
        sinVacios({
          medicoId: v.medicoId,
          inicio: v.hora,
          motivo: v.motivo,
          canalOrigen: 'PORTAL_WEB',
        }),
      (ruta) => (ruta === 'inicio' ? 'hora' : ruta),
    ),
    defaultValues: { especialidadId: '', medicoId: '', fecha: manana, hora: '', motivo: '' },
  });

  const especialidadId = watch('especialidadId');
  const medicoId = watch('medicoId');
  const fecha = watch('fecha');
  const medicosFiltrados = (medicos.data ?? []).filter(
    (m) => !especialidadId || m.especialidad?.id === especialidadId,
  );

  const enviar = handleSubmit((datos) =>
    crear.mutate(datos, {
      onSuccess: (cita) => {
        aviso.exito(
          '¡Cita agendada!',
          `${fechaHoraCorta(cita.inicio, zona)} con ${cita.medico.nombre}.`,
        );
        navigate('/mis-citas');
      },
      onError: (e) => {
        if (esErrorApi(e, 'HORARIO_OCUPADO')) {
          void qc.invalidateQueries({ queryKey: claves.disponibilidad(datos.medicoId) });
          setValue('hora', '');
          setError('hora', { message: MENSAJE_OCUPADO });
        } else if (ERRORES_DE_HORA.some((c) => esErrorApi(e, c))) {
          setError('hora', { message: mensajeDeError(e) });
        }
      },
    }),
  );

  const errorGeneral = crear.isError && !ERRORES_DE_HORA.some((c) => esErrorApi(crear.error, c));

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variante="enlace" className="mb-2">
        <Link to="/mis-citas">
          <ArrowLeft aria-hidden /> Mis citas
        </Link>
      </Button>
      <EncabezadoPagina titulo="Solicitar cita" descripcion="Solo te mostramos horarios libres." />
      <Card>
        <CardContent className="pt-4">
          <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
            <Campo etiqueta="1. Especialidad">
              <SelectNativo
                {...register('especialidadId', {
                  onChange: () => {
                    setValue('medicoId', '');
                    setValue('hora', '');
                  },
                })}
              >
                <option value="">Todas las especialidades</option>
                {especialidades.data?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </SelectNativo>
            </Campo>
            <Campo etiqueta="2. Médico" error={errors.medicoId?.message && 'Elige un médico'}>
              <SelectNativo {...register('medicoId', { onChange: () => setValue('hora', '') })}>
                <option value="">
                  {medicos.isPending ? 'Cargando médicos…' : 'Elige un médico'}
                </option>
                {medicosFiltrados.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                    {m.especialidad ? ` — ${m.especialidad.nombre}` : ''}
                  </option>
                ))}
              </SelectNativo>
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="3. Fecha">
                <Input
                  type="date"
                  min={hoyEn(zona)}
                  {...register('fecha', { onChange: () => setValue('hora', '') })}
                />
              </Campo>
              <Campo etiqueta="4. Hora libre" error={errors.hora?.message}>
                <SelectorHora
                  medicoId={medicoId || undefined}
                  fecha={fecha}
                  zona={zona}
                  {...register('hora')}
                />
              </Campo>
            </div>
            <Campo etiqueta="5. Motivo" opcional error={errors.motivo?.message}>
              <Textarea
                placeholder="Cuéntanos brevemente por qué quieres la cita"
                {...register('motivo')}
              />
            </Campo>
            {errorGeneral && <Alerta>{mensajeDeError(crear.error)}</Alerta>}
            <Button type="submit" tamano="lg" cargando={crear.isPending}>
              Solicitar cita
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
