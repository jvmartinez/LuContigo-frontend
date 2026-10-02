import type { FieldValues, Resolver } from 'react-hook-form';
import { z, type ZodTypeAny } from 'zod';
import { ErrorApi } from '@/api/errores';

/** Mensajes de Zod en español neutro: dicen qué falta y cómo corregirlo. */
const mapaEspanol: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null')
        return { message: 'Este campo es obligatorio' };
      if (issue.expected === 'integer') return { message: 'Usa un número entero' };
      if (issue.expected === 'number') return { message: 'Escribe un número' };
      return { message: 'Valor no válido' };
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email')
        return { message: 'Escribe un email válido, p. ej. nombre@correo.com' };
      if (issue.validation === 'datetime') return { message: 'Fecha y hora no válidas' };
      return { message: ctx.defaultError };
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string')
        return {
          message:
            issue.minimum === 1
              ? 'Este campo es obligatorio'
              : `Escribe al menos ${issue.minimum} caracteres`,
        };
      if (issue.type === 'number') return { message: `El mínimo es ${issue.minimum}` };
      return { message: ctx.defaultError };
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `Máximo ${issue.maximum} caracteres` };
      if (issue.type === 'number') return { message: `El máximo es ${issue.maximum}` };
      return { message: ctx.defaultError };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'Elige una opción de la lista' };
    case z.ZodIssueCode.not_multiple_of:
      return { message: 'Usa un número entero' };
    default:
      return { message: ctx.defaultError };
  }
};

z.setErrorMap(mapaEspanol);

/** Los campos vacíos de un formulario ('' o espacios) se envían como ausentes. */
export function sinVacios<T extends Record<string, unknown>>(valores: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(valores).filter(([, v]) => !(typeof v === 'string' && v.trim() === '')),
  ) as Partial<T>;
}

function asignar(destino: Record<string, unknown>, ruta: (string | number)[], valor: unknown) {
  let nodo = destino;
  ruta.forEach((clave, i) => {
    if (i === ruta.length - 1) {
      nodo[clave] ??= valor;
      return;
    }
    nodo[clave] ??= typeof ruta[i + 1] === 'number' ? [] : {};
    nodo = nodo[clave] as Record<string, unknown>;
  });
}

/**
 * Valida un formulario con un esquema Zod compartido con la API (`@/shared`). `mapear` convierte
 * los valores del formulario (texto) en la entrada de la API; `aCampo` traduce rutas del esquema
 * a nombres de campo cuando no coinciden (p. ej. presionSistolica → presion).
 */
export function resolverZod<TForm extends FieldValues, S extends ZodTypeAny>(
  esquema: S,
  mapear: (valores: TForm) => unknown = (v) => v,
  aCampo: (ruta: string) => string = (r) => r,
): Resolver<TForm, unknown, z.output<S>> {
  return async (valores) => {
    const r = await esquema.safeParseAsync(mapear(valores));
    if (r.success) return { values: r.data, errors: {} };
    const errores: Record<string, unknown> = {};
    for (const issue of r.error.issues) {
      const ruta = aCampo(issue.path.join('.') || 'root')
        .split('.')
        .map((p) => (/^\d+$/.test(p) ? Number(p) : p));
      asignar(errores, ruta, { type: issue.code, message: issue.message });
    }
    return { values: {}, errors: errores as never };
  };
}

/**
 * Pasa al formulario los errores por campo que devuelve la API (422 con `detalles.campos`).
 * Devuelve `true` si pudo asignar alguno.
 */
export function erroresDeApiEnFormulario(
  error: unknown,
  setError: (campo: never, e: { type: string; message: string }) => void,
  campos: readonly string[],
): boolean {
  if (!(error instanceof ErrorApi)) return false;
  let asignado = false;
  for (const { campo, mensaje } of error.camposInvalidos) {
    if (campos.includes(campo)) {
      setError(campo as never, { type: 'api', message: mensaje });
      asignado = true;
    }
  }
  return asignado;
}
