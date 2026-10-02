import type { FormularioNota } from './NotaConsulta';

/**
 * Respaldo local del borrador de la nota (§6): si se cae la conexión, lo escrito no se pierde.
 * Vive en sessionStorage (se borra al cerrar la pestaña) y se elimina en cuanto el servidor
 * confirma el guardado. Nunca se usa localStorage para datos clínicos.
 */
const clave = (citaId: string) => `medicita:nota:${citaId}`;

export interface Respaldo {
  valores: FormularioNota;
  escritoEn: string;
}

export function leerRespaldo(citaId: string): Respaldo | null {
  try {
    const texto = sessionStorage.getItem(clave(citaId));
    return texto ? (JSON.parse(texto) as Respaldo) : null;
  } catch {
    return null;
  }
}

export function guardarRespaldo(citaId: string, valores: FormularioNota): void {
  try {
    sessionStorage.setItem(
      clave(citaId),
      JSON.stringify({ valores, escritoEn: new Date().toISOString() }),
    );
  } catch {
    // Sin almacenamiento disponible: queda solo el autoguardado en el servidor.
  }
}

export function borrarRespaldo(citaId: string): void {
  try {
    sessionStorage.removeItem(clave(citaId));
  } catch {
    // Nada que limpiar.
  }
}
