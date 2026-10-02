import type { Cita, Medico } from '@/api/tipos';
import { instanteLocal } from '@/lib/fechas';
import { construirAgenda, type CeldaHueco } from './modelo';

const ZONA = 'America/Bogota';
const FECHA = '2026-10-05'; // lunes
const iso = (hora: string) => instanteLocal(FECHA, hora, ZONA).toISOString();

const medico: Medico = {
  id: 'per_1',
  nombre: 'Dra. Torres',
  especialidad: { id: 'esp_1', nombre: 'Medicina general', duracionCitaMin: 30 },
};

const cita = (id: string, hora: string, fin: string, estado: Cita['estado']): Cita => ({
  id,
  estado,
  inicio: iso(hora),
  fin: iso(fin),
  motivo: null,
  canalOrigen: 'RECEPCION',
  motivoCancelacion: null,
  pacienteId: 'pac_1',
  paciente: { id: 'pac_1', nombres: 'Ana', apellidos: 'Rojas', documento: '1' },
  medico: { id: medico.id, nombre: medico.nombre, especialidad: 'Medicina general' },
  consultorio: { id: 'con_1', nombre: 'Consultorio 1' },
  recordatorio: null,
});

const base = {
  fecha: FECHA,
  zona: ZONA,
  medicos: [medico],
  horarios: { per_1: [{ diaSemana: 1, horaInicio: '08:00', horaFin: '10:00' }] },
  ausencias: {},
  ahora: new Date(iso('07:00')),
};

describe('modelo de la agenda', () => {
  it('corta el horario en celdas de la duración de la especialidad', () => {
    const modelo = construirAgenda({
      ...base,
      citas: [cita('c1', '08:30', '09:00', 'CONFIRMADA')],
      disponibilidad: {
        per_1: {
          medicoId: 'per_1',
          duracionMin: 30,
          huecos: [iso('08:00'), iso('09:00'), iso('09:30')].map((i) => ({ inicio: i, fin: i })),
        },
      },
    });
    const celdas = modelo.columnas[0].celdas;
    expect(celdas.map((c) => [c.tipo, c.inicioMin])).toEqual([
      ['libre', 480],
      ['cita', 510],
      ['libre', 540],
      ['libre', 570],
    ]);
    expect((celdas[0] as CeldaHueco).inicioIso).toBe(iso('08:00'));
    expect(modelo.inicioMin).toBe(480);
    expect(modelo.finMin).toBe(600);
  });

  it('bloquea las celdas libres de un médico ausente', () => {
    const modelo = construirAgenda({
      ...base,
      citas: [],
      disponibilidad: { per_1: { medicoId: 'per_1', duracionMin: 30, huecos: [] } },
      ausencias: {
        per_1: [{ id: 'a1', desde: iso('00:00'), hasta: iso('23:59'), motivo: 'Congreso' }],
      },
    });
    const columna = modelo.columnas[0];
    expect(columna.ausencia?.motivo).toBe('Congreso');
    expect(columna.celdas.every((c) => c.tipo === 'ausente')).toBe(true);
  });

  it('muestra las canceladas dentro del hueco que liberaron', () => {
    const modelo = construirAgenda({
      ...base,
      citas: [cita('c1', '08:00', '08:30', 'CANCELADA')],
      disponibilidad: {
        per_1: {
          medicoId: 'per_1',
          duracionMin: 30,
          huecos: [{ inicio: iso('08:00'), fin: iso('08:30') }],
        },
      },
    });
    const primera = modelo.columnas[0].celdas[0] as CeldaHueco;
    expect(primera.tipo).toBe('libre');
    expect(primera.inactivas.map((c) => c.id)).toEqual(['c1']);
  });

  it('no ofrece huecos que ya pasaron', () => {
    const modelo = construirAgenda({
      ...base,
      ahora: new Date(iso('09:10')),
      citas: [],
      disponibilidad: {
        per_1: {
          medicoId: 'per_1',
          duracionMin: 30,
          huecos: [iso('08:00'), iso('09:30')].map((i) => ({ inicio: i, fin: i })),
        },
      },
    });
    expect(modelo.columnas[0].celdas.map((c) => c.tipo)).toEqual([
      'no-disponible',
      'no-disponible',
      'no-disponible',
      'libre',
    ]);
  });

  it('usa 40 minutos para cardiología', () => {
    const cardio: Medico = {
      ...medico,
      id: 'per_2',
      especialidad: { id: 'e', nombre: 'Cardiología', duracionCitaMin: 40 },
    };
    const modelo = construirAgenda({
      ...base,
      medicos: [cardio],
      horarios: { per_2: [{ diaSemana: 1, horaInicio: '08:00', horaFin: '10:00' }] },
      citas: [],
      disponibilidad: {},
    });
    expect(modelo.columnas[0].celdas.map((c) => c.inicioMin)).toEqual([480, 520, 560]);
  });
});
