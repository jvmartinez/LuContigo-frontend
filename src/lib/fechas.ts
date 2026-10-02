import { addDays, format, getISODay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/**
 * Las fechas llegan en UTC y se muestran en la zona horaria de la clínica (FRONTEND.md §7).
 * Nunca se usa la zona del navegador para la agenda: todas las funciones reciben `zona` (IANA).
 */

type Instante = string | Date;
const aDate = (i: Instante) => (typeof i === 'string' ? new Date(i) : i);

/** "YYYY-MM-DD" de hoy en la zona de la clínica. */
export function hoyEn(zona: string, ahora: Date = new Date()): string {
  return formatInTimeZone(ahora, zona, 'yyyy-MM-dd');
}

/** "YYYY-MM-DD" de un instante en la zona de la clínica. */
export function fechaEn(instante: Instante, zona: string): string {
  return formatInTimeZone(aDate(instante), zona, 'yyyy-MM-dd');
}

/** "HH:mm" (24 h) de un instante en la zona de la clínica. */
export function horaEn(instante: Instante, zona: string): string {
  return formatInTimeZone(aDate(instante), zona, 'HH:mm');
}

/** Minutos desde la medianoche local de la clínica. */
export function minutosEn(instante: Instante, zona: string): number {
  const [h, m] = horaEn(instante, zona).split(':').map(Number);
  return h * 60 + m;
}

/** "lunes 5 de octubre" */
export function fechaLarga(instante: Instante, zona: string): string {
  return formatInTimeZone(aDate(instante), zona, "EEEE d 'de' MMMM", { locale: es });
}

/** "lun 5 oct 2026 · 09:30" */
export function fechaHoraCorta(instante: Instante, zona: string): string {
  return formatInTimeZone(aDate(instante), zona, "EEE d MMM yyyy '·' HH:mm", { locale: es });
}

/** Etiqueta de una fecha de calendario "YYYY-MM-DD" sin pasar por ninguna zona: "lunes 5 de octubre". */
export function etiquetaDia(fecha: string): string {
  return format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es });
}

/** Instante UTC que corresponde a una fecha y hora locales de la clínica. */
export function instanteLocal(fecha: string, hora: string, zona: string): Date {
  return fromZonedTime(`${fecha}T${hora}:00`, zona);
}

/** ISO 8601 con el desfase de la clínica, p. ej. "2026-10-05T09:30:00-05:00". */
export function isoConZona(instante: Instante, zona: string): string {
  return formatInTimeZone(aDate(instante), zona, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/** Suma días a una fecha de calendario "YYYY-MM-DD". */
export function sumarDias(fecha: string, dias: number): string {
  return format(addDays(parseISO(fecha), dias), 'yyyy-MM-dd');
}

/** Día ISO de la semana (1 = lunes … 7 = domingo) de una fecha de calendario. */
export function diaSemana(fecha: string): number {
  return getISODay(parseISO(fecha));
}

export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const DIAS_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];
