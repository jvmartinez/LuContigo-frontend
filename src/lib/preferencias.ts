/**
 * Único punto de acceso a localStorage. Solo guarda preferencias de interfaz
 * (nunca datos clínicos ni de pacientes: FRONTEND.md §9).
 */
type Clave = 'tema';

const PREFIJO = 'medicita:';

export function leerPreferencia(clave: Clave): string | null {
  try {
    return localStorage.getItem(PREFIJO + clave);
  } catch {
    return null;
  }
}

export function guardarPreferencia(clave: Clave, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(PREFIJO + clave);
    else localStorage.setItem(PREFIJO + clave, valor);
  } catch {
    // Almacenamiento bloqueado (modo privado): la preferencia dura solo esta visita.
  }
}
