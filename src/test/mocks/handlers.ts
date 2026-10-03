import { http, HttpResponse, type HttpResponseResolver } from 'msw';
import { API_URL } from '@/api/client';
import type { Cita, Consulta, EventoHistorial, Paciente } from '@/api/tipos';
import { diaSemana, horaAMinutos, instanteLocal, minutosEn, sumarDias } from '@/lib/fechas';
import { calcularAlertas, calcularImc } from '@/shared/signos-vitales';
import { ESTADOS_INACTIVOS, type EstadoCita, type Rol } from '@/shared/enums';
import type { CodigoError } from '@/shared/errores';
import {
  CONTRASENA_DEMO,
  crearDb,
  nuevoId,
  ZONA,
  type CitaMock,
  type Db,
  type UsuarioMock,
} from './datos';

/**
 * API simulada con MSW: reproduce el contrato y las reglas de negocio principales del backend
 * (máquina de estados, disponibilidad, 409 HORARIO_OCUPADO, permisos por rol) sobre datos en
 * memoria. La usan las pruebas y el modo `npm run dev:mock`.
 */

export let db: Db = crearDb();
export function reiniciarDb(ahora?: Date): Db {
  db = crearDb(ahora);
  return db;
}

const url = (ruta: string) => `${API_URL}/${ruta}`;

export function errorApi(
  status: number,
  codigo: CodigoError,
  mensaje: string,
  detalles?: Record<string, unknown>,
) {
  return HttpResponse.json(
    { error: { codigo, mensaje, ...(detalles && { detalles }) } },
    { status },
  );
}

// ─── Sesión ─────────────────────────────────────────────────────────────────

/**
 * Sesión del refresh token simulado (la "cookie"). En el navegador se recuerda en
 * sessionStorage para que recargar la página no cierre la sesión de demostración; solo guarda
 * el id del usuario de demo, nunca datos de pacientes.
 */
const CLAVE_SESION = 'medicita:mock-sesion';
let sesionRefresh: string | null = (() => {
  try {
    return sessionStorage.getItem(CLAVE_SESION);
  } catch {
    return null;
  }
})();
export const fijarSesionRefresh = (usuarioId: string | null) => {
  sesionRefresh = usuarioId;
  try {
    if (usuarioId) sessionStorage.setItem(CLAVE_SESION, usuarioId);
    else sessionStorage.removeItem(CLAVE_SESION);
  } catch {
    // Sin almacenamiento: la sesión dura hasta recargar.
  }
};

function usuarioDe(request: Request): UsuarioMock | null {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const id = token?.startsWith('mock.') ? token.slice(5) : null;
  return db.usuarios.find((u) => u.id === id && u.activo) ?? null;
}

type Resolver = (args: {
  request: Request;
  params: Record<string, string>;
  u: UsuarioMock;
}) => Response | Promise<Response>;

/** Envuelve un handler: exige sesión y, si se indican, roles. */
function con(roles: Rol[] | null, fn: Resolver): HttpResponseResolver {
  return async ({ request, params }) => {
    const u = usuarioDe(request);
    if (!u) return errorApi(401, 'NO_AUTENTICADO', 'Inicia sesión para continuar.');
    if (roles && !roles.includes(u.rol))
      return errorApi(403, 'SIN_PERMISO', 'No tienes permiso para esta acción.');
    return fn({ request, params: params as Record<string, string>, u });
  };
}

const cuerpo = async <T>(r: Request): Promise<T> => (await r.json().catch(() => ({}))) as T;
const q = (r: Request) => new URL(r.url).searchParams;

// ─── Serializadores (mismas formas que el backend) ──────────────────────────

const personalDe = (id: string) => db.personal.find((p) => p.id === id)!;
const especialidadDe = (id: string | null) => db.especialidades.find((e) => e.id === id) ?? null;

export function serializarCita(c: CitaMock): Cita {
  const p = db.pacientes.find((x) => x.id === c.pacienteId)!;
  const m = personalDe(c.medicoId);
  return {
    id: c.id,
    estado: c.estado,
    inicio: c.inicio,
    fin: c.fin,
    motivo: c.motivo,
    canalOrigen: c.canalOrigen,
    motivoCancelacion: c.motivoCancelacion,
    pacienteId: c.pacienteId,
    paciente: { id: p.id, nombres: p.nombres, apellidos: p.apellidos, documento: p.documento },
    medico: {
      id: m.id,
      nombre: m.nombre,
      especialidad: especialidadDe(m.especialidadId)?.nombre ?? null,
    },
    consultorio: {
      id: c.consultorioId,
      nombre: db.consultorios.find((x) => x.id === c.consultorioId)!.nombre,
    },
    recordatorio: null,
  };
}

function serializarPersonal(id: string) {
  const p = personalDe(id);
  const u = db.usuarios.find((x) => x.id === p.usuarioId)!;
  const esp = especialidadDe(p.especialidadId);
  const con = db.consultorios.find((c) => c.id === p.consultorioId);
  return {
    id: p.id,
    nombre: p.nombre,
    email: u.email,
    rol: u.rol,
    activo: u.activo,
    licencia: p.licencia,
    especialidad: esp && { id: esp.id, nombre: esp.nombre },
    consultorio: con ? { id: con.id, nombre: con.nombre } : null,
  };
}

const rolDe = (personalId: string) => db.usuarios.find((u) => u.personalId === personalId)?.rol;

// ─── Reglas ─────────────────────────────────────────────────────────────────

const TRANSICIONES: Record<string, { desde: EstadoCita[]; hacia: EstadoCita; roles: Rol[] }> = {
  confirmar: { desde: ['PROGRAMADA'], hacia: 'CONFIRMADA', roles: ['PACIENTE', 'RECEPCION'] },
  llegada: { desde: ['PROGRAMADA', 'CONFIRMADA'], hacia: 'EN_ESPERA', roles: ['RECEPCION'] },
  signos: { desde: ['EN_ESPERA'], hacia: 'LISTA', roles: ['ENFERMERA'] },
  iniciar: { desde: ['EN_ESPERA', 'LISTA'], hacia: 'EN_CONSULTA', roles: ['MEDICO'] },
  cerrar: { desde: ['EN_CONSULTA'], hacia: 'ATENDIDA', roles: ['MEDICO'] },
  cancelar: {
    desde: ['PROGRAMADA', 'CONFIRMADA'],
    hacia: 'CANCELADA',
    roles: ['PACIENTE', 'RECEPCION'],
  },
  'no-asistio': { desde: ['PROGRAMADA', 'CONFIRMADA'], hacia: 'NO_ASISTIO', roles: ['RECEPCION'] },
  reprogramar: {
    desde: ['PROGRAMADA', 'CONFIRMADA'],
    hacia: 'PROGRAMADA',
    roles: ['RECEPCION', 'PACIENTE'],
  },
};

function transicionar(
  c: CitaMock,
  accion: string,
  u: UsuarioMock | null,
  rol: Rol,
): Response | null {
  const t = TRANSICIONES[accion];
  if (!t.roles.includes(rol))
    return errorApi(403, 'SIN_PERMISO', 'Tu rol no puede realizar esta acción sobre la cita.');
  if (!t.desde.includes(c.estado)) {
    return errorApi(
      409,
      'TRANSICION_INVALIDA',
      `No se puede ${accion} una cita en estado ${c.estado}.`,
      { estado: c.estado, accion },
    );
  }
  c.historial.push({
    de: c.estado,
    a: t.hacia,
    usuarioId: u?.id ?? null,
    fecha: new Date().toISOString(),
  });
  c.estado = t.hacia;
  return null;
}

function puedeVer(c: CitaMock, u: UsuarioMock): boolean {
  if (u.rol === 'PACIENTE') return c.pacienteId === u.pacienteId;
  if (u.rol === 'MEDICO') return c.medicoId === u.personalId;
  if (u.rol === 'ENFERMERA')
    return medicosDeEnfermera(u.personalId!, fechaDe(c.inicio)).includes(c.medicoId);
  return true;
}

const fechaDe = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(iso));

function medicosDeEnfermera(enfermeraId: string, fecha: string): string[] {
  return [
    ...new Set(
      db.asignaciones
        .filter((a) => a.fecha === fecha && a.enfermera.id === enfermeraId)
        .map((a) => a.medico.id),
    ),
  ];
}

const activa = (c: CitaMock) => !ESTADOS_INACTIVOS.includes(c.estado);
const solapan = (a: { inicio: string; fin: string }, b: { inicio: string; fin: string }) =>
  new Date(a.inicio) < new Date(b.fin) && new Date(b.inicio) < new Date(a.fin);

const duracionDe = (medicoId: string) =>
  especialidadDe(personalDe(medicoId).especialidadId)?.duracionCitaMin ?? 30;

function huecos(medicoId: string, desde: string, hasta: string) {
  const dur = duracionDe(medicoId);
  const resultado: { inicio: string; fin: string }[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    for (const b of (db.horarios[medicoId] ?? []).filter((x) => x.diaSemana === diaSemana(f))) {
      for (let m = horaAMinutos(b.horaInicio); m + dur <= horaAMinutos(b.horaFin); m += dur) {
        const inicio = instanteLocal(
          f,
          `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
          ZONA,
        );
        const h = {
          inicio: inicio.toISOString(),
          fin: new Date(inicio.getTime() + dur * 60_000).toISOString(),
        };
        const ocupado =
          db.citas.some((c) => c.medicoId === medicoId && activa(c) && solapan(c, h)) ||
          (db.ausencias[medicoId] ?? []).some((a) => solapan({ inicio: a.desde, fin: a.hasta }, h));
        if (!ocupado) resultado.push(h);
      }
    }
  }
  return resultado;
}

function validarHorario(medicoId: string, inicio: Date): Response | null {
  const dur = duracionDe(medicoId);
  const h = {
    inicio: inicio.toISOString(),
    fin: new Date(inicio.getTime() + dur * 60_000).toISOString(),
  };
  if (inicio <= new Date())
    return errorApi(422, 'VALIDACION', 'La cita debe ser en el futuro', { campo: 'inicio' });
  const fecha = fechaDe(h.inicio);
  const min = minutosEn(h.inicio, ZONA);
  const cabe = (db.horarios[medicoId] ?? []).some(
    (b) =>
      b.diaSemana === diaSemana(fecha) &&
      horaAMinutos(b.horaInicio) <= min &&
      min + dur <= horaAMinutos(b.horaFin),
  );
  if (!cabe) return errorApi(409, 'FUERA_DE_HORARIO', 'El médico no atiende en ese horario.');
  if ((db.ausencias[medicoId] ?? []).some((a) => solapan({ inicio: a.desde, fin: a.hasta }, h))) {
    return errorApi(409, 'MEDICO_AUSENTE', 'El médico no está disponible en esa fecha.');
  }
  if (db.citas.some((c) => c.medicoId === medicoId && activa(c) && solapan(c, h))) {
    return errorApi(409, 'HORARIO_OCUPADO', 'Ese horario ya tiene una cita. Elige otro.', {
      medicoId,
      inicio: h.inicio,
    });
  }
  return null;
}

function auditar(
  u: UsuarioMock | null,
  accion: string,
  entidad: string,
  entidadId: string | null,
  pacienteId: string | null,
) {
  db.auditoria.unshift({
    id: nuevoId('aud'),
    usuarioId: u?.id ?? null,
    accion,
    entidad,
    entidadId,
    pacienteId,
    ip: '127.0.0.1',
    fecha: new Date().toISOString(),
  });
}

function edad(p: Paciente) {
  const hoy = new Date();
  const n = new Date(p.fechaNacimiento);
  let a = hoy.getFullYear() - n.getFullYear();
  if (
    hoy.getMonth() < n.getMonth() ||
    (hoy.getMonth() === n.getMonth() && hoy.getDate() < n.getDate())
  )
    a--;
  return a;
}

const notaBase = (c: CitaMock): Consulta => ({
  id: nuevoId('cns'),
  citaId: c.id,
  pacienteId: c.pacienteId,
  medicoId: c.medicoId,
  motivo: null,
  examenFisico: null,
  diagnostico: null,
  cie10: null,
  tratamiento: null,
  indicaciones: null,
  cerradaEn: null,
  actualizadaEn: new Date().toISOString(),
});

function diaDe(fecha: string) {
  const desde = instanteLocal(fecha, '00:00', ZONA);
  return { desde, hasta: new Date(desde.getTime() + 86_400_000) };
}

// ─── Handlers ───────────────────────────────────────────────────────────────

export const handlers = [
  // Autenticación
  http.post(url('auth/login'), async ({ request }) => {
    const { email, password } = await cuerpo<{ email: string; password: string }>(request);
    const u = db.usuarios.find((x) => x.email === email?.toLowerCase());
    if (!u || password !== CONTRASENA_DEMO)
      return errorApi(401, 'NO_AUTENTICADO', 'Email o contraseña incorrectos.');
    if (!u.activo) return errorApi(401, 'NO_AUTENTICADO', 'Tu cuenta está desactivada.');
    fijarSesionRefresh(u.id);
    return HttpResponse.json({ accessToken: `mock.${u.id}`, expiraEn: 900 });
  }),
  http.post(url('auth/refresh'), () =>
    sesionRefresh
      ? HttpResponse.json({ accessToken: `mock.${sesionRefresh}`, expiraEn: 900 })
      : errorApi(401, 'NO_AUTENTICADO', 'La sesión expiró. Inicia sesión de nuevo.'),
  ),
  http.post(url('auth/logout'), () => {
    fijarSesionRefresh(null);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(url('auth/olvide-contrasena'), () => new HttpResponse(null, { status: 204 })),
  http.post(url('auth/restablecer-contrasena'), async ({ request }) => {
    const { token } = await cuerpo<{ token: string }>(request);
    return token === 'vencido'
      ? errorApi(410, 'TOKEN_INVALIDO', 'El enlace no es válido o ya expiró.')
      : new HttpResponse(null, { status: 204 });
  }),
  http.get(
    url('auth/yo'),
    con(null, ({ u }) => {
      const per = u.personalId ? personalDe(u.personalId) : null;
      const pac = u.pacienteId ? db.pacientes.find((p) => p.id === u.pacienteId)! : null;
      return HttpResponse.json({
        id: u.id,
        email: u.email,
        rol: u.rol,
        clinica: {
          id: db.clinica.id,
          nombre: db.clinica.nombre,
          zonaHoraria: db.clinica.zonaHoraria,
          pais: db.clinica.pais,
        },
        personal: per && {
          id: per.id,
          nombre: per.nombre,
          especialidad: especialidadDe(per.especialidadId)?.nombre ?? null,
          consultorio: db.consultorios.find((c) => c.id === per.consultorioId)?.nombre ?? null,
        },
        paciente: pac && {
          id: pac.id,
          nombres: pac.nombres,
          apellidos: pac.apellidos,
          canalPreferido: pac.canalPreferido,
        },
      });
    }),
  ),

  // Catálogos
  http.get(
    url('clinica'),
    con(null, () => HttpResponse.json(db.clinica)),
  ),
  http.get(
    url('especialidades'),
    con(null, () => HttpResponse.json(db.especialidades)),
  ),
  http.post(
    url('especialidades'),
    con(['ADMIN'], async ({ request }) => {
      const e = await cuerpo<{ nombre: string; duracionCitaMin?: number }>(request);
      const nueva = {
        id: nuevoId('esp'),
        nombre: e.nombre,
        duracionCitaMin: e.duracionCitaMin ?? 30,
      };
      db.especialidades.push(nueva);
      return HttpResponse.json(nueva, { status: 201 });
    }),
  ),
  http.patch(
    url('especialidades/:id'),
    con(['ADMIN'], async ({ request, params }) => {
      const e = db.especialidades.find((x) => x.id === params.id);
      if (!e)
        return errorApi(404, 'NO_ENCONTRADO', 'La especialidad no existe o no tienes acceso.');
      Object.assign(e, await cuerpo(request));
      return HttpResponse.json(e);
    }),
  ),
  http.get(
    url('consultorios'),
    con(['ADMIN', 'RECEPCION'], () => HttpResponse.json(db.consultorios)),
  ),
  http.post(
    url('consultorios'),
    con(['ADMIN'], async ({ request }) => {
      const e = await cuerpo<{ nombre: string; especialidadId?: string }>(request);
      const esp = especialidadDe(e.especialidadId ?? null);
      const nuevo = {
        id: nuevoId('con'),
        nombre: e.nombre,
        activo: true,
        especialidadId: esp?.id ?? null,
        especialidad: esp && { id: esp.id, nombre: esp.nombre },
      };
      db.consultorios.push(nuevo);
      return HttpResponse.json(nuevo, { status: 201 });
    }),
  ),
  http.patch(
    url('consultorios/:id'),
    con(['ADMIN'], async ({ request, params }) => {
      const c = db.consultorios.find((x) => x.id === params.id);
      if (!c) return errorApi(404, 'NO_ENCONTRADO', 'El consultorio no existe o no tienes acceso.');
      const e = await cuerpo<{ nombre?: string; especialidadId?: string | null; activo?: boolean }>(
        request,
      );
      Object.assign(c, e);
      if (e.especialidadId !== undefined) {
        const esp = especialidadDe(e.especialidadId);
        c.especialidad = esp && { id: esp.id, nombre: esp.nombre };
      }
      return HttpResponse.json(c);
    }),
  ),

  // Personal
  http.get(
    url('medicos'),
    con(null, () =>
      HttpResponse.json(
        db.personal
          .filter(
            (p) =>
              rolDe(p.id) === 'MEDICO' && db.usuarios.find((u) => u.id === p.usuarioId)!.activo,
          )
          .map((p) => ({
            id: p.id,
            nombre: p.nombre,
            especialidad: especialidadDe(p.especialidadId),
          })),
      ),
    ),
  ),
  http.get(
    url('personal'),
    con(['ADMIN', 'RECEPCION'], ({ request }) => {
      const rol = q(request).get('rol');
      return HttpResponse.json(
        db.personal
          .filter((p) => !rol || rolDe(p.id) === rol)
          .map((p) => serializarPersonal(p.id))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
    }),
  ),
  http.post(
    url('personal'),
    con(['ADMIN'], async ({ request }) => {
      const e = await cuerpo<{
        nombre: string;
        email: string;
        rol: Rol;
        especialidadId?: string;
        licencia?: string;
        consultorioId?: string;
      }>(request);
      if (db.usuarios.some((u) => u.email === e.email)) {
        return errorApi(409, 'DUPLICADO', 'Ya existe un registro con esos datos.', {
          campos: ['email'],
        });
      }
      const id = nuevoId('per');
      const usuarioId = nuevoId('usu');
      db.usuarios.push({ id: usuarioId, email: e.email, rol: e.rol, activo: true, personalId: id });
      db.personal.push({
        id,
        usuarioId,
        nombre: e.nombre,
        especialidadId: e.especialidadId ?? null,
        licencia: e.licencia ?? null,
        consultorioId: e.consultorioId ?? null,
      });
      db.horarios[id] = [];
      return HttpResponse.json(serializarPersonal(id), { status: 201 });
    }),
  ),
  http.patch(
    url('personal/:id'),
    con(['ADMIN'], async ({ request, params }) => {
      const p = db.personal.find((x) => x.id === params.id);
      if (!p)
        return errorApi(
          404,
          'NO_ENCONTRADO',
          'El miembro del personal no existe o no tienes acceso.',
        );
      const { activo, ...datos } = await cuerpo<{ activo?: boolean } & Record<string, unknown>>(
        request,
      );
      Object.assign(p, datos);
      if (activo !== undefined) db.usuarios.find((u) => u.id === p.usuarioId)!.activo = activo;
      return HttpResponse.json(serializarPersonal(p.id));
    }),
  ),
  http.get(
    url('personal/:id/horarios'),
    con(null, ({ params }) =>
      HttpResponse.json({ personalId: params.id, bloques: db.horarios[params.id] ?? [] }),
    ),
  ),
  http.put(
    url('personal/:id/horarios'),
    con(['ADMIN'], async ({ request, params }) => {
      const { bloques } = await cuerpo<{ bloques: Db['horarios'][string] }>(request);
      db.horarios[params.id] = bloques;
      return HttpResponse.json({ personalId: params.id, bloques });
    }),
  ),
  http.get(
    url('personal/:id/ausencias'),
    con(null, ({ params }) =>
      HttpResponse.json(
        (db.ausencias[params.id] ?? []).filter((a) => new Date(a.hasta) >= new Date()),
      ),
    ),
  ),
  http.post(
    url('personal/:id/ausencias'),
    con(['ADMIN'], async ({ request, params }) => {
      const e = await cuerpo<{ desde: string; hasta: string; motivo?: string }>(request);
      const ausencia = {
        id: nuevoId('aus'),
        desde: new Date(e.desde).toISOString(),
        hasta: new Date(e.hasta).toISOString(),
        motivo: e.motivo ?? null,
      };
      (db.ausencias[params.id] ??= []).push(ausencia);
      const afectadas = db.citas.filter(
        (c) =>
          c.medicoId === params.id &&
          activa(c) &&
          solapan(c, { inicio: ausencia.desde, fin: ausencia.hasta }),
      );
      return HttpResponse.json(
        { ausencia, citasAfectadas: afectadas.map(serializarCita) },
        { status: 201 },
      );
    }),
  ),
  http.delete(
    url('personal/:id/ausencias/:ausenciaId'),
    con(['ADMIN'], ({ params }) => {
      db.ausencias[params.id] = (db.ausencias[params.id] ?? []).filter(
        (a) => a.id !== params.ausenciaId,
      );
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  // Asignaciones
  http.get(
    url('asignaciones'),
    con(['ADMIN', 'RECEPCION', 'MEDICO', 'ENFERMERA'], ({ request, u }) => {
      const fecha = q(request).get('fecha') ?? db.hoy;
      return HttpResponse.json(
        db.asignaciones.filter(
          (a) =>
            a.fecha === fecha &&
            (u.rol !== 'MEDICO' || a.medico.id === u.personalId) &&
            (u.rol !== 'ENFERMERA' || a.enfermera.id === u.personalId),
        ),
      );
    }),
  ),
  http.put(
    url('asignaciones'),
    con(['ADMIN'], async ({ request }) => {
      const e = await cuerpo<{
        fecha: string;
        turno: 'MANANA' | 'TARDE';
        medicoId: string;
        enfermeraId: string;
      }>(request);
      const med = personalDe(e.medicoId);
      const enf = personalDe(e.enfermeraId);
      db.asignaciones = db.asignaciones.filter(
        (a) => !(a.fecha === e.fecha && a.turno === e.turno && a.medico.id === e.medicoId),
      );
      const fila = {
        id: nuevoId('asg'),
        fecha: e.fecha,
        turno: e.turno,
        medico: {
          id: med.id,
          nombre: med.nombre,
          especialidad: especialidadDe(med.especialidadId)?.nombre ?? null,
        },
        enfermera: { id: enf.id, nombre: enf.nombre },
      };
      db.asignaciones.push(fila);
      return HttpResponse.json({
        id: fila.id,
        fecha: e.fecha,
        turno: e.turno,
        medicoId: med.id,
        enfermeraId: enf.id,
      });
    }),
  ),

  // Citas
  http.get(
    url('disponibilidad'),
    con(null, ({ request }) => {
      const p = q(request);
      const medicoId = p.get('medicoId')!;
      if (!db.personal.some((x) => x.id === medicoId))
        return errorApi(404, 'NO_ENCONTRADO', 'El médico no existe o no tienes acceso.');
      return HttpResponse.json({
        medicoId,
        duracionMin: duracionDe(medicoId),
        huecos: huecos(medicoId, p.get('desde')!, p.get('hasta')!),
      });
    }),
  ),
  http.get(
    url('citas'),
    con(['RECEPCION', 'MEDICO', 'ENFERMERA', 'ADMIN'], ({ request, u }) => {
      const fecha = q(request).get('fecha') ?? db.hoy;
      const { desde, hasta } = diaDe(fecha);
      const citas = db.citas
        .filter((c) => new Date(c.inicio) >= desde && new Date(c.inicio) < hasta && puedeVer(c, u))
        .sort((a, b) => a.inicio.localeCompare(b.inicio));
      return HttpResponse.json({ fecha, citas: citas.map(serializarCita) });
    }),
  ),
  http.get(
    url('citas/:id'),
    con(null, ({ params, u }) => {
      const c = db.citas.find((x) => x.id === params.id);
      if (!c || !puedeVer(c, u))
        return errorApi(404, 'NO_ENCONTRADO', 'La cita no existe o no tienes acceso.');
      return HttpResponse.json({ ...serializarCita(c), historialEstados: c.historial });
    }),
  ),
  http.post(
    url('citas'),
    con(['RECEPCION', 'PACIENTE'], async ({ request, u }) => {
      const e = await cuerpo<{
        pacienteId?: string;
        medicoId: string;
        inicio: string;
        motivo?: string;
        canalOrigen?: string;
      }>(request);
      const pacienteId = u.rol === 'PACIENTE' ? u.pacienteId : e.pacienteId;
      if (!pacienteId)
        return errorApi(422, 'VALIDACION', 'pacienteId es obligatorio', { campo: 'pacienteId' });
      const inicio = new Date(e.inicio);
      const error = validarHorario(e.medicoId, inicio);
      if (error) return error;
      const med = personalDe(e.medicoId);
      const c: CitaMock = {
        id: nuevoId('cit'),
        pacienteId,
        medicoId: med.id,
        consultorioId: med.consultorioId!,
        inicio: inicio.toISOString(),
        fin: new Date(inicio.getTime() + duracionDe(med.id) * 60_000).toISOString(),
        estado: 'PROGRAMADA',
        motivo: e.motivo ?? null,
        canalOrigen:
          u.rol === 'PACIENTE'
            ? 'PORTAL_WEB'
            : e.canalOrigen === 'TELEFONO'
              ? 'TELEFONO'
              : 'RECEPCION',
        motivoCancelacion: null,
        historial: [
          { de: null, a: 'PROGRAMADA', usuarioId: u.id, fecha: new Date().toISOString() },
        ],
      };
      db.citas.push(c);
      return HttpResponse.json(
        {
          ...serializarCita(c),
          recordatorioProgramadoPara: new Date(inicio.getTime() - 86_400_000).toISOString(),
        },
        { status: 201 },
      );
    }),
  ),
  http.patch(
    url('citas/:id/reprogramar'),
    con(['RECEPCION', 'PACIENTE'], async ({ request, params, u }) => {
      const c = db.citas.find((x) => x.id === params.id);
      if (!c || !puedeVer(c, u))
        return errorApi(404, 'NO_ENCONTRADO', 'La cita no existe o no tienes acceso.');
      const { inicio } = await cuerpo<{ inicio: string }>(request);
      const estadoPrevio = c.estado;
      c.estado = 'CANCELADA'; // se libera su propio horario al validar
      const error = validarHorario(c.medicoId, new Date(inicio));
      c.estado = estadoPrevio;
      if (error) return error;
      const t = transicionar(c, 'reprogramar', u, u.rol);
      if (t) return t;
      c.inicio = new Date(inicio).toISOString();
      c.fin = new Date(new Date(inicio).getTime() + duracionDe(c.medicoId) * 60_000).toISOString();
      return HttpResponse.json({ ...serializarCita(c), recordatorioProgramadoPara: null });
    }),
  ),
  ...(['confirmar', 'llegada', 'no-asistio', 'iniciar'] as const).map((accion) =>
    http.post(
      url(`citas/:id/${accion}`),
      con(null, ({ params, u }) => {
        const c = db.citas.find((x) => x.id === params.id);
        if (!c || !puedeVer(c, u))
          return errorApi(404, 'NO_ENCONTRADO', 'La cita no existe o no tienes acceso.');
        if (accion === 'no-asistio' && new Date(c.inicio) > new Date()) {
          return errorApi(409, 'TRANSICION_INVALIDA', 'Todavía no llega la hora de la cita.');
        }
        const error = transicionar(c, accion, u, u.rol);
        return error ?? HttpResponse.json(serializarCita(c));
      }),
    ),
  ),
  http.post(
    url('citas/:id/cancelar'),
    con(['RECEPCION', 'PACIENTE'], async ({ request, params, u }) => {
      const c = db.citas.find((x) => x.id === params.id);
      if (!c || !puedeVer(c, u))
        return errorApi(404, 'NO_ENCONTRADO', 'La cita no existe o no tienes acceso.');
      const { motivo } = await cuerpo<{ motivo: string }>(request);
      const error = transicionar(c, 'cancelar', u, u.rol);
      if (error) return error;
      c.motivoCancelacion = motivo;
      return HttpResponse.json(serializarCita(c));
    }),
  ),
  http.get(
    url('pacientes/yo/citas'),
    con(['PACIENTE'], ({ u }) => {
      const propias = db.citas.filter((c) => c.pacienteId === u.pacienteId);
      const ahora = new Date();
      return HttpResponse.json({
        proximas: propias
          .filter((c) => new Date(c.inicio) >= ahora)
          .sort((a, b) => a.inicio.localeCompare(b.inicio))
          .map(serializarCita),
        pasadas: propias
          .filter((c) => new Date(c.inicio) < ahora)
          .sort((a, b) => b.inicio.localeCompare(a.inicio))
          .map(serializarCita),
      });
    }),
  ),
  http.get(
    url('pacientes/yo/indicaciones'),
    con(['PACIENTE'], ({ u }) =>
      HttpResponse.json(
        db.citas
          .filter((c) => c.pacienteId === u.pacienteId && db.consultas[c.id]?.cerradaEn)
          .sort((a, b) => b.inicio.localeCompare(a.inicio))
          .map((c) => {
            const m = personalDe(c.medicoId);
            return {
              citaId: c.id,
              fecha: c.inicio,
              medico: m.nombre,
              especialidad: especialidadDe(m.especialidadId)?.nombre ?? null,
              indicaciones: db.consultas[c.id].indicaciones,
            };
          }),
      ),
    ),
  ),

  // Confirmación pública
  http.get(url('confirmaciones/:token'), ({ params }) => {
    const enlace = db.confirmaciones[params.token as string];
    if (!enlace || enlace.usado)
      return errorApi(410, 'TOKEN_INVALIDO', 'Este enlace ya fue usado.');
    const c = db.citas.find((x) => x.id === enlace.citaId)!;
    const m = personalDe(c.medicoId);
    return HttpResponse.json({
      cita: {
        id: c.id,
        estado: c.estado,
        inicio: c.inicio,
        fin: c.fin,
        paciente: db.pacientes.find((p) => p.id === c.pacienteId)!.nombres,
        medico: m.nombre,
        especialidad: especialidadDe(m.especialidadId)?.nombre ?? null,
        consultorio: db.consultorios.find((x) => x.id === c.consultorioId)!.nombre,
        clinica: {
          nombre: db.clinica.nombre,
          direccion: db.clinica.direccion,
          telefono: db.clinica.telefono,
          zonaHoraria: ZONA,
        },
      },
      accionesDisponibles:
        c.estado === 'PROGRAMADA'
          ? ['confirmar', 'cancelar']
          : c.estado === 'CONFIRMADA'
            ? ['cancelar']
            : [],
    });
  }),
  http.post(url('confirmaciones/:token'), async ({ request, params }) => {
    const enlace = db.confirmaciones[params.token as string];
    if (!enlace || enlace.usado)
      return errorApi(410, 'TOKEN_INVALIDO', 'Este enlace ya fue usado.');
    const { accion } = await cuerpo<{ accion: 'confirmar' | 'cancelar' }>(request);
    const c = db.citas.find((x) => x.id === enlace.citaId)!;
    const error = transicionar(c, accion, null, 'PACIENTE');
    if (error) return error;
    if (accion === 'cancelar') c.motivoCancelacion = 'Cancelada desde el recordatorio';
    enlace.usado = true;
    return HttpResponse.json({ estado: c.estado, inicio: c.inicio });
  }),

  // Pacientes
  http.get(
    url('pacientes'),
    con(['RECEPCION', 'MEDICO', 'ENFERMERA'], ({ request }) => {
      const p = q(request);
      const texto = (p.get('q') ?? '').trim().toLowerCase();
      const page = Number(p.get('page') ?? 1);
      const pageSize = Number(p.get('pageSize') ?? 20);
      const lista = db.pacientes
        .filter(
          (x) =>
            !texto ||
            x.documento.startsWith(texto) ||
            x.nombres.toLowerCase().includes(texto) ||
            x.apellidos.toLowerCase().includes(texto),
        )
        .sort((a, b) => a.apellidos.localeCompare(b.apellidos));
      return HttpResponse.json({
        items: lista
          .slice((page - 1) * pageSize, page * pageSize)
          .map(({ id, nombres, apellidos, documento, fechaNacimiento, telefono }) => ({
            id,
            nombres,
            apellidos,
            documento,
            fechaNacimiento,
            telefono,
          })),
        page,
        pageSize,
        total: lista.length,
      });
    }),
  ),
  http.post(
    url('pacientes'),
    con(['RECEPCION'], async ({ request, u }) => {
      const e = await cuerpo<
        Partial<Paciente> & { consentimientoDatos: boolean; crearAccesoPortal?: boolean }
      >(request);
      if (db.pacientes.some((p) => p.documento === e.documento)) {
        return errorApi(409, 'DUPLICADO', 'Ya existe un registro con esos datos.', {
          campos: ['documento'],
        });
      }
      const nuevo: Paciente = {
        id: nuevoId('pac'),
        nombres: e.nombres!,
        apellidos: e.apellidos!,
        documento: e.documento!,
        fechaNacimiento: e.fechaNacimiento!,
        telefono: e.telefono ?? null,
        email: e.email ?? null,
        alergias: e.alergias ?? null,
        antecedentes: e.antecedentes ?? null,
        seguro: e.seguro ?? null,
        canalPreferido: e.canalPreferido ?? null,
        tieneAccesoPortal: Boolean(e.crearAccesoPortal),
        consentimientoEn: new Date().toISOString(),
      };
      db.pacientes.push(nuevo);
      auditar(u, 'CREAR', 'PACIENTE', nuevo.id, nuevo.id);
      return HttpResponse.json(nuevo, { status: 201 });
    }),
  ),
  http.get(
    url('pacientes/:id'),
    con(['RECEPCION', 'MEDICO', 'ENFERMERA'], ({ params, u }) => {
      const p = db.pacientes.find((x) => x.id === params.id);
      if (!p) return errorApi(404, 'NO_ENCONTRADO', 'El paciente no existe o no tienes acceso.');
      auditar(u, 'LEER', 'PACIENTE', p.id, p.id);
      return HttpResponse.json({ ...p, pacienteId: p.id });
    }),
  ),
  http.patch(
    url('pacientes/:id'),
    con(['RECEPCION'], async ({ request, params, u }) => {
      const p = db.pacientes.find((x) => x.id === params.id);
      if (!p) return errorApi(404, 'NO_ENCONTRADO', 'El paciente no existe o no tienes acceso.');
      Object.assign(p, await cuerpo(request));
      auditar(u, 'ACTUALIZAR', 'PACIENTE', p.id, p.id);
      return HttpResponse.json({ ...p, pacienteId: p.id });
    }),
  ),
  http.get(
    url('pacientes/:id/historial'),
    con(['MEDICO', 'ENFERMERA'], ({ params, u }) => {
      const p = db.pacientes.find((x) => x.id === params.id);
      if (!p) return errorApi(404, 'NO_ENCONTRADO', 'El paciente no existe o no tienes acceso.');
      auditar(u, 'LEER', 'HISTORIAL', p.id, p.id);
      const eventos: EventoHistorial[] = db.citas
        .filter(
          (c) =>
            c.pacienteId === p.id &&
            ['EN_ESPERA', 'LISTA', 'EN_CONSULTA', 'ATENDIDA'].includes(c.estado),
        )
        .sort((a, b) => b.inicio.localeCompare(a.inicio))
        .map((c) => {
          const m = personalDe(c.medicoId);
          const cns = db.consultas[c.id];
          const visible = cns && (cns.cerradaEn || cns.medicoId === u.personalId) ? cns : null;
          return {
            citaId: c.id,
            fecha: c.inicio,
            estado: c.estado,
            medico: {
              id: m.id,
              nombre: m.nombre,
              especialidad: especialidadDe(m.especialidadId)?.nombre ?? null,
            },
            signosVitales: db.signos[c.id] ?? null,
            consulta: visible,
            tareas: visible
              ? db.tareas
                  .filter((t) => t.citaId === c.id)
                  .map((t) => ({
                    ...t,
                    enfermera: { id: t.enfermeraId, nombre: personalDe(t.enfermeraId).nombre },
                  }))
              : [],
          };
        });
      return HttpResponse.json({ pacienteId: p.id, paciente: p, eventos });
    }),
  ),

  // Enfermería
  http.get(
    url('enfermeria/cola'),
    con(['ENFERMERA'], ({ request, u }) => {
      const fecha = q(request).get('fecha') ?? db.hoy;
      const medicos = medicosDeEnfermera(u.personalId!, fecha);
      const { desde, hasta } = diaDe(fecha);
      const citas = db.citas
        .filter(
          (c) =>
            medicos.includes(c.medicoId) &&
            ['EN_ESPERA', 'LISTA'].includes(c.estado) &&
            new Date(c.inicio) >= desde &&
            new Date(c.inicio) < hasta,
        )
        .sort((a, b) => a.inicio.localeCompare(b.inicio))
        .map((c) => {
          const p = db.pacientes.find((x) => x.id === c.pacienteId)!;
          const m = personalDe(c.medicoId);
          return {
            id: c.id,
            pacienteId: p.id,
            estado: c.estado,
            inicio: c.inicio,
            llegadaEn: [...c.historial].reverse().find((h) => h.a === 'EN_ESPERA')?.fecha ?? null,
            paciente: {
              id: p.id,
              nombres: p.nombres,
              apellidos: p.apellidos,
              edad: edad(p),
              alergias: p.alergias,
            },
            medico: { id: m.id, nombre: m.nombre },
            consultorio: {
              id: c.consultorioId,
              nombre: db.consultorios.find((x) => x.id === c.consultorioId)!.nombre,
            },
            alertas: db.signos[c.id]?.alertas ?? [],
          };
        });
      return HttpResponse.json({ fecha, citas });
    }),
  ),
  http.post(
    url('citas/:id/signos-vitales'),
    con(['ENFERMERA'], async ({ request, params, u }) => {
      const c = db.citas.find((x) => x.id === params.id);
      if (!c) return errorApi(404, 'NO_ENCONTRADO', 'La cita no existe o no tienes acceso.');
      if (!puedeVer(c, u))
        return errorApi(403, 'SIN_PERMISO', 'No estás asignada al médico de esta cita.');
      const e = await cuerpo<Record<string, number | string | undefined>>(request);
      const p = db.pacientes.find((x) => x.id === c.pacienteId)!;
      const error = transicionar(c, 'signos', u, u.rol);
      if (error) return error;
      const alertas = calcularAlertas(e as never, edad(p));
      db.signos[c.id] = {
        id: nuevoId('sig'),
        citaId: c.id,
        enfermeraId: u.personalId!,
        presionSistolica: (e.presionSistolica as number) ?? null,
        presionDiastolica: (e.presionDiastolica as number) ?? null,
        frecuenciaCardiaca: (e.frecuenciaCardiaca as number) ?? null,
        temperatura: (e.temperatura as number) ?? null,
        spo2: (e.spo2 as number) ?? null,
        pesoKg: (e.pesoKg as number) ?? null,
        tallaCm: (e.tallaCm as number) ?? null,
        imc: calcularImc(e.pesoKg as number, e.tallaCm as number),
        nota: (e.nota as string) ?? null,
        alertas,
        tomadoEn: new Date().toISOString(),
      };
      auditar(u, 'CREAR', 'SIGNOS_VITALES', db.signos[c.id].id, p.id);
      return HttpResponse.json({ ...db.signos[c.id], pacienteId: p.id }, { status: 201 });
    }),
  ),
  http.get(
    url('enfermeria/tareas'),
    con(['ENFERMERA'], ({ request, u }) => {
      const estado = q(request).get('estado');
      return HttpResponse.json(
        db.tareas
          .filter((t) => t.enfermeraId === u.personalId && (!estado || t.estado === estado))
          .map((t) => {
            const c = db.citas.find((x) => x.id === t.citaId)!;
            const p = db.pacientes.find((x) => x.id === c.pacienteId)!;
            const m = personalDe(c.medicoId);
            return {
              ...t,
              medico: { id: m.id, nombre: m.nombre },
              paciente: { id: p.id, nombres: p.nombres, apellidos: p.apellidos },
            };
          }),
      );
    }),
  ),
  http.post(
    url('tareas/:id/completar'),
    con(['ENFERMERA'], ({ params, u }) => {
      const t = db.tareas.find((x) => x.id === params.id && x.enfermeraId === u.personalId);
      if (!t) return errorApi(404, 'NO_ENCONTRADO', 'La tarea no existe o no tienes acceso.');
      if (t.estado !== 'PENDIENTE')
        return errorApi(409, 'TRANSICION_INVALIDA', `La tarea ya está ${t.estado}.`);
      t.estado = 'HECHA';
      t.completadaEn = new Date().toISOString();
      const c = db.citas.find((x) => x.id === t.citaId)!;
      return HttpResponse.json({ id: t.id, estado: 'HECHA', pacienteId: c.pacienteId });
    }),
  ),

  // Consulta
  http.get(
    url('citas/:id/consulta'),
    con(['MEDICO', 'ENFERMERA'], ({ params, u }) => {
      const cns = db.consultas[params.id];
      if (!cns || (!cns.cerradaEn && cns.medicoId !== u.personalId)) {
        return errorApi(404, 'NO_ENCONTRADO', 'La nota de consulta no existe o no tienes acceso.');
      }
      return HttpResponse.json(cns);
    }),
  ),
  http.put(
    url('citas/:id/consulta'),
    con(['MEDICO'], async ({ request, params, u }) => {
      const c = db.citas.find((x) => x.id === params.id);
      if (!c || c.medicoId !== u.personalId)
        return errorApi(403, 'SIN_PERMISO', 'La cita es de otro médico.');
      if (c.estado !== 'EN_CONSULTA')
        return errorApi(
          409,
          'TRANSICION_INVALIDA',
          `La cita está en ${c.estado}; inicia la consulta primero.`,
        );
      if (db.consultas[c.id]?.cerradaEn)
        return errorApi(409, 'CONSULTA_CERRADA', 'La nota ya está cerrada y no se puede editar.');
      const e = await cuerpo<Record<string, string>>(request);
      db.consultas[c.id] = Object.assign(notaBase(c), db.consultas[c.id], e, {
        cerradaEn: null,
        actualizadaEn: new Date().toISOString(),
      });
      return HttpResponse.json(db.consultas[c.id]);
    }),
  ),
  http.post(
    url('citas/:id/consulta/cerrar'),
    con(['MEDICO'], async ({ request, params, u }) => {
      const c = db.citas.find((x) => x.id === params.id);
      if (!c || c.medicoId !== u.personalId)
        return errorApi(403, 'SIN_PERMISO', 'La cita es de otro médico.');
      const e = await cuerpo<Record<string, string>>(request);
      const final = { ...db.consultas[c.id], ...e };
      const faltan = (['diagnostico', 'tratamiento'] as const).filter((k) => !final[k]?.trim());
      if (faltan.length) {
        return errorApi(
          422,
          'VALIDACION',
          'Para cerrar la consulta se requieren diagnóstico y tratamiento.',
          {
            campos: faltan.map((campo) => ({ campo, mensaje: 'Obligatorio al cerrar' })),
          },
        );
      }
      const error = transicionar(c, 'cerrar', u, u.rol);
      if (error) return error;
      const ahora = new Date().toISOString();
      db.consultas[c.id] = Object.assign(notaBase(c), final, {
        cerradaEn: ahora,
        actualizadaEn: ahora,
      });
      auditar(u, 'CERRAR', 'CONSULTA', db.consultas[c.id].id, c.pacienteId);
      return HttpResponse.json(db.consultas[c.id]);
    }),
  ),
  http.post(
    url('citas/:id/tareas'),
    con(['MEDICO'], async ({ request, params }) => {
      const c = db.citas.find((x) => x.id === params.id);
      if (!c) return errorApi(404, 'NO_ENCONTRADO', 'La cita no existe o no tienes acceso.');
      const e = await cuerpo<{ tipo: string; detalle?: string; enfermeraId?: string }>(request);
      const enfermeraId =
        e.enfermeraId ??
        db.asignaciones.find((a) => a.medico.id === c.medicoId && a.fecha === fechaDe(c.inicio))
          ?.enfermera.id;
      if (!enfermeraId)
        return errorApi(
          409,
          'SIN_ENFERMERA_ASIGNADA',
          'No hay enfermera asignada a tu turno. Indica una.',
        );
      const t = {
        id: nuevoId('tar'),
        citaId: c.id,
        enfermeraId,
        tipo: e.tipo,
        detalle: e.detalle ?? null,
        estado: 'PENDIENTE' as const,
        creadaEn: new Date().toISOString(),
        completadaEn: null,
      };
      db.tareas.push(t);
      return HttpResponse.json(
        {
          id: t.id,
          citaId: c.id,
          pacienteId: c.pacienteId,
          tipo: t.tipo,
          detalle: t.detalle,
          estado: t.estado,
          enfermera: { id: enfermeraId, nombre: personalDe(enfermeraId).nombre },
          creadaEn: t.creadaEn,
        },
        { status: 201 },
      );
    }),
  ),

  // Indicadores y auditoría
  http.get(
    url('indicadores'),
    con(['ADMIN'], ({ request }) => {
      const p = q(request);
      const desde = p.get('desde')!;
      const hasta = p.get('hasta')!;
      const rango = { desde: diaDe(desde).desde, hasta: diaDe(hasta).hasta };
      const citas = db.citas.filter(
        (c) => new Date(c.inicio) >= rango.desde && new Date(c.inicio) < rango.hasta,
      );
      const porEstado: Partial<Record<EstadoCita, number>> = {};
      citas.forEach((c) => (porEstado[c.estado] = (porEstado[c.estado] ?? 0) + 1));
      const atendidas = porEstado.ATENDIDA ?? 0;
      const noAsistio = porEstado.NO_ASISTIO ?? 0;
      const cancelaciones = porEstado.CANCELADA ?? 0;
      const tasa = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
      let dias = 0;
      for (let f = desde; f <= hasta; f = sumarDias(f, 1)) dias++;
      return HttpResponse.json({
        desde,
        hasta,
        citas: citas.length,
        porEstado,
        atendidas,
        cancelaciones,
        noAsistio,
        tasaInasistencia: tasa(noAsistio, atendidas + noAsistio),
        tasaCancelacion: tasa(cancelaciones, citas.length),
        ocupacionPorMedico: db.personal
          .filter((m) => rolDe(m.id) === 'MEDICO')
          .map((m) => {
            const disponibles = dias * 8 * 60;
            const agendados = citas
              .filter((c) => c.medicoId === m.id && activa(c))
              .reduce(
                (s, c) => s + (new Date(c.fin).getTime() - new Date(c.inicio).getTime()) / 60_000,
                0,
              );
            return {
              medicoId: m.id,
              nombre: m.nombre,
              minutosDisponibles: disponibles,
              minutosAgendados: agendados,
              ocupacion: tasa(agendados, disponibles),
            };
          })
          .sort((a, b) => b.ocupacion - a.ocupacion),
      });
    }),
  ),
  http.get(
    url('auditoria'),
    con(['ADMIN'], ({ request }) => {
      const p = q(request);
      const page = Number(p.get('page') ?? 1);
      const pageSize = Number(p.get('pageSize') ?? 20);
      const lista = db.auditoria.filter(
        (a) =>
          (!p.get('documento') ||
            db.pacientes.some(
              (paciente) => paciente.id === a.pacienteId && paciente.documento === p.get('documento'),
            )) &&
          (!p.get('usuarioId') || a.usuarioId === p.get('usuarioId')) &&
          (!p.get('desde') || a.fecha >= new Date(p.get('desde')!).toISOString()),
      );
      return HttpResponse.json({
        items: lista.slice((page - 1) * pageSize, page * pageSize).map((registro) => ({
          ...registro,
          documento: db.pacientes.find((paciente) => paciente.id === registro.pacienteId)?.documento ?? null,
        })),
        page,
        pageSize,
        total: lista.length,
      });
    }),
  ),
];
