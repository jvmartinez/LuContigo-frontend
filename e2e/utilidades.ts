import { createHmac, randomUUID } from 'node:crypto';
import { expect, request, type Page } from '@playwright/test';

/** Datos del seed del backend (LuContigo-backend/prisma/seed.ts). */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const CONTRASENA = process.env.E2E_PASSWORD ?? 'Demo2026medicita';
const SECRETO_CONFIRMACION = process.env.CONFIRMACION_TOKEN_SECRET ?? 'cambiar';

export const CUENTAS = {
  recepcion: 'recepcion@demo.medicita.app',
  enfermera: 'enfermera1@demo.medicita.app',
  medico: 'medico.general@demo.medicita.app',
  paciente: 'paciente@demo.medicita.app',
  admin: 'admin@demo.medicita.app',
} as const;

export const MEDICO_GENERAL = 'Dra. Laura Méndez';
export const PACIENTE_PORTAL = { busqueda: 'Rojas Díaz', nombre: 'Ana María Rojas Díaz' };
export const ZONA = 'America/Bogota';

/** Inicia sesión por la interfaz y espera la pantalla principal del rol. */
export async function entrar(page: Page, email: string, destino: RegExp) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(CONTRASENA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(destino);
}

/** Cliente de la API para preparar datos (como la app móvil: tokens en el cuerpo). */
export async function clienteApi(email: string) {
  const ctx = await request.newContext({ extraHTTPHeaders: { 'X-Cliente': 'mobile' } });
  const login = await ctx.post(`${API_URL}/auth/login`, { data: { email, password: CONTRASENA } });
  expect(login.ok(), `login de ${email}`).toBeTruthy();
  const { accessToken } = await login.json();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const llamar = async <T>(metodo: 'get' | 'post', ruta: string, datos?: object): Promise<T> => {
    const r = await ctx[metodo](`${API_URL}/${ruta}`, { headers, ...(datos && { data: datos }) });
    expect(
      r.ok(),
      `${metodo.toUpperCase()} ${ruta} → ${r.status()} ${await r.text()}`,
    ).toBeTruthy();
    return (await r.json()) as T;
  };
  return {
    get: <T>(ruta: string) => llamar<T>('get', ruta),
    post: <T>(ruta: string, datos: object) => llamar<T>('post', ruta, datos),
    cerrar: () => ctx.dispose(),
  };
}

export const hoyEnClinica = (desplazamientoDias = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(
    new Date(Date.now() + desplazamientoDias * 86_400_000),
  );

export const horaEnClinica = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));

/** Primer hueco libre del médico en la fecha, o null. */
export async function primerHueco(
  api: Awaited<ReturnType<typeof clienteApi>>,
  medicoId: string,
  fecha: string,
): Promise<string | null> {
  const d = await api.get<{ huecos: { inicio: string }[] }>(
    `disponibilidad?medicoId=${medicoId}&desde=${fecha}&hasta=${fecha}`,
  );
  return (
    d.huecos.find((h) => new Date(h.inicio).getTime() > Date.now() + 5 * 60_000)?.inicio ?? null
  );
}

const base64url = (texto: string | Buffer) => Buffer.from(texto).toString('base64url');

/** Firma el enlace del recordatorio igual que el backend (JWT HS256 con citaId y clinicaId). */
export function firmarEnlace(citaId: string, clinicaId: string, inicio: string): string {
  const ahora = Math.floor(Date.now() / 1000);
  const exp = Math.max(Math.floor(new Date(inicio).getTime() / 1000), ahora + 60);
  const cabecera = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const cuerpo = base64url(
    JSON.stringify({ citaId, clinicaId, iat: ahora, exp, jti: randomUUID() }),
  );
  const firma = createHmac('sha256', SECRETO_CONFIRMACION)
    .update(`${cabecera}.${cuerpo}`)
    .digest('base64url');
  return `${cabecera}.${cuerpo}.${firma}`;
}
