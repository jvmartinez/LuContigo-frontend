import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Rol, Turno } from '@/shared/enums';
import type {
  ActualizarPersonalEntrada,
  CrearPersonalEntrada,
  HorariosEntrada,
} from '@/shared/personal';
import { api } from '../client';
import type {
  Asignacion,
  Ausencia,
  AusenciaCreada,
  Consultorio,
  Especialidad,
  Horarios,
  Indicadores,
  Medico,
  MiembroPersonal,
  Pagina,
  RegistroAuditoria,
} from '../tipos';
import { claves, invalidarCitas } from './claves';

const CATALOGO = { staleTime: 5 * 60_000 };

// ─── Catálogos ──────────────────────────────────────────────────────────────

export function useMedicos() {
  return useQuery({
    queryKey: claves.medicos,
    queryFn: () => api.get<Medico[]>('medicos'),
    ...CATALOGO,
  });
}

export function useEspecialidades() {
  return useQuery({
    queryKey: claves.especialidades,
    queryFn: () => api.get<Especialidad[]>('especialidades'),
    ...CATALOGO,
  });
}

export function useConsultorios() {
  return useQuery({
    queryKey: claves.consultorios,
    queryFn: () => api.get<Consultorio[]>('consultorios'),
    ...CATALOGO,
  });
}

export function useGuardarEspecialidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...datos }: { id?: string; nombre?: string; duracionCitaMin?: number }) =>
      id
        ? api.patch<Especialidad>(`especialidades/${id}`, datos)
        : api.post<Especialidad>('especialidades', datos),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: claves.especialidades }),
        qc.invalidateQueries({ queryKey: claves.medicos }),
        qc.invalidateQueries({ queryKey: claves.consultorios }),
      ]),
  });
}

export function useGuardarConsultorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...datos
    }: {
      id?: string;
      nombre?: string;
      especialidadId?: string | null;
      activo?: boolean;
    }) =>
      id
        ? api.patch<Consultorio>(`consultorios/${id}`, datos)
        : api.post<Consultorio>('consultorios', datos),
    onSettled: () => qc.invalidateQueries({ queryKey: claves.consultorios }),
  });
}

// ─── Personal ───────────────────────────────────────────────────────────────

export function usePersonal(rol?: Exclude<Rol, 'PACIENTE'>) {
  return useQuery({
    queryKey: claves.personal(rol),
    queryFn: () => api.get<MiembroPersonal[]>('personal', { rol }),
  });
}

export const consultaHorarios = (personalId: string) => ({
  queryKey: claves.horarios(personalId),
  queryFn: () => api.get<Horarios>(`personal/${personalId}/horarios`),
  ...CATALOGO,
});

export function useHorarios(personalId: string | undefined) {
  return useQuery({ ...consultaHorarios(personalId ?? ''), enabled: Boolean(personalId) });
}

export const consultaAusencias = (personalId: string) => ({
  queryKey: claves.ausencias(personalId),
  queryFn: () => api.get<Ausencia[]>(`personal/${personalId}/ausencias`),
});

export function useAusencias(personalId: string | undefined) {
  return useQuery({ ...consultaAusencias(personalId ?? ''), enabled: Boolean(personalId) });
}

export function useCrearPersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: CrearPersonalEntrada) => api.post<MiembroPersonal>('personal', datos),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: claves.personal() }),
        qc.invalidateQueries({ queryKey: claves.medicos }),
      ]),
  });
}

export function useActualizarPersonal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: ActualizarPersonalEntrada) =>
      api.patch<MiembroPersonal>(`personal/${id}`, datos),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: claves.personal() }),
        qc.invalidateQueries({ queryKey: claves.medicos }),
      ]),
  });
}

export function useGuardarHorarios(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: HorariosEntrada) => api.put<Horarios>(`personal/${id}/horarios`, datos),
    onSuccess: (h) => qc.setQueryData(claves.horarios(id), h),
    onSettled: () => qc.invalidateQueries({ queryKey: claves.disponibilidad() }),
  });
}

export function useCrearAusencia(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: { desde: string; hasta: string; motivo?: string }) =>
      api.post<AusenciaCreada>(`personal/${id}/ausencias`, datos),
    onSettled: () =>
      Promise.all([qc.invalidateQueries({ queryKey: claves.ausencias(id) }), invalidarCitas(qc)]),
  });
}

export function useEliminarAusencia(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ausenciaId: string) => api.delete(`personal/${id}/ausencias/${ausenciaId}`),
    onSettled: () =>
      Promise.all([qc.invalidateQueries({ queryKey: claves.ausencias(id) }), invalidarCitas(qc)]),
  });
}

// ─── Asignaciones ───────────────────────────────────────────────────────────

export function useAsignaciones(fecha: string) {
  return useQuery({
    queryKey: claves.asignaciones(fecha),
    queryFn: () => api.get<Asignacion[]>('asignaciones', { fecha }),
  });
}

export function useAsignarTurno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: { fecha: string; turno: Turno; medicoId: string; enfermeraId: string }) =>
      api.put('asignaciones', datos),
    onSettled: (_r, _e, datos) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: claves.asignaciones(datos.fecha) }),
        qc.invalidateQueries({ queryKey: claves.cola() }),
      ]),
  });
}

// ─── Indicadores y auditoría ────────────────────────────────────────────────

export function useIndicadores(desde: string, hasta: string) {
  return useQuery({
    queryKey: claves.indicadores(desde, hasta),
    queryFn: () => api.get<Indicadores>('indicadores', { desde, hasta }),
    refetchInterval: 60_000,
  });
}

export interface FiltroAuditoria {
  documento?: string;
  usuarioId?: string;
  desde?: string;
  page: number;
  pageSize: number;
}

export function useAuditoria(filtro: FiltroAuditoria) {
  return useQuery({
    queryKey: claves.auditoria({ ...filtro }),
    queryFn: () => api.get<Pagina<RegistroAuditoria>>('auditoria', { ...filtro }),
  });
}
