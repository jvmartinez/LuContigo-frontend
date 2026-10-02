import type { Ausencia, BloqueHorario, Cita, Disponibilidad, Medico } from '@/api/tipos';
import { diaSemana, horaAMinutos, instanteLocal, minutosAHora, minutosEn } from '@/lib/fechas';
import { ESTADOS_INACTIVOS } from '@/shared/enums';

/**
 * Modelo de la cuadrícula de la agenda (§6): columnas = médicos, eje vertical = minutos del día
 * en la zona de la clínica. Cada médico se corta en celdas de la duración de su especialidad.
 */

export interface CeldaCita {
  tipo: 'cita';
  cita: Cita;
  inicioMin: number;
  finMin: number;
}

export interface CeldaHueco {
  tipo: 'libre' | 'ausente' | 'no-disponible';
  inicioMin: number;
  finMin: number;
  hora: string;
  /** Instante UTC del hueco libre, listo para `POST /citas`. */
  inicioIso?: string;
  /** Citas canceladas o no asistidas que ocuparon este horario. */
  inactivas: Cita[];
}

export type Celda = CeldaCita | CeldaHueco;

export interface Columna {
  medico: Medico;
  duracionMin: number;
  /** Ausencia que cubre (parte de) el día. */
  ausencia: Ausencia | null;
  /** Bloques de atención del día, en minutos, para pintar el fondo. */
  bloques: { inicioMin: number; finMin: number }[];
  celdas: Celda[];
}

export interface ModeloAgenda {
  inicioMin: number;
  finMin: number;
  columnas: Columna[];
}

interface Entrada {
  fecha: string;
  zona: string;
  medicos: Medico[];
  citas: Cita[];
  horarios: Record<string, BloqueHorario[] | undefined>;
  disponibilidad: Record<string, Disponibilidad | undefined>;
  ausencias: Record<string, Ausencia[] | undefined>;
  /** Los huecos que ya pasaron no se pueden agendar. */
  ahora?: Date;
}

const DURACION_POR_DEFECTO = 30;
const RANGO_POR_DEFECTO = { inicio: 8 * 60, fin: 18 * 60 };

const seSolapan = (
  a: { inicioMin: number; finMin: number },
  b: { inicioMin: number; finMin: number },
) => a.inicioMin < b.finMin && b.inicioMin < a.finMin;

export function construirAgenda({
  fecha,
  zona,
  medicos,
  citas,
  horarios,
  disponibilidad,
  ausencias,
  ahora = new Date(),
}: Entrada): ModeloAgenda {
  const dia = diaSemana(fecha);
  const inicioDia = instanteLocal(fecha, '00:00', zona).getTime();
  const finDia = instanteLocal(fecha, '23:59', zona).getTime() + 60_000;
  const aMin = (iso: string) => {
    // Instantes fuera del día (ausencias de varios días) se recortan a sus bordes.
    const t = new Date(iso).getTime();
    if (t <= inicioDia) return 0;
    if (t >= finDia) return 24 * 60;
    return minutosEn(iso, zona);
  };

  let inicioMin = Infinity;
  let finMin = -Infinity;

  const columnas = medicos.map<Columna>((medico) => {
    const disp = disponibilidad[medico.id];
    const duracionMin =
      disp?.duracionMin ?? medico.especialidad?.duracionCitaMin ?? DURACION_POR_DEFECTO;
    const bloques = (horarios[medico.id] ?? [])
      .filter((b) => b.diaSemana === dia)
      .map((b) => ({ inicioMin: horaAMinutos(b.horaInicio), finMin: horaAMinutos(b.horaFin) }))
      .sort((a, b) => a.inicioMin - b.inicioMin);

    const propias = citas.filter((c) => c.medico.id === medico.id);
    const activas = propias.filter((c) => !ESTADOS_INACTIVOS.includes(c.estado));
    const inactivas = propias.filter((c) => ESTADOS_INACTIVOS.includes(c.estado));
    const celdasCita: CeldaCita[] = activas.map((cita) => ({
      tipo: 'cita',
      cita,
      inicioMin: aMin(cita.inicio),
      finMin: aMin(cita.fin),
    }));

    const ausenciasDia = (ausencias[medico.id] ?? [])
      .map((a) => ({ a, inicioMin: aMin(a.desde), finMin: aMin(a.hasta) }))
      .filter((a) => a.finMin > a.inicioMin);

    const libres = new Map(
      (disp?.huecos ?? [])
        .filter((h) => new Date(h.inicio) > ahora)
        .map((h) => [aMin(h.inicio), h.inicio]),
    );

    const huecos: CeldaHueco[] = [];
    for (const bloque of bloques) {
      for (let m = bloque.inicioMin; m + duracionMin <= bloque.finMin; m += duracionMin) {
        const celda = { inicioMin: m, finMin: m + duracionMin };
        if (celdasCita.some((c) => seSolapan(c, celda))) continue;
        const inicioIso = libres.get(m);
        const ausente = ausenciasDia.some((a) => seSolapan(a, celda));
        huecos.push({
          tipo: inicioIso ? 'libre' : ausente ? 'ausente' : 'no-disponible',
          ...celda,
          hora: minutosAHora(m),
          inicioIso,
          inactivas: [],
        });
      }
    }

    // Las canceladas y no asistidas se muestran dentro del hueco que ocuparon (o solas).
    for (const cita of inactivas) {
      const rango = { inicioMin: aMin(cita.inicio), finMin: aMin(cita.fin) };
      const hueco = huecos.find((h) => seSolapan(h, rango));
      if (hueco) hueco.inactivas.push(cita);
      else if (!celdasCita.some((c) => seSolapan(c, rango))) {
        huecos.push({
          tipo: 'no-disponible',
          ...rango,
          hora: minutosAHora(rango.inicioMin),
          inactivas: [cita],
        });
      }
    }

    const celdas: Celda[] = [...celdasCita, ...huecos].sort((a, b) => a.inicioMin - b.inicioMin);
    for (const c of [...celdas, ...bloques]) {
      inicioMin = Math.min(inicioMin, c.inicioMin);
      finMin = Math.max(finMin, c.finMin);
    }

    return {
      medico,
      duracionMin,
      ausencia:
        ausenciasDia.find((a) => bloques.some((b) => seSolapan(a, b)))?.a ??
        ausenciasDia[0]?.a ??
        null,
      bloques,
      celdas,
    };
  });

  if (!Number.isFinite(inicioMin)) {
    inicioMin = RANGO_POR_DEFECTO.inicio;
    finMin = RANGO_POR_DEFECTO.fin;
  }
  // Se alinea a la media hora para que las marcas del eje queden en horas redondas.
  return {
    inicioMin: Math.floor(inicioMin / 30) * 30,
    finMin: Math.ceil(finMin / 30) * 30,
    columnas,
  };
}
