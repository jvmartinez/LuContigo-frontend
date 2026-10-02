import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { REFRESCO_AGENDA_MS, consultaDisponibilidad, useAgenda } from '@/api/queries/citas';
import { consultaAusencias, consultaHorarios, useMedicos } from '@/api/queries/clinica';
import { construirAgenda } from './modelo';

/**
 * Reúne lo que necesita la cuadrícula del día: médicos, citas, plantilla semanal, huecos libres
 * y ausencias. Citas y huecos se refrescan cada 30 s para ver los cambios del equipo.
 */
export function useAgendaDia(fecha: string, zona: string) {
  const medicos = useMedicos();
  const agenda = useAgenda(fecha);
  const lista = useMemo(() => medicos.data ?? [], [medicos.data]);

  const horarios = useQueries({
    queries: lista.map((m) => consultaHorarios(m.id)),
  });
  const disponibilidad = useQueries({
    queries: lista.map((m) => ({
      ...consultaDisponibilidad(m.id, fecha, fecha),
      refetchInterval: REFRESCO_AGENDA_MS,
    })),
  });
  const ausencias = useQueries({
    queries: lista.map((m) => ({ ...consultaAusencias(m.id), staleTime: 60_000 })),
  });

  const secundarias = [...horarios, ...disponibilidad, ...ausencias];
  const cargando =
    medicos.isPending ||
    agenda.isPending ||
    secundarias.some((q) => q.isPending && q.fetchStatus !== 'idle');
  const error = medicos.error ?? agenda.error ?? secundarias.find((q) => q.error)?.error ?? null;

  const porMedico = <T>(resultados: { data?: T }[]) =>
    Object.fromEntries(lista.map((m, i) => [m.id, resultados[i]?.data]));

  const horariosData = porMedico(horarios.map((h) => ({ data: h.data?.bloques })));
  const disponibilidadData = porMedico(disponibilidad);
  const ausenciasData = porMedico(ausencias);
  const firma = JSON.stringify([
    fecha,
    agenda.dataUpdatedAt,
    horarios.map((q) => q.dataUpdatedAt),
    disponibilidad.map((q) => q.dataUpdatedAt),
    ausencias.map((q) => q.dataUpdatedAt),
  ]);

  const modelo = useMemo(
    () =>
      medicos.data && agenda.data
        ? construirAgenda({
            fecha,
            zona,
            medicos: medicos.data,
            citas: agenda.data.citas,
            horarios: horariosData,
            disponibilidad: disponibilidadData,
            ausencias: ausenciasData,
          })
        : null,
    // `firma` resume cuándo cambió cada consulta; los objetos se recrean en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firma, zona, medicos.data, agenda.data],
  );

  const reintentar = () => {
    void medicos.refetch();
    void agenda.refetch();
    secundarias.filter((q) => q.error).forEach((q) => void q.refetch());
  };

  return {
    modelo,
    citas: agenda.data?.citas ?? [],
    cargando,
    error,
    reintentar,
    actualizando: agenda.isFetching,
  };
}
