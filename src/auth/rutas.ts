import type { Rol } from '@/shared/enums';

/** Después del login cada rol aterriza en su ruta principal (§5). */
export const RUTA_INICIO: Record<Rol, string> = {
  RECEPCION: '/agenda',
  ENFERMERA: '/enfermeria',
  MEDICO: '/consultorio',
  PACIENTE: '/mis-citas',
  ADMIN: '/admin/panel',
};

export const NOMBRE_ROL: Record<Rol, string> = {
  RECEPCION: 'Recepción',
  ENFERMERA: 'Enfermería',
  MEDICO: 'Médico',
  PACIENTE: 'Paciente',
  ADMIN: 'Administración',
};

/** Rutas protegidas y los roles que pueden abrirlas. Fuente única para el router y el menú. */
export const ROLES_POR_SECCION = {
  agenda: ['RECEPCION'],
  pacientes: ['RECEPCION'],
  enfermeria: ['ENFERMERA'],
  consultorio: ['MEDICO'],
  portal: ['PACIENTE'],
  admin: ['ADMIN'],
} as const satisfies Record<string, readonly Rol[]>;

/** ¿Puede este rol abrir la ruta? Se usa para respetar `?siguiente=` tras el login. */
export function rutaPermitida(rol: Rol, ruta: string): boolean {
  const seccion = Object.entries({
    '/agenda': ROLES_POR_SECCION.agenda,
    '/pacientes': ROLES_POR_SECCION.pacientes,
    '/enfermeria': ROLES_POR_SECCION.enfermeria,
    '/consultorio': ROLES_POR_SECCION.consultorio,
    '/mis-': ROLES_POR_SECCION.portal,
    '/admin': ROLES_POR_SECCION.admin,
  }).find(([prefijo]) => ruta.startsWith(prefijo));
  return Boolean(seccion && (seccion[1] as readonly Rol[]).includes(rol));
}
