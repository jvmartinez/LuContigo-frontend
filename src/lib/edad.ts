import { differenceInYears, parseISO } from 'date-fns';

/** Años cumplidos a partir de una fecha de nacimiento "YYYY-MM-DD". */
export function edadEnAnios(fechaNacimiento: string, hoy: Date = new Date()): number {
  return differenceInYears(hoy, parseISO(fechaNacimiento));
}

export function textoEdad(fechaNacimiento: string, hoy: Date = new Date()): string {
  const anios = edadEnAnios(fechaNacimiento, hoy);
  return anios === 1 ? '1 año' : `${anios} años`;
}
