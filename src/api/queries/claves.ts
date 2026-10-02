import type { QueryClient } from '@tanstack/react-query';
import type { EstadoTarea, Rol } from '@/shared/enums';

/**
 * Claves de consulta estables (FRONTEND.md §7). Las listas empiezan por el nombre del recurso
 * para poder invalidarlas por prefijo: `['citas']` alcanza a `['citas', { fecha, medicoId }]`.
 */
export const claves = {
  sesion: ['sesion'] as const,
  clinica: ['clinica'] as const,

  citas: (filtro?: { fecha?: string; medicoId?: string }) =>
    filtro ? (['citas', filtro] as const) : (['citas'] as const),
  cita: (id?: string) => (id ? (['cita', id] as const) : (['cita'] as const)),
  disponibilidad: (medicoId?: string, desde?: string, hasta?: string) =>
    medicoId
      ? (['disponibilidad', medicoId, desde, hasta] as const)
      : (['disponibilidad'] as const),
  misCitas: ['mis-citas'] as const,
  confirmacion: (token: string) => ['confirmacion', token] as const,

  pacientes: (filtro?: { q?: string; page?: number }) =>
    filtro ? (['pacientes', filtro] as const) : (['pacientes'] as const),
  paciente: (id: string) => ['paciente', id] as const,
  historial: (id: string) => ['paciente', id, 'historial'] as const,
  indicaciones: ['mis-indicaciones'] as const,

  cola: (fecha?: string) => (fecha ? (['cola', fecha] as const) : (['cola'] as const)),
  tareas: (estado?: EstadoTarea) =>
    estado ? (['tareas', { estado }] as const) : (['tareas'] as const),
  consulta: (citaId: string) => ['consulta', citaId] as const,

  medicos: ['medicos'] as const,
  especialidades: ['especialidades'] as const,
  consultorios: ['consultorios'] as const,
  personal: (rol?: Exclude<Rol, 'PACIENTE'>) =>
    rol ? (['personal', { rol }] as const) : (['personal'] as const),
  horarios: (personalId?: string) =>
    personalId ? (['horarios', personalId] as const) : (['horarios'] as const),
  ausencias: (personalId?: string) =>
    personalId ? (['ausencias', personalId] as const) : (['ausencias'] as const),
  asignaciones: (fecha?: string) =>
    fecha ? (['asignaciones', fecha] as const) : (['asignaciones'] as const),

  indicadores: (desde: string, hasta: string) => ['indicadores', desde, hasta] as const,
  auditoria: (filtro: Record<string, unknown>) => ['auditoria', filtro] as const,
};

/** Todo lo que cambia cuando una cita cambia de estado u horario. */
export function invalidarCitas(qc: QueryClient): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: claves.citas() }),
    qc.invalidateQueries({ queryKey: claves.cita() }),
    qc.invalidateQueries({ queryKey: claves.cola() }),
    qc.invalidateQueries({ queryKey: claves.disponibilidad() }),
    qc.invalidateQueries({ queryKey: claves.misCitas }),
    qc.invalidateQueries({ queryKey: ['indicadores'] }),
  ]);
}
