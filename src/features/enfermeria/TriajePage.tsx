import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mensajeDeError } from '@/api/errores';
import { useCola, useRegistrarSignos } from '@/api/queries/enfermeria';
import type { CitaEnCola } from '@/api/tipos';
import { useUsuario } from '@/auth/sesion';
import { AlertaAlergia } from '@/components/AlertaAlergia';
import { Button } from '@/components/ui/button';
import { Campo, Input, Textarea } from '@/components/ui/campo';
import { Card, CardContent, EncabezadoPagina } from '@/components/ui/card';
import { Alerta, Cargando, ErrorEstado, Vacio } from '@/components/ui/estados';
import { aviso } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { horaEn, hoyEn } from '@/lib/fechas';
import { erroresDeApiEnFormulario, resolverZod } from '@/lib/formulario';
import {
  calcularAlertas,
  calcularImc,
  categoriaImc,
  etiquetaAlerta,
  leerPresion,
  nivelSigno,
  RANGOS_SIGNOS,
  type CampoSigno,
  type NivelSigno,
} from '@/lib/signos';
import { SignosVitalesEntrada } from '@/shared/signos-vitales';

export interface FormularioTriaje {
  presion: string;
  frecuenciaCardiaca: string;
  temperatura: string;
  spo2: string;
  pesoKg: string;
  tallaCm: string;
  nota: string;
}

const numero = (texto: string): number | undefined => {
  const limpio = texto.trim().replace(',', '.');
  return limpio === '' ? undefined : Number(limpio);
};

/** Convierte el formulario (texto) en la entrada de la API. */
export function aSignos(v: FormularioTriaje): SignosVitalesEntrada {
  const presion = leerPresion(v.presion);
  const p = presion && presion !== 'invalida' ? presion : undefined;
  const datos = {
    presionSistolica: p?.sistolica,
    presionDiastolica: p?.diastolica,
    frecuenciaCardiaca: numero(v.frecuenciaCardiaca),
    temperatura: numero(v.temperatura),
    spo2: numero(v.spo2),
    pesoKg: numero(v.pesoKg),
    tallaCm: numero(v.tallaCm),
    nota: v.nota.trim() || undefined,
  };
  return Object.fromEntries(
    Object.entries(datos).filter(([, x]) => x !== undefined),
  ) as SignosVitalesEntrada;
}

const base = resolverZod<FormularioTriaje, typeof SignosVitalesEntrada>(
  SignosVitalesEntrada,
  aSignos,
  (ruta) => (ruta === 'presionSistolica' || ruta === 'presionDiastolica' ? 'presion' : ruta),
);

const resolver: Resolver<FormularioTriaje, unknown, SignosVitalesEntrada> = async (
  valores,
  ctx,
  opciones,
) => {
  if (leerPresion(valores.presion) === 'invalida') {
    return {
      values: {},
      errors: { presion: { type: 'formato', message: 'Escribe la presión como 120/80' } },
    };
  }
  const { nota: _nota, ...medidas } = aSignos(valores);
  if (Object.keys(medidas).length === 0) {
    return {
      values: {},
      errors: { root: { type: 'vacio', message: 'Registra al menos un signo vital.' } },
    };
  }
  return base(valores, ctx, opciones);
};

const RANGO = (campo: CampoSigno) => `${RANGOS_SIGNOS[campo][0]}–${RANGOS_SIGNOS[campo][1]}`;

function Aviso({ nivel, rango, alerta }: { nivel: NivelSigno; rango: string; alerta?: string }) {
  if (nivel === 'normal') return null;
  return (
    <p className="text-sm font-semibold text-crit">
      {nivel === 'fuera-de-rango' ? `Fuera del rango aceptado (${rango})` : `Alerta: ${alerta}`}
    </p>
  );
}

function CampoSignoVital({
  etiqueta,
  unidad,
  nivel,
  error,
  aviso: textoAviso,
  children,
}: {
  etiqueta: string;
  unidad: string;
  nivel: NivelSigno;
  error?: string;
  aviso?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        nivel !== 'normal' ? 'border-crit bg-crit-soft' : 'border-line',
      )}
    >
      <Campo etiqueta={`${etiqueta} (${unidad})`} error={error}>
        {children}
      </Campo>
      {!error && <div aria-live="polite">{textoAviso}</div>}
    </div>
  );
}

function FormularioSignos({ cita }: { cita: CitaEnCola }) {
  const navigate = useNavigate();
  const registrar = useRegistrarSignos(cita.id);
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormularioTriaje, unknown, SignosVitalesEntrada>({
    resolver,
    defaultValues: {
      presion: '',
      frecuenciaCardiaca: '',
      temperatura: '',
      spo2: '',
      pesoKg: '',
      tallaCm: '',
      nota: '',
    },
  });

  const valores = watch();
  const edad = cita.paciente.edad;
  const presion = leerPresion(valores.presion);
  const p = presion && presion !== 'invalida' ? presion : undefined;
  const nivelPa = [
    nivelSigno('presionSistolica', p?.sistolica, edad),
    nivelSigno('presionDiastolica', p?.diastolica, edad),
  ];
  const nivel = {
    presion: nivelPa.includes('fuera-de-rango')
      ? 'fuera-de-rango'
      : nivelPa.includes('alerta')
        ? 'alerta'
        : 'normal',
    frecuenciaCardiaca: nivelSigno('frecuenciaCardiaca', numero(valores.frecuenciaCardiaca), edad),
    temperatura: nivelSigno('temperatura', numero(valores.temperatura), edad),
    spo2: nivelSigno('spo2', numero(valores.spo2), edad),
    pesoKg: nivelSigno('pesoKg', numero(valores.pesoKg), edad),
    tallaCm: nivelSigno('tallaCm', numero(valores.tallaCm), edad),
  } satisfies Record<string, NivelSigno>;

  const peso = numero(valores.pesoKg);
  const talla = numero(valores.tallaCm);
  const imc =
    peso && talla && nivel.pesoKg === 'normal' && nivel.tallaCm === 'normal'
      ? calcularImc(peso, talla)
      : null;
  const alertas = calcularAlertas(aSignos({ ...valores, presion: p ? valores.presion : '' }), edad);

  const enviar = handleSubmit((datos) =>
    registrar.mutate(datos, {
      onSuccess: (r) => {
        aviso.exito(
          `${cita.paciente.nombres} está listo para el médico`,
          r.alertas.length
            ? `Alertas: ${r.alertas.map(etiquetaAlerta).join(', ')}.`
            : 'Signos registrados sin alertas.',
        );
        navigate('/enfermeria');
      },
      onError: (e) =>
        erroresDeApiEnFormulario(e, setError, [
          'frecuenciaCardiaca',
          'temperatura',
          'spo2',
          'pesoKg',
          'tallaCm',
          'nota',
        ]),
    }),
  );

  const alertaTexto = (a: string) => (alertas.includes(a) ? etiquetaAlerta(a) : undefined);

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CampoSignoVital
          etiqueta="Presión arterial"
          unidad="mmHg"
          nivel={nivel.presion}
          error={errors.presion?.message}
          aviso={
            <Aviso
              nivel={nivel.presion}
              rango="50–260 / 30–160"
              alerta={alertaTexto('PRESION_ALTA')}
            />
          }
        >
          <Input
            inputMode="numeric"
            placeholder="120/80"
            className="font-mono text-lg"

            {...register('presion')}
          />
        </CampoSignoVital>
        <CampoSignoVital
          etiqueta="Frecuencia cardiaca"
          unidad="lpm"
          nivel={nivel.frecuenciaCardiaca}
          error={errors.frecuenciaCardiaca?.message}
          aviso={
            <Aviso
              nivel={nivel.frecuenciaCardiaca}
              rango={RANGO('frecuenciaCardiaca')}
              alerta={alertaTexto('TAQUICARDIA')}
            />
          }
        >
          <Input
            inputMode="numeric"
            placeholder="72"
            className="font-mono text-lg"
            {...register('frecuenciaCardiaca')}
          />
        </CampoSignoVital>
        <CampoSignoVital
          etiqueta="Temperatura"
          unidad="°C"
          nivel={nivel.temperatura}
          error={errors.temperatura?.message}
          aviso={
            <Aviso
              nivel={nivel.temperatura}
              rango={RANGO('temperatura')}
              alerta={alertaTexto('FIEBRE')}
            />
          }
        >
          <Input
            inputMode="decimal"
            placeholder="36.5"
            className="font-mono text-lg"
            {...register('temperatura')}
          />
        </CampoSignoVital>
        <CampoSignoVital
          etiqueta="SpO₂"
          unidad="%"
          nivel={nivel.spo2}
          error={errors.spo2?.message}
          aviso={
            <Aviso
              nivel={nivel.spo2}
              rango={RANGO('spo2')}
              alerta={alertaTexto('SATURACION_BAJA')}
            />
          }
        >
          <Input
            inputMode="numeric"
            placeholder="98"
            className="font-mono text-lg"
            {...register('spo2')}
          />
        </CampoSignoVital>
        <CampoSignoVital
          etiqueta="Peso"
          unidad="kg"
          nivel={nivel.pesoKg}
          error={errors.pesoKg?.message}
          aviso={<Aviso nivel={nivel.pesoKg} rango={RANGO('pesoKg')} />}
        >
          <Input
            inputMode="decimal"
            placeholder="70.5"
            className="font-mono text-lg"
            {...register('pesoKg')}
          />
        </CampoSignoVital>
        <CampoSignoVital
          etiqueta="Talla"
          unidad="cm"
          nivel={nivel.tallaCm}
          error={errors.tallaCm?.message}
          aviso={<Aviso nivel={nivel.tallaCm} rango={RANGO('tallaCm')} />}
        >
          <Input
            inputMode="decimal"
            placeholder="168"
            className="font-mono text-lg"
            {...register('tallaCm')}
          />
        </CampoSignoVital>
      </div>

      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-line bg-surface-2 px-4 py-3"
        aria-live="polite"
      >
        <p>
          <span className="text-sm text-muted">IMC: </span>
          <output className="font-mono text-xl font-medium">{imc ? imc.toFixed(1) : '—'}</output>
          {imc && <span className="ml-2 text-sm text-muted">{categoriaImc(imc)}</span>}
        </p>
        {alertas.length > 0 && (
          <p className="text-sm font-bold text-crit">
            Alertas: {alertas.map(etiquetaAlerta).join(', ')}
          </p>
        )}
      </div>

      <Campo etiqueta="Nota" opcional error={errors.nota?.message}>
        <Textarea placeholder="Ej.: refiere cefalea leve desde ayer" {...register('nota')} />
      </Campo>

      {errors.root && <Alerta>{errors.root.message}</Alerta>}
      {registrar.isError && <Alerta>{mensajeDeError(registrar.error)}</Alerta>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" tamano="lg" cargando={registrar.isPending}>
          Guardar signos y pasar a “Listo”
        </Button>
        <Button asChild variante="secundario" tamano="lg">
          <Link to="/enfermeria">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

/** Triaje y signos vitales (RF-09). La alergia del paciente siempre arriba y en rojo. */
export default function TriajePage() {
  const { citaId = '' } = useParams();
  const { zona } = useUsuario();
  const cola = useCola(hoyEn(zona));
  const cita = cola.data?.citas.find((c) => c.id === citaId);

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variante="enlace" className="mb-2">
        <Link to="/enfermeria">
          <ArrowLeft aria-hidden /> Sala de espera
        </Link>
      </Button>
      {cola.isPending ? (
        <Cargando />
      ) : cola.isError ? (
        <ErrorEstado error={cola.error} reintentar={() => cola.refetch()} />
      ) : !cita ? (
        <Vacio
          titulo="Esta cita no está en tu sala de espera"
          descripcion="Puede que ya la hayan atendido o que su médico no esté asignado a ti hoy."
          accion={
            <Button asChild variante="secundario">
              <Link to="/enfermeria">Volver a la sala de espera</Link>
            </Button>
          }
        />
      ) : (
        <>
          <AlertaAlergia alergias={cita.paciente.alergias} className="mb-4" />
          <EncabezadoPagina
            titulo={`${cita.paciente.nombres} ${cita.paciente.apellidos}`}
            descripcion={`${cita.paciente.edad} años · cita ${horaEn(cita.inicio, zona)} con ${cita.medico.nombre} · ${cita.consultorio.nombre}`}
          />
          {cita.estado === 'LISTA' ? (
            <Alerta tipo="info">
              Ya se registraron los signos de esta cita; el paciente está listo para el médico.
            </Alerta>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <FormularioSignos cita={cita} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
