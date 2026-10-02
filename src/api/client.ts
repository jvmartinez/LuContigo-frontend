import ky, { HTTPError, TimeoutError, type KyInstance, type Options } from 'ky';
import { ErrorApi, respaldoPara, type CodigoErrorCliente } from './errores';
import type { RespuestaLogin } from './tipos';
import { notificarSesionExpirada, tokenAcceso } from './token';

const base = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');

/** URL absoluta de la API (admite una ruta relativa como "/api/v1"). */
export const API_URL = /^https?:\/\//.test(base)
  ? base
  : `${globalThis.location?.origin ?? 'http://localhost'}${base}`;

/** Rutas donde un 401 no significa "token vencido" sino un error propio de la operación. */
const SIN_REFRESH =
  /\/auth\/(login|refresh|logout|olvide-contrasena|restablecer-contrasena)$|\/confirmaciones\//;

let refrescando: Promise<string | null> | null = null;

/**
 * Pide un access token nuevo con la cookie httpOnly. Las peticiones que fallan a la vez
 * comparten una sola llamada a /auth/refresh (el backend rota el token y rechaza reusos).
 */
export function refrescarToken(): Promise<string | null> {
  refrescando ??= ky
    .post(`${API_URL}/auth/refresh`, { credentials: 'include', json: {}, retry: 0 })
    .json<RespuestaLogin>()
    .then((r) => {
      tokenAcceso.guardar(r.accessToken);
      return r.accessToken;
    })
    .catch(() => {
      tokenAcceso.guardar(null);
      return null;
    })
    .finally(() => {
      refrescando = null;
    });
  return refrescando;
}

export const cliente: KyInstance = ky.create({
  prefixUrl: API_URL,
  credentials: 'include',
  retry: 0,
  timeout: 20_000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = tokenAcceso.obtener();
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      // Ante un 401 refresca una vez y reintenta; si vuelve a fallar, la sesión terminó.
      async (request, _options, response) => {
        if (response.status !== 401 || SIN_REFRESH.test(new URL(request.url).pathname)) return;
        const nuevo = await refrescarToken();
        if (!nuevo) {
          notificarSesionExpirada();
          return;
        }
        request.headers.set('Authorization', `Bearer ${nuevo}`);
        const reintento = await ky(request, { retry: 0, throwHttpErrors: false });
        if (reintento.status === 401) notificarSesionExpirada();
        return reintento;
      },
    ],
  },
});

interface CuerpoError {
  error?: { codigo?: CodigoErrorCliente; mensaje?: string; detalles?: Record<string, unknown> };
}

async function aErrorApi(respuesta: Response): Promise<ErrorApi> {
  const { status } = respuesta;
  try {
    const cuerpo = (await respuesta.json()) as CuerpoError;
    if (cuerpo?.error?.codigo) {
      const { codigo, mensaje, detalles } = cuerpo.error;
      return new ErrorApi(status, codigo, mensaje || respaldoPara(codigo), detalles);
    }
  } catch {
    // Cuerpo que no es JSON (proxy, página de error): se usa el mensaje de respaldo.
  }
  const codigo: CodigoErrorCliente =
    status === 401 ? 'NO_AUTENTICADO' : status >= 500 ? 'ERROR_INTERNO' : 'DESCONOCIDO';
  return new ErrorApi(status, codigo, respaldoPara(codigo));
}

async function normalizar(error: unknown): Promise<ErrorApi> {
  if (error instanceof ErrorApi) return error;
  if (error instanceof HTTPError) return aErrorApi(error.response);
  if (error instanceof TimeoutError || error instanceof TypeError) {
    return new ErrorApi(0, 'SIN_CONEXION', respaldoPara('SIN_CONEXION'));
  }
  return new ErrorApi(0, 'DESCONOCIDO', respaldoPara('DESCONOCIDO'));
}

export type Parametros = Record<string, string | number | boolean | null | undefined>;

function limpiarParametros(p?: Parametros): Record<string, string> | undefined {
  if (!p) return undefined;
  return Object.fromEntries(
    Object.entries(p)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)]),
  );
}

async function ejecutar<T>(ruta: string, opciones: Options): Promise<T> {
  try {
    const respuesta = await cliente(ruta.replace(/^\//, ''), opciones);
    // El reintento tras el refresh no lanza por sí mismo: se revisa aquí.
    if (!respuesta.ok) throw await aErrorApi(respuesta);
    if (respuesta.status === 204) return undefined as T;
    const texto = await respuesta.text();
    return (texto ? JSON.parse(texto) : undefined) as T;
  } catch (e) {
    throw await normalizar(e);
  }
}

/** Cliente tipado. Toda falla se lanza como `ErrorApi`. */
export const api = {
  get: <T>(ruta: string, parametros?: Parametros) =>
    ejecutar<T>(ruta, { method: 'get', searchParams: limpiarParametros(parametros) }),
  post: <T>(ruta: string, cuerpo?: unknown) =>
    ejecutar<T>(ruta, { method: 'post', json: cuerpo ?? {} }),
  put: <T>(ruta: string, cuerpo?: unknown) =>
    ejecutar<T>(ruta, { method: 'put', json: cuerpo ?? {} }),
  patch: <T>(ruta: string, cuerpo?: unknown) =>
    ejecutar<T>(ruta, { method: 'patch', json: cuerpo ?? {} }),
  delete: <T = void>(ruta: string) => ejecutar<T>(ruta, { method: 'delete' }),
};
