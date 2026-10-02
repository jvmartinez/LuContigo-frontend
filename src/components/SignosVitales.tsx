import { AlertTriangle } from 'lucide-react';
import type { SignosVitales as Signos } from '@/api/tipos';
import { cn } from '@/lib/cn';
import { categoriaImc, etiquetaAlerta, nivelSigno, type NivelSigno } from '@/lib/signos';

interface Tarjeta {
  etiqueta: string;
  valor: string | null;
  unidad: string;
  nivel: NivelSigno;
  nota?: string;
}

const peor = (a: NivelSigno, b: NivelSigno): NivelSigno =>
  a === 'fuera-de-rango' || b === 'fuera-de-rango'
    ? 'fuera-de-rango'
    : a === 'alerta' || b === 'alerta'
      ? 'alerta'
      : 'normal';

function tarjetas(s: Signos, edad: number): Tarjeta[] {
  const n = (v: number | null) => (v === null ? undefined : v);
  return [
    {
      etiqueta: 'Presión arterial',
      valor:
        s.presionSistolica !== null && s.presionDiastolica !== null
          ? `${s.presionSistolica}/${s.presionDiastolica}`
          : null,
      unidad: 'mmHg',
      nivel: peor(
        nivelSigno('presionSistolica', n(s.presionSistolica), edad),
        nivelSigno('presionDiastolica', n(s.presionDiastolica), edad),
      ),
    },
    {
      etiqueta: 'Frecuencia cardiaca',
      valor: s.frecuenciaCardiaca?.toString() ?? null,
      unidad: 'lpm',
      nivel: nivelSigno('frecuenciaCardiaca', n(s.frecuenciaCardiaca), edad),
    },
    {
      etiqueta: 'Temperatura',
      valor: s.temperatura?.toFixed(1) ?? null,
      unidad: '°C',
      nivel: nivelSigno('temperatura', n(s.temperatura), edad),
    },
    {
      etiqueta: 'SpO₂',
      valor: s.spo2?.toString() ?? null,
      unidad: '%',
      nivel: nivelSigno('spo2', n(s.spo2), edad),
    },
    { etiqueta: 'Peso', valor: s.pesoKg?.toString() ?? null, unidad: 'kg', nivel: 'normal' },
    { etiqueta: 'Talla', valor: s.tallaCm?.toString() ?? null, unidad: 'cm', nivel: 'normal' },
    {
      etiqueta: 'IMC',
      valor: s.imc?.toFixed(1) ?? null,
      unidad: 'kg/m²',
      nivel: 'normal',
      nota: s.imc ? categoriaImc(s.imc) : undefined,
    },
  ];
}

/** Tarjetas de signos vitales con los valores de alerta en rojo (§6). */
export function SignosVitales({
  signos,
  edad,
  className,
}: {
  signos: Signos;
  edad: number;
  className?: string;
}) {
  const lista = tarjetas(signos, edad).filter((t) => t.valor !== null);
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {signos.alertas.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Alertas de signos vitales">
          {signos.alertas.map((a) => (
            <li
              key={a}
              className="inline-flex items-center gap-1 rounded-full border border-crit/40 bg-crit-soft px-2.5 py-1 text-xs font-bold text-crit"
            >
              <AlertTriangle className="size-3.5" aria-hidden /> {etiquetaAlerta(a)}
            </li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {lista.map((t) => {
          const alerta = t.nivel !== 'normal';
          return (
            <div
              key={t.etiqueta}
              className={cn(
                'rounded-lg border px-3 py-2',
                alerta ? 'border-crit/50 bg-crit-soft' : 'border-line bg-surface-2',
              )}
            >
              <dt className="text-xs font-medium text-muted">{t.etiqueta}</dt>
              <dd className={cn('font-mono text-lg font-medium', alerta && 'text-crit')}>
                {t.valor} <span className="text-xs font-normal text-muted">{t.unidad}</span>
                {alerta && <span className="sr-only"> (valor de alerta)</span>}
                {t.nota && <span className="block font-sans text-xs text-muted">{t.nota}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
      {signos.nota && (
        <p className="text-sm">
          <span className="font-semibold">Nota de enfermería:</span> {signos.nota}
        </p>
      )}
    </div>
  );
}
