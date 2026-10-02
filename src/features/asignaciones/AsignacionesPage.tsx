import { useState } from 'react';
import { mensajeDeError } from '@/api/errores';
import { useAsignaciones, useAsignarTurno, useMedicos, usePersonal } from '@/api/queries/clinica';
import { useUsuario } from '@/auth/sesion';
import { Input, Label, SelectNativo } from '@/components/ui/campo';
import { EncabezadoPagina } from '@/components/ui/card';
import { ErrorEstado, Esqueleto, Vacio } from '@/components/ui/estados';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { aviso } from '@/components/ui/toast';
import { etiquetaDia, hoyEn } from '@/lib/fechas';
import type { Turno } from '@/shared/enums';

const TURNOS: Record<Turno, string> = {
  MANANA: 'Mañana (antes de 13:00)',
  TARDE: 'Tarde (desde 13:00)',
};

/** Asignación enfermera–médico por fecha y turno (RF-15). */
export default function AsignacionesPage() {
  const { zona } = useUsuario();
  const [fecha, setFecha] = useState(() => hoyEn(zona));
  const [turno, setTurno] = useState<Turno>('MANANA');
  const medicos = useMedicos();
  const enfermeras = usePersonal('ENFERMERA');
  const asignaciones = useAsignaciones(fecha);
  const asignar = useAsignarTurno();

  const actual = (medicoId: string) =>
    asignaciones.data?.find((a) => a.turno === turno && a.medico.id === medicoId)?.enfermera.id ??
    '';
  const activas = (enfermeras.data ?? []).filter((e) => e.activo);
  const error = medicos.error ?? enfermeras.error ?? asignaciones.error;

  return (
    <>
      <EncabezadoPagina
        titulo="Asignaciones"
        descripcion="Qué enfermera acompaña a cada médico en cada turno."
      />
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fecha-asignacion">Fecha</Label>
          <Input
            id="fecha-asignacion"
            type="date"
            value={fecha}
            onChange={(e) => e.target.value && setFecha(e.target.value)}
            className="w-auto"
          />
        </div>
        <Tabs value={turno} onValueChange={(v) => setTurno(v as Turno)}>
          <TabsList aria-label="Turno">
            <TabsTrigger value="MANANA">Mañana</TabsTrigger>
            <TabsTrigger value="TARDE">Tarde</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <p className="mb-3 text-sm text-muted first-letter:uppercase">
        {etiquetaDia(fecha)} · {TURNOS[turno]}
      </p>

      {error ? (
        <ErrorEstado
          error={error}
          reintentar={() => {
            void medicos.refetch();
            void enfermeras.refetch();
            void asignaciones.refetch();
          }}
        />
      ) : !medicos.data || !enfermeras.data || !asignaciones.data ? (
        <Esqueleto className="h-48" />
      ) : medicos.data.length === 0 ? (
        <Vacio titulo="No hay médicos activos" />
      ) : (
        <Table
          aria-label={`Asignaciones del turno ${turno === 'MANANA' ? 'de la mañana' : 'de la tarde'}`}
        >
          <TableHeader>
            <TableRow>
              <TableHead>Médico</TableHead>
              <TableHead>Enfermera</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medicos.data.map((m) => {
              const id = `enf-${m.id}`;
              const valor = actual(m.id);
              const guardando = asignar.isPending && asignar.variables?.medicoId === m.id;
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <label htmlFor={id} className="font-semibold">
                      {m.nombre}
                    </label>
                    <span className="block text-xs text-muted">
                      {m.especialidad?.nombre ?? 'Sin especialidad'}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-56">
                    <SelectNativo
                      id={id}
                      value={valor}
                      disabled={guardando}
                      aria-busy={guardando || undefined}
                      onChange={(e) =>
                        e.target.value &&
                        asignar.mutate(
                          { fecha, turno, medicoId: m.id, enfermeraId: e.target.value },
                          {
                            onSuccess: () => aviso.exito('Asignación guardada', m.nombre),
                            onError: (err) =>
                              aviso.error('No se pudo asignar', mensajeDeError(err)),
                          },
                        )
                      }
                    >
                      <option value="" disabled>
                        Sin asignar
                      </option>
                      {activas.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                        </option>
                      ))}
                    </SelectNativo>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
