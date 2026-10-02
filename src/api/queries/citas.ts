import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CanalOrigen } from '@/shared/enums';
import { api } from '../client';
import type {
  Agenda,
  Cita,
  CitaCreada,
  CitaDetalle,
  ConfirmacionPublica,
  Disponibilidad,
  MisCitas,
  ResultadoConfirmacion,
} from '../tipos';
import { claves, invalidarCitas } from './claves';

/** Recepción y enfermería ven llegadas y cambios del equipo sin recargar (§6). */
export const REFRESCO_AGENDA_MS = 30_000;

export function useAgenda(
  fecha: string,
  opciones: { medicoId?: string; refrescar?: boolean } = {},
) {
  const { medicoId, refrescar = true } = opciones;
  return useQuery({
    queryKey: claves.citas({ fecha, medicoId }),
    queryFn: () => api.get<Agenda>('citas', { fecha, medicoId }),
    refetchInterval: refrescar ? REFRESCO_AGENDA_MS : false,
  });
}

export function useCita(id: string | undefined) {
  return useQuery({
    queryKey: claves.cita(id),
    queryFn: () => api.get<CitaDetalle>(`citas/${id}`),
    enabled: Boolean(id),
  });
}

export const consultaDisponibilidad = (medicoId: string, desde: string, hasta: string) => ({
  queryKey: claves.disponibilidad(medicoId, desde, hasta),
  queryFn: () => api.get<Disponibilidad>('disponibilidad', { medicoId, desde, hasta }),
});

export function useDisponibilidad(medicoId: string | undefined, desde: string, hasta = desde) {
  return useQuery({
    ...consultaDisponibilidad(medicoId ?? '', desde, hasta),
    enabled: Boolean(medicoId && desde),
  });
}

export function useMisCitas() {
  return useQuery({
    queryKey: claves.misCitas,
    queryFn: () => api.get<MisCitas>('pacientes/yo/citas'),
  });
}

export interface NuevaCita {
  pacienteId?: string;
  medicoId: string;
  inicio: string;
  motivo?: string;
  canalOrigen?: CanalOrigen;
}

export function useCrearCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: NuevaCita) => api.post<CitaCreada>('citas', datos),
    onSettled: () => invalidarCitas(qc),
  });
}

export function useReprogramarCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, inicio }: { id: string; inicio: string }) =>
      api.patch<CitaCreada>(`citas/${id}/reprogramar`, { inicio }),
    onSettled: () => invalidarCitas(qc),
  });
}

export type AccionSimple = 'confirmar' | 'llegada' | 'no-asistio' | 'iniciar';

/** Transiciones sin cuerpo de la máquina de estados (BACKEND.md §6). */
export function useTransicionCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accion }: { id: string; accion: AccionSimple }) =>
      api.post<Cita>(`citas/${id}/${accion}`),
    onSuccess: (cita) =>
      qc.setQueryData(claves.cita(cita.id), (previa: object | undefined) =>
        previa ? { ...previa, ...cita } : previa,
      ),
    onSettled: () => invalidarCitas(qc),
  });
}

export function useCancelarCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      api.post<Cita>(`citas/${id}/cancelar`, { motivo }),
    onSettled: () => invalidarCitas(qc),
  });
}

// ─── Enlace público del recordatorio ────────────────────────────────────────

export function useConfirmacion(token: string) {
  return useQuery({
    queryKey: claves.confirmacion(token),
    queryFn: () => api.get<ConfirmacionPublica>(`confirmaciones/${encodeURIComponent(token)}`),
    retry: false,
  });
}

export function useAccionConfirmacion(token: string) {
  return useMutation({
    mutationFn: (accion: 'confirmar' | 'cancelar') =>
      api.post<ResultadoConfirmacion>(`confirmaciones/${encodeURIComponent(token)}`, { accion }),
  });
}
