import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EstadoTarea } from '@/shared/enums';
import type { SignosVitalesEntrada } from '@/shared/signos-vitales';
import { api } from '../client';
import type { Cola, SignosVitales, Tarea } from '../tipos';
import { claves, invalidarCitas } from './claves';
import { REFRESCO_AGENDA_MS } from './citas';

export function useCola(fecha: string) {
  return useQuery({
    queryKey: claves.cola(fecha),
    queryFn: () => api.get<Cola>('enfermeria/cola', { fecha }),
    refetchInterval: REFRESCO_AGENDA_MS,
  });
}

export function useTareas(estado?: EstadoTarea) {
  return useQuery({
    queryKey: claves.tareas(estado),
    queryFn: () => api.get<Tarea[]>('enfermeria/tareas', { estado }),
    refetchInterval: REFRESCO_AGENDA_MS,
  });
}

export function useRegistrarSignos(citaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: SignosVitalesEntrada) =>
      api.post<SignosVitales & { pacienteId: string }>(`citas/${citaId}/signos-vitales`, datos),
    onSuccess: (r) => qc.invalidateQueries({ queryKey: claves.historial(r.pacienteId) }),
    onSettled: () => invalidarCitas(qc),
  });
}

export function useCompletarTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ id: string; estado: 'HECHA'; pacienteId: string }>(`tareas/${id}/completar`),
    onSuccess: (r) => qc.invalidateQueries({ queryKey: claves.historial(r.pacienteId) }),
    onSettled: () => qc.invalidateQueries({ queryKey: claves.tareas() }),
  });
}
