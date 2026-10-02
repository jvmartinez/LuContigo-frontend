import { Ban, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Cita } from '@/api/tipos';
import { ETIQUETA_ESTADO, EstadoCita, FONDO_ESTADO } from '@/components/EstadoCita';
import { cn } from '@/lib/cn';
import { horaEn, hoyEn, minutosAHora, minutosEn } from '@/lib/fechas';
import type { Celda, Columna, ModeloAgenda } from './modelo';

/** Píxeles por minuto: una celda de 30 min mide 54 px (objetivo táctil ≥ 44 px). */
const PX = 1.8;
const ANCHO_COLUMNA = 200;
const ALTO_ENCABEZADO = 64;

const nombrePaciente = (c: Cita) => `${c.paciente.apellidos}, ${c.paciente.nombres}`;

function CeldaVista({
  celda,
  columna,
  alAbrirCita,
  alAgendar,
  top,
  zona,
}: {
  celda: Celda;
  columna: Columna;
  zona: string;
  alAbrirCita: (id: string) => void;
  alAgendar: (medicoId: string, hora: string) => void;
  top: number;
}) {
  const alto = (celda.finMin - celda.inicioMin) * PX - 3;
  const estilo = { top, height: alto };
  const hora = minutosAHora(celda.inicioMin);
  const medico = columna.medico.nombre;

  if (celda.tipo === 'cita') {
    const { cita } = celda;
    return (
      <button
        type="button"
        style={estilo}
        onClick={() => alAbrirCita(cita.id)}
        aria-label={`${hora}, ${medico}: ${nombrePaciente(cita)}, ${ETIQUETA_ESTADO[cita.estado]}. Ver detalle`}
        className={cn(
          'absolute inset-x-1 flex flex-col items-start justify-center gap-1 overflow-hidden rounded-lg border px-2 py-1 text-left text-xs transition-shadow hover:shadow-md',
          FONDO_ESTADO[cita.estado],
        )}
      >
        <span className="flex w-full min-w-0 items-baseline gap-1.5">
          <span className="font-mono font-medium">{hora}</span>
          <span className="truncate text-[13px] font-semibold text-ink">
            {nombrePaciente(cita)}
          </span>
        </span>
        <EstadoCita estado={cita.estado} className="px-1.5 py-0 text-[10px]" />
      </button>
    );
  }

  const inactivas = celda.inactivas.map((c) => (
    <button
      key={c.id}
      type="button"
      onClick={() => alAbrirCita(c.id)}
      className="max-w-full truncate text-left text-[11px] text-muted line-through hover:text-ink"
      aria-label={`${horaEn(c.inicio, zona)}, ${medico}: ${nombrePaciente(c)}, ${ETIQUETA_ESTADO[c.estado]}. Ver detalle`}
    >
      {nombrePaciente(c)}
    </button>
  ));

  if (celda.tipo === 'libre') {
    return (
      <div style={estilo} className="absolute inset-x-1 flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => alAgendar(columna.medico.id, celda.hora)}
          aria-label={`${hora}, ${medico}: libre. Agendar cita`}
          className="flex min-h-0 flex-1 items-center gap-1.5 rounded-lg border border-dashed border-accent/50 bg-surface px-2 text-xs font-semibold text-accent transition-colors hover:border-solid hover:bg-accent-soft"
        >
          <span className="font-mono font-medium text-muted">{hora}</span>
          <Plus className="size-3.5" aria-hidden /> Libre
        </button>
        {inactivas}
      </div>
    );
  }

  return (
    <div
      style={estilo}
      className={cn(
        'absolute inset-x-1 flex flex-col items-start gap-0.5 rounded-lg px-2 py-1 text-xs',
        celda.tipo === 'ausente'
          ? 'border border-line bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,var(--line)_6px,var(--line)_7px)] text-muted'
          : 'text-muted/80',
      )}
    >
      <span className="flex items-center gap-1">
        <span className="font-mono">{hora}</span>
        {celda.tipo === 'ausente' && (
          <>
            <Ban className="size-3" aria-hidden />
            <span>Bloqueado</span>
          </>
        )}
      </span>
      {inactivas}
    </div>
  );
}

function LineaAhora({
  inicioMin,
  finMin,
  zona,
}: {
  inicioMin: number;
  finMin: number;
  zona: string;
}) {
  const [ahora, setAhora] = useState(() => minutosEn(new Date(), zona));
  useEffect(() => {
    const id = setInterval(() => setAhora(minutosEn(new Date(), zona)), 60_000);
    return () => clearInterval(id);
  }, [zona]);
  if (ahora < inicioMin || ahora > finMin) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-16 right-0 z-10 border-t-2 border-crit"
      style={{ top: ALTO_ENCABEZADO + (ahora - inicioMin) * PX }}
    >
      <span className="absolute -top-2.5 left-1 rounded bg-crit px-1 font-mono text-[10px] text-white">
        {minutosAHora(ahora)}
      </span>
    </div>
  );
}

/**
 * Cuadrícula del día: filas = horas, columnas = médicos. Tiene su propio scroll horizontal
 * para que la página nunca se desborde en pantallas angostas.
 */
export function CuadriculaAgenda({
  modelo,
  fecha,
  zona,
  alAbrirCita,
  alAgendar,
}: {
  modelo: ModeloAgenda;
  fecha: string;
  zona: string;
  alAbrirCita: (id: string) => void;
  alAgendar: (medicoId: string, hora: string) => void;
}) {
  const { inicioMin, finMin, columnas } = modelo;
  const alto = (finMin - inicioMin) * PX;
  const marcas: number[] = [];
  for (let m = inicioMin; m <= finMin; m += 30) marcas.push(m);
  const esHoy = fecha === hoyEn(zona);

  return (
    <div
      className="overflow-x-auto rounded-xl border border-line bg-surface"
      role="region"
      aria-label="Agenda del día por médico"
      // Región con scroll propio: enfocable para desplazarla con el teclado (axe: scrollable-region-focusable).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      <div className="relative flex" style={{ minWidth: 64 + columnas.length * ANCHO_COLUMNA }}>
        {/* Eje de horas */}
        <div className="sticky left-0 z-20 w-16 shrink-0 border-r border-line bg-surface">
          <div className="h-16 border-b border-line" />
          <div className="relative" style={{ height: alto }}>
            {marcas.map((m) => (
              <span
                key={m}
                className="absolute right-2 -translate-y-1/2 font-mono text-[11px] text-muted"
                style={{ top: (m - inicioMin) * PX }}
              >
                {m % 60 === 0 || m === inicioMin ? minutosAHora(m) : ''}
              </span>
            ))}
          </div>
        </div>

        {columnas.map((col) => {
          const titulo = `col-${col.medico.id}`;
          return (
            <section
              key={col.medico.id}
              aria-labelledby={titulo}
              className="flex-1 border-r border-line last:border-r-0"
              style={{ minWidth: ANCHO_COLUMNA }}
            >
              <header className="sticky top-0 flex h-16 flex-col justify-center border-b border-line bg-surface-2 px-3">
                <h2 id={titulo} className="truncate font-sans text-sm font-bold">
                  {col.medico.nombre}
                </h2>
                <p className="truncate text-xs text-muted">
                  {col.medico.especialidad?.nombre ?? 'Sin especialidad'} · {col.duracionMin} min
                </p>
                {col.ausencia && (
                  <p className="truncate text-xs font-semibold text-warn">
                    Ausente{col.ausencia.motivo ? `: ${col.ausencia.motivo}` : ''}
                  </p>
                )}
              </header>
              <div className="relative" style={{ height: alto }}>
                {marcas.map((m) => (
                  <div
                    key={m}
                    aria-hidden
                    className={cn(
                      'absolute inset-x-0 border-t',
                      m % 60 === 0 ? 'border-line' : 'border-line/40',
                    )}
                    style={{ top: (m - inicioMin) * PX }}
                  />
                ))}
                {col.bloques.length === 0 && col.celdas.length === 0 && (
                  <p className="absolute inset-x-2 top-4 text-center text-xs text-muted">
                    No atiende este día
                  </p>
                )}
                {col.celdas.map((celda) => (
                  <CeldaVista
                    key={`${celda.tipo}-${celda.inicioMin}-${celda.tipo === 'cita' ? celda.cita.id : ''}`}
                    celda={celda}
                    columna={col}
                    top={(celda.inicioMin - inicioMin) * PX + 1}
                    alAbrirCita={alAbrirCita}
                    alAgendar={alAgendar}
                    zona={zona}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {esHoy && <LineaAhora inicioMin={inicioMin} finMin={finMin} zona={zona} />}
      </div>
    </div>
  );
}
