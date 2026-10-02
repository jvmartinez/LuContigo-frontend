import { endOfMonth, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useIndicadores } from '@/api/queries/clinica';
import type { Indicadores } from '@/api/tipos';
import { useUsuario } from '@/auth/sesion';
import { Card, CardContent, CardHeader, CardTitle, EncabezadoPagina } from '@/components/ui/card';
import { ErrorEstado, Esqueleto, Vacio } from '@/components/ui/estados';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/cn';
import { etiquetaDia, hoyEn } from '@/lib/fechas';

type Periodo = 'hoy' | 'mes';

function Indicador({
  titulo,
  valor,
  detalle,
  tono = 'neutro',
}: {
  titulo: string;
  valor: string | number;
  detalle?: string;
  tono?: 'neutro' | 'good' | 'warn' | 'crit';
}) {
  return (
    <Card className="px-4 py-3">
      <p className="text-sm font-medium text-muted">{titulo}</p>
      <p
        className={cn(
          'font-mono text-3xl font-medium',
          tono === 'good' && 'text-good',
          tono === 'warn' && 'text-warn',
          tono === 'crit' && 'text-crit',
        )}
      >
        {valor}
      </p>
      {detalle && <p className="text-xs text-muted">{detalle}</p>}
    </Card>
  );
}

const pct = (n: number) => `${n.toLocaleString('es', { maximumFractionDigits: 1 })} %`;

function Ocupacion({ datos }: { datos: Indicadores['ocupacionPorMedico'] }) {
  if (datos.length === 0) return <Vacio titulo="No hay médicos registrados" />;
  const filas = datos.map((d) => ({ ...d, horas: Math.round(d.minutosAgendados / 6) / 10 }));
  return (
    <>
      <div
        className="h-[max(200px,calc(48px*var(--n)))]"
        style={{ ['--n' as string]: filas.length }}
        aria-hidden
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filas}
            layout="vertical"
            margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--line)" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              stroke="var(--line)"
            />
            <YAxis
              type="category"
              dataKey="nombre"
              width={150}
              tick={{ fill: 'var(--ink)', fontSize: 12 }}
              stroke="var(--line)"
            />
            <Tooltip
              cursor={{ fill: 'var(--accent-soft)' }}
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 8,
              }}
              formatter={(v: number) => [pct(v), 'Ocupación']}
            />
            <Bar dataKey="ocupacion" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Alternativa accesible al gráfico. */}
      <table className="sr-only">
        <caption>Ocupación por médico</caption>
        <thead>
          <tr>
            <th scope="col">Médico</th>
            <th scope="col">Ocupación</th>
            <th scope="col">Horas agendadas</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.medicoId}>
              <td>{f.nombre}</td>
              <td>{pct(f.ocupacion)}</td>
              <td>{f.horas} h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** Indicadores del día y del mes (RF-18). Solo agregados: nunca datos de pacientes. */
export default function PanelPage() {
  const { zona } = useUsuario();
  const hoy = hoyEn(zona);
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const desde = periodo === 'hoy' ? hoy : `${hoy.slice(0, 8)}01`;
  const hasta = periodo === 'hoy' ? hoy : format(endOfMonth(parseISO(hoy)), 'yyyy-MM-dd');
  const indicadores = useIndicadores(desde, hasta);
  const d = indicadores.data;

  const activas = d ? d.citas - d.cancelaciones - d.noAsistio : 0;
  const enSala = d ? (d.porEstado.EN_ESPERA ?? 0) + (d.porEstado.LISTA ?? 0) : 0;
  const enConsulta = d?.porEstado.EN_CONSULTA ?? 0;

  return (
    <>
      <EncabezadoPagina
        titulo="Indicadores"
        descripcion={
          <span className="first-letter:uppercase">
            {periodo === 'hoy'
              ? etiquetaDia(hoy)
              : format(parseISO(hoy), "MMMM 'de' yyyy", { locale: es })}
          </span>
        }
        acciones={
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <TabsList aria-label="Periodo">
              <TabsTrigger value="hoy">Hoy</TabsTrigger>
              <TabsTrigger value="mes">Este mes</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
      {indicadores.isError ? (
        <ErrorEstado error={indicadores.error} reintentar={() => indicadores.refetch()} />
      ) : !d ? (
        <div
          className="grid grid-cols-2 gap-3 lg:grid-cols-5"
          role="status"
          aria-label="Cargando indicadores"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Esqueleto key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Indicador titulo="Citas activas" valor={activas} detalle={`${d.citas} en total`} />
            <Indicador titulo="Atendidas" valor={d.atendidas} tono="good" />
            {periodo === 'hoy' ? (
              <Indicador
                titulo="En sala"
                valor={enSala}
                detalle={`${enConsulta} en consulta`}
                tono="warn"
              />
            ) : (
              <Indicador titulo="No asistieron" valor={d.noAsistio} />
            )}
            <Indicador
              titulo="Tasa de inasistencia"
              valor={pct(d.tasaInasistencia)}
              detalle={`${d.noAsistio} de ${d.atendidas + d.noAsistio} citas cumplidas o perdidas`}
              tono={d.tasaInasistencia >= 15 ? 'crit' : 'neutro'}
            />
            <Indicador
              titulo="Cancelaciones"
              valor={d.cancelaciones}
              detalle={`${pct(d.tasaCancelacion)} de las citas`}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Ocupación por médico</CardTitle>
              <p className="text-sm text-muted">
                Tiempo agendado sobre el tiempo de atención disponible.
              </p>
            </CardHeader>
            <CardContent>
              <Ocupacion datos={d.ocupacionPorMedico} />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
