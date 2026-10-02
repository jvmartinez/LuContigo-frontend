import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ActualizarPacienteEntrada, CrearPacienteEntrada } from '@/shared/pacientes';
import { api } from '../client';
import type { Historial, Indicacion, Pagina, Paciente, PacienteResumen } from '../tipos';
import { claves } from './claves';

export function usePacientes(q: string, page = 1, opciones: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: claves.pacientes({ q, page }),
    queryFn: () => api.get<Pagina<PacienteResumen>>('pacientes', { q, page, pageSize: 20 }),
    placeholderData: keepPreviousData,
    enabled: opciones.enabled ?? true,
  });
}

export function usePaciente(id: string | undefined) {
  return useQuery({
    queryKey: claves.paciente(id ?? ''),
    queryFn: () => api.get<Paciente>(`pacientes/${id}`),
    enabled: Boolean(id),
  });
}

export function useHistorial(id: string | undefined) {
  return useQuery({
    queryKey: claves.historial(id ?? ''),
    queryFn: () => api.get<Historial>(`pacientes/${id}/historial`),
    enabled: Boolean(id),
  });
}

export function useCrearPaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: CrearPacienteEntrada) => api.post<Paciente>('pacientes', datos),
    onSuccess: (p) => {
      qc.setQueryData(claves.paciente(p.id), p);
      return qc.invalidateQueries({ queryKey: claves.pacientes() });
    },
  });
}

export function useActualizarPaciente(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: ActualizarPacienteEntrada) => api.patch<Paciente>(`pacientes/${id}`, datos),
    onSuccess: (p) => {
      qc.setQueryData(claves.paciente(id), p);
      return Promise.all([
        qc.invalidateQueries({ queryKey: claves.pacientes() }),
        qc.invalidateQueries({ queryKey: claves.citas() }),
      ]);
    },
  });
}

export function useMisIndicaciones() {
  return useQuery({
    queryKey: claves.indicaciones,
    queryFn: () => api.get<Indicacion[]>('pacientes/yo/indicaciones'),
  });
}
