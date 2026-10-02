import { formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, CloudOff, Loader2, Save } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { mensajeDeError } from '@/api/errores';
import { useCerrarConsulta, useGuardarBorrador } from '@/api/queries/consulta';
import type { Consulta } from '@/api/tipos';
import { Confirmar } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Campo, Input, Textarea } from '@/components/ui/campo';
import { Alerta } from '@/components/ui/estados';
import { aviso } from '@/components/ui/toast';
import type { GuardarConsultaEntrada } from '@/shared/consulta';
import { borrarRespaldo, guardarRespaldo, leerRespaldo } from './respaldo';

/** El borrador se guarda solo cada 10 s si hubo cambios (§6). */
export const INTERVALO_AUTOGUARDADO_MS = 10_000;

export interface FormularioNota {
  motivo: string;
  examenFisico: string;
  diagnostico: string;
  cie10: string;
  tratamiento: string;
  indicaciones: string;
}

const CIE10 = /^[A-Z]\d{2}(\.\d{1,4})?$/i;

const VACIA: FormularioNota = {
  motivo: '',
  examenFisico: '',
  diagnostico: '',
  cie10: '',
  tratamiento: '',
  indicaciones: '',
};

function desdeServidor(c: Consulta | null, motivoCita: string | null): FormularioNota {
  if (!c) return { ...VACIA, motivo: motivoCita ?? '' };
  return {
    motivo: c.motivo ?? '',
    examenFisico: c.examenFisico ?? '',
    diagnostico: c.diagnostico ?? '',
    cie10: c.cie10 ?? '',
    tratamiento: c.tratamiento ?? '',
    indicaciones: c.indicaciones ?? '',
  };
}

/** Convierte el formulario en la entrada de la API; el CIE-10 vacío o inválido no se envía. */
function aEntrada(v: FormularioNota): GuardarConsultaEntrada {
  const { cie10, ...resto } = v;
  const limpio = cie10.trim().toUpperCase();
  return { ...resto, ...(CIE10.test(limpio) && { cie10: limpio }) };
}

type EstadoGuardado =
  | { tipo: 'sin-cambios' }
  | { tipo: 'pendiente' }
  | { tipo: 'guardando' }
  | { tipo: 'guardado'; en: Date }
  | { tipo: 'error'; mensaje: string };

function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  const [, refrescar] = useState(0);
  useEffect(() => {
    const id = setInterval(() => refrescar((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);
  const contenido = {
    'sin-cambios': null,
    pendiente: <span className="text-muted">Cambios sin guardar</span>,
    guardando: (
      <span className="flex items-center gap-1 text-muted">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Guardando borrador…
      </span>
    ),
    guardado:
      estado.tipo === 'guardado' ? (
        <span className="flex items-center gap-1 text-good">
          <CheckCircle2 className="size-3.5" aria-hidden /> Borrador guardado hace{' '}
          {formatDistanceToNowStrict(estado.en, { locale: es })}
        </span>
      ) : null,
    error:
      estado.tipo === 'error' ? (
        <span className="flex items-center gap-1 text-crit">
          <CloudOff className="size-3.5" aria-hidden /> No se pudo guardar ({estado.mensaje}). Tu
          texto está respaldado en este navegador; reintentaremos.
        </span>
      ) : null,
  }[estado.tipo];
  return (
    <p className="min-h-5 text-xs" aria-live="polite">
      {contenido}
    </p>
  );
}

/**
 * Nota de consulta (RF-08): borrador con autoguardado cada 10 s y respaldo en sessionStorage.
 * "Finalizar" exige diagnóstico y tratamiento y pide confirmación en un diálogo propio.
 */
export function NotaConsulta({
  citaId,
  nota,
  motivoCita,
  alCerrar,
}: {
  citaId: string;
  nota: Consulta | null;
  motivoCita: string | null;
  alCerrar?: () => void;
}) {
  // mutateAsync es estable: el intervalo de autoguardado no se reinicia en cada render.
  const { mutateAsync: guardarEnServidor } = useGuardarBorrador(citaId);
  const cerrar = useCerrarConsulta(citaId);
  const [confirmando, setConfirmando] = useState(false);

  // Si hay un respaldo local más nuevo que lo del servidor, se recupera.
  const [inicial] = useState(() => {
    const servidor = desdeServidor(nota, motivoCita);
    const respaldo = leerRespaldo(citaId);
    const masNuevo =
      respaldo && (!nota || new Date(respaldo.escritoEn) > new Date(nota.actualizadaEn));
    const distinto = respaldo && JSON.stringify(respaldo.valores) !== JSON.stringify(servidor);
    return masNuevo && distinto
      ? { valores: respaldo.valores, servidor, recuperado: true }
      : { valores: servidor, servidor, recuperado: false };
  });

  const {
    register,
    getValues,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormularioNota>({ defaultValues: inicial.valores });

  const ultimoGuardado = useRef(JSON.stringify(inicial.servidor));
  const [estado, setEstado] = useState<EstadoGuardado>(
    inicial.recuperado ? { tipo: 'pendiente' } : { tipo: 'sin-cambios' },
  );

  // Cada cambio se respalda al instante en sessionStorage.
  useEffect(() => {
    const sub = watch((valores) => {
      guardarRespaldo(citaId, valores as FormularioNota);
      if (JSON.stringify(valores) !== ultimoGuardado.current) setEstado({ tipo: 'pendiente' });
    });
    return () => sub.unsubscribe();
  }, [watch, citaId]);

  const guardarBorrador = useCallback(
    async (manual = false) => {
      const valores = getValues();
      const firma = JSON.stringify(valores);
      if (firma === ultimoGuardado.current && !manual) return;
      if (valores.cie10.trim() && !CIE10.test(valores.cie10.trim())) {
        setError('cie10', { message: 'Código CIE-10 inválido, p. ej. I10 o J45.9' });
      }
      setEstado({ tipo: 'guardando' });
      try {
        await guardarEnServidor(aEntrada(valores));
        ultimoGuardado.current = firma;
        if (JSON.stringify(getValues()) === firma) borrarRespaldo(citaId);
        setEstado({ tipo: 'guardado', en: new Date() });
      } catch (e) {
        setEstado({ tipo: 'error', mensaje: mensajeDeError(e).replace(/\.$/, '') });
      }
    },
    [citaId, getValues, guardarEnServidor, setError],
  );

  // Autoguardado.
  const guardando = useRef(false);
  useEffect(() => {
    const id = setInterval(async () => {
      if (guardando.current) return;
      guardando.current = true;
      await guardarBorrador();
      guardando.current = false;
    }, INTERVALO_AUTOGUARDADO_MS);
    return () => clearInterval(id);
  }, [guardarBorrador]);

  const pedirCierre = () => {
    clearErrors();
    const v = getValues();
    let valido = true;
    if (!v.diagnostico.trim()) {
      setError('diagnostico', { message: 'El diagnóstico es obligatorio para finalizar' });
      valido = false;
    }
    if (!v.tratamiento.trim()) {
      setError('tratamiento', { message: 'El tratamiento es obligatorio para finalizar' });
      valido = false;
    }
    if (v.cie10.trim() && !CIE10.test(v.cie10.trim())) {
      setError('cie10', { message: 'Código CIE-10 inválido, p. ej. I10 o J45.9' });
      valido = false;
    }
    if (valido) setConfirmando(true);
  };

  const finalizar = () =>
    cerrar.mutate(aEntrada(getValues()), {
      onSuccess: () => {
        borrarRespaldo(citaId);
        setConfirmando(false);
        aviso.exito('Consulta finalizada', 'La nota quedó guardada en el historial del paciente.');
        alCerrar?.();
      },
      onError: () => setConfirmando(false),
    });

  return (
    <form noValidate onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
      {inicial.recuperado && (
        <Alerta tipo="aviso">
          Recuperamos cambios de esta nota que no alcanzaron a guardarse en el servidor. Se
          guardarán en el próximo autoguardado.
        </Alerta>
      )}
      <Campo etiqueta="Motivo de consulta" error={errors.motivo?.message}>
        <Textarea rows={2} {...register('motivo')} />
      </Campo>
      <Campo etiqueta="Examen físico" error={errors.examenFisico?.message}>
        <Textarea rows={4} {...register('examenFisico')} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <Campo etiqueta="Diagnóstico" error={errors.diagnostico?.message}>
          <Textarea rows={2} {...register('diagnostico')} />
        </Campo>
        <Campo etiqueta="CIE-10" opcional error={errors.cie10?.message}>
          <Input className="font-mono uppercase" placeholder="I10" {...register('cie10')} />
        </Campo>
      </div>
      <Campo etiqueta="Tratamiento" error={errors.tratamiento?.message}>
        <Textarea rows={3} {...register('tratamiento')} />
      </Campo>
      <Campo
        etiqueta="Indicaciones para el paciente"
        error={errors.indicaciones?.message}
        ayuda="El paciente las verá en su portal. No escribas aquí notas internas."
      >
        <Textarea rows={3} {...register('indicaciones')} />
      </Campo>

      {cerrar.isError && <Alerta>{mensajeDeError(cerrar.error)}</Alerta>}

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <IndicadorGuardado estado={estado} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={pedirCierre}>
            Finalizar y guardar en historial
          </Button>
          <Button
            type="button"
            variante="secundario"
            cargando={estado.tipo === 'guardando'}
            onClick={() => guardarBorrador(true)}
          >
            <Save aria-hidden /> Guardar borrador
          </Button>
        </div>
      </div>

      <Confirmar
        abierto={confirmando}
        alCambiar={setConfirmando}
        titulo="¿Finalizar la consulta?"
        descripcion="La nota se guardará en el historial y ya no se podrá editar. El paciente verá las indicaciones en su portal."
        textoConfirmar="Finalizar consulta"
        cargando={cerrar.isPending}
        alConfirmar={finalizar}
      />
    </form>
  );
}
