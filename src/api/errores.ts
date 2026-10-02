import type { CodigoError } from '@/shared/errores';

/** Códigos del formato de error de la API (§8.7) más los que produce el propio cliente. */
export type CodigoErrorCliente = CodigoError | 'SIN_CONEXION' | 'DESCONOCIDO';

interface CampoInvalido {
  campo: string;
  mensaje: string;
}

/** Error normalizado: toda falla de red o de la API llega a la interfaz con esta forma. */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: CodigoErrorCliente,
    mensaje: string,
    readonly detalles?: Record<string, unknown>,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }

  /** Errores por campo que manda la API en `detalles.campos` o `detalles.campo`. */
  get camposInvalidos(): CampoInvalido[] {
    const d = this.detalles ?? {};
    if (Array.isArray(d.campos)) {
      return d.campos.flatMap((c: unknown) => {
        if (typeof c === 'string') return [{ campo: c, mensaje: this.message }];
        if (typeof c === 'object' && c !== null && 'campo' in c) {
          const { campo, mensaje } = c as { campo: unknown; mensaje?: unknown };
          return [{ campo: String(campo), mensaje: String(mensaje ?? this.message) }];
        }
        return [];
      });
    }
    if (typeof d.campo === 'string') return [{ campo: d.campo, mensaje: this.message }];
    return [];
  }
}

/** Mensajes de respaldo: dicen qué pasó y cómo resolverlo (§8). */
const RESPALDO: Record<string, string> = {
  SIN_CONEXION: 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.',
  NO_AUTENTICADO: 'Tu sesión terminó. Inicia sesión de nuevo.',
  SIN_PERMISO:
    'Tu rol no tiene permiso para esta acción. Si lo necesitas, pídelo a administración.',
  NO_ENCONTRADO: 'No encontramos lo que buscas. Puede que se haya eliminado.',
  LIMITE_EXCEDIDO: 'Demasiados intentos seguidos. Espera un minuto y vuelve a intentar.',
  ERROR_INTERNO: 'Ocurrió un error en el servidor. Intenta de nuevo en unos segundos.',
  DESCONOCIDO: 'Algo salió mal. Intenta de nuevo.',
};

export function respaldoPara(codigo: CodigoErrorCliente): string {
  return RESPALDO[codigo] ?? RESPALDO.DESCONOCIDO;
}

export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi) return error.message || respaldoPara(error.codigo);
  return RESPALDO.DESCONOCIDO;
}

export function esErrorApi(error: unknown, codigo?: CodigoErrorCliente): error is ErrorApi {
  return error instanceof ErrorApi && (codigo === undefined || error.codigo === codigo);
}
