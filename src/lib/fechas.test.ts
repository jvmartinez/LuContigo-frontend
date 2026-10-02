import {
  diaSemana,
  fechaEn,
  fechaLarga,
  horaEn,
  hoyEn,
  instanteLocal,
  isoConZona,
  minutosAHora,
  minutosEn,
  sumarDias,
} from './fechas';

const BOGOTA = 'America/Bogota'; // UTC−5, sin horario de verano
const MADRID = 'Europe/Madrid';

describe('fechas en la zona de la clínica', () => {
  it('muestra la hora local de la clínica, no la del navegador', () => {
    expect(horaEn('2026-10-05T14:30:00Z', BOGOTA)).toBe('09:30');
    expect(horaEn('2026-10-05T14:30:00Z', MADRID)).toBe('16:30');
  });

  it('calcula "hoy" en la zona de la clínica cerca de la medianoche UTC', () => {
    const ahora = new Date('2026-10-06T03:00:00Z'); // 22:00 del 5 en Bogotá
    expect(hoyEn(BOGOTA, ahora)).toBe('2026-10-05');
    expect(hoyEn(MADRID, ahora)).toBe('2026-10-06');
    expect(fechaEn(ahora, BOGOTA)).toBe('2026-10-05');
  });

  it('convierte fecha y hora locales a un instante UTC', () => {
    expect(instanteLocal('2026-10-05', '09:30', BOGOTA).toISOString()).toBe(
      '2026-10-05T14:30:00.000Z',
    );
    // Madrid en octubre (antes del cambio) está en UTC+2.
    expect(instanteLocal('2026-10-05', '09:30', MADRID).toISOString()).toBe(
      '2026-10-05T07:30:00.000Z',
    );
  });

  it('serializa con el desfase de la clínica como espera la API', () => {
    expect(isoConZona('2026-10-05T14:30:00Z', BOGOTA)).toBe('2026-10-05T09:30:00-05:00');
  });

  it('formatea en español', () => {
    expect(fechaLarga('2026-10-05T14:30:00Z', BOGOTA)).toBe('lunes 5 de octubre');
  });

  it('opera con fechas de calendario sin desfases', () => {
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(diaSemana('2026-10-05')).toBe(1);
    expect(diaSemana('2026-10-11')).toBe(7);
  });

  it('pasa entre minutos y horas', () => {
    expect(minutosEn('2026-10-05T14:30:00Z', BOGOTA)).toBe(570);
    expect(minutosAHora(570)).toBe('09:30');
    expect(minutosAHora(485)).toBe('08:05');
  });
});
