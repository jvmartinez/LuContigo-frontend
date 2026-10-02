import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GuardarConsultaEntrada } from '@/shared/consulta';
import { api } from '../client';
import { ErrorApi } from '../errores';
import type { Consulta, TareaCreada } from '../tipos';
import { claves, invalidarCitas } from './claves';

/** Nota de la cita; `null` si todavía no hay borrador (la API responde 404). */
export function useNotaConsulta(citaId: string | undefined, opciones: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: claves.consulta(citaId ?? ''),
    queryFn: async () => {
      try {
        return await api.get<Consulta>(`citas/${citaId}/consulta`);
      } catch (e) {
        if (e instanceof ErrorApi && e.codigo === 'NO_ENCONTRADO') return null;
        throw e;
      }
    },
    enabled: Boolean(citaId) && (opciones.enabled ?? true),
    // El borrador lo edita solo este médico: no se refresca solo para no pisar lo que escribe.
    staleTime: Infinity,
  });
}

export function useGuardarBorrador(citaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nota: GuardarConsultaEntrada) =>
      api.put<Consulta>(`citas/${citaId}/consulta`, nota),
    onSuccess: (c) => qc.setQueryData(claves.consulta(citaId), c),
  });
}

export function useCerrarConsulta(citaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nota: GuardarConsultaEntrada) =>
      api.post<Consulta>(`citas/${citaId}/consulta/cerrar`, nota),
    onSuccess: (c) => {
      qc.setQueryData(claves.consulta(citaId), c);
      return qc.invalidateQueries({ queryKey: claves.historial(c.pacienteId) });
    },
    onSettled: () => invalidarCitas(qc),
  });
}

export function useDelegarTarea(citaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: { tipo: string; detalle?: string; enfermeraId?: string }) =>
      api.post<TareaCreada>(`citas/${citaId}/tareas`, datos),
    onSuccess: (t) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: claves.historial(t.pacienteId) }),
        qc.invalidateQueries({ queryKey: claves.tareas() }),
      ]),
  });
}
