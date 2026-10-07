import { useQueries } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { consultaHorarios, usePersonal } from '@/api/queries/clinica';
import type { MiembroPersonal } from '@/api/tipos';
import { NOMBRE_ROL } from '@/auth/rutas';
import { Button } from '@/components/ui/button';
import { Label, SelectNativo } from '@/components/ui/campo';
import { Badge, EncabezadoPagina } from '@/components/ui/card';
import { ErrorEstado, Esqueleto, Vacio } from '@/components/ui/estados';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Rol } from '@/shared/enums';
import { resumirHorario } from './horario';
import { NuevoPersonalDialog } from './NuevoPersonalDialog';

type Fila = MiembroPersonal & {
  horario: string | null;
  horarioPendiente: boolean;
  errorHorario: boolean;
  horarioReintentando: boolean;
  reintentarHorario: () => void;
};
const col = createColumnHelper<Fila>();

const columnas = [
  col.accessor('nombre', {
    header: 'Nombre',
    cell: ({ row: { original: p } }) => (
      <Link to={`/admin/personal/${p.id}`} className="font-semibold text-accent hover:underline">
        {p.nombre}
        <span className="block text-xs font-normal text-muted">{p.email}</span>
      </Link>
    ),
  }),
  col.accessor((p) => NOMBRE_ROL[p.rol], { id: 'rol', header: 'Rol' }),
  col.accessor((p) => p.especialidad?.nombre ?? '—', {
    id: 'especialidad',
    header: 'Especialidad',
  }),
  col.accessor('licencia', {
    header: 'Licencia',
    cell: (c) => <span className="font-mono">{c.getValue() ?? '—'}</span>,
  }),
  col.accessor('horario', {
    header: 'Horario',
    enableSorting: false,
    cell: ({ row: { original: p } }) =>
      p.errorHorario ? (
        <div role="alert" className="flex flex-col items-start gap-1 text-xs">
          <span>No se pudo cargar el horario de {p.nombre}.</span>
          <Button
            type="button"
            variante="enlace"
            className="min-h-8 px-0 text-xs"
            aria-label={
              p.horarioReintentando
                ? `Reintentando horario de ${p.nombre}`
                : `Reintentar horario de ${p.nombre}`
            }
            cargando={p.horarioReintentando}
            onClick={p.reintentarHorario}
          >
            {p.horarioReintentando ? 'Reintentando…' : 'Reintentar'}
          </Button>
        </div>
      ) : p.horarioPendiente ? (
        <span role="status" className="text-xs">
          Cargando horario…
        </span>
      ) : (
        <span className="text-xs">{p.horario ?? 'Sin horario'}</span>
      ),
  }),
  col.accessor('activo', {
    header: 'Estado',
    cell: (c) => (c.getValue() ? <Badge tono="good">Activo</Badge> : <Badge>Inactivo</Badge>),
  }),
];

/** Personal de la clínica con rol, especialidad, licencia, horario y estado (RF-13). */
export default function PersonalPage() {
  const [rol, setRol] = useState<Exclude<Rol, 'PACIENTE'> | ''>('');
  const [creando, setCreando] = useState(false);
  const [orden, setOrden] = useState<SortingState>([]);
  const personal = usePersonal(rol || undefined);
  const lista = useMemo(() => personal.data ?? [], [personal.data]);

  const horarios = useQueries({ queries: lista.map((p) => consultaHorarios(p.id)) });
  const estadoHorarios = JSON.stringify(
    horarios.map((h) => [h.dataUpdatedAt, h.status, h.fetchStatus]),
  );
  const filas = useMemo<Fila[]>(
    () =>
      lista.map((p, i) => {
        const horario = horarios[i];
        return {
          ...p,
          horario: horario?.data ? resumirHorario(horario.data.bloques) : null,
          horarioPendiente: horario?.isPending ?? true,
          errorHorario: horario?.isError ?? false,
          horarioReintentando: horario?.isFetching ?? false,
          reintentarHorario: () => void horario?.refetch(),
        };
      }),
    // Sustituye la referencia inestable de useQueries por estados que actualizan cada fila.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lista, estadoHorarios],
  );

  const tabla = useReactTable({
    data: filas,
    columns: columnas,
    state: { sorting: orden },
    onSortingChange: setOrden,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <EncabezadoPagina
        titulo="Personal"
        descripcion="Horarios y ausencias se editan en la ficha de cada persona."
        acciones={
          <Button onClick={() => setCreando(true)}>
            <UserPlus aria-hidden /> Agregar personal
          </Button>
        }
      />
      <div className="mb-4 flex max-w-xs flex-col gap-1.5">
        <Label htmlFor="filtro-rol">Rol</Label>
        <SelectNativo
          id="filtro-rol"
          value={rol}
          onChange={(e) => setRol(e.target.value as typeof rol)}
        >
          <option value="">Todos</option>
          {(['MEDICO', 'ENFERMERA', 'RECEPCION', 'ADMIN'] as const).map((r) => (
            <option key={r} value={r}>
              {NOMBRE_ROL[r]}
            </option>
          ))}
        </SelectNativo>
      </div>

      {personal.isError ? (
        <ErrorEstado error={personal.error} reintentar={() => personal.refetch()} />
      ) : personal.isPending ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Cargando personal">
          {[0, 1, 2, 3].map((i) => (
            <Esqueleto key={i} className="h-14" />
          ))}
        </div>
      ) : filas.length === 0 ? (
        <Vacio titulo="No hay personal con ese rol" />
      ) : (
        <Table aria-label="Personal">
          <TableHeader>
            {tabla.getHeaderGroups().map((g) => (
              <TableRow key={g.id}>
                {g.headers.map((h) => {
                  const orden = h.column.getIsSorted();
                  return (
                    <TableHead
                      key={h.id}
                      aria-sort={
                        orden === 'asc' ? 'ascending' : orden === 'desc' ? 'descending' : undefined
                      }
                    >
                      {h.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="inline-flex min-h-9 items-center gap-1 uppercase hover:text-ink"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <ArrowUpDown className="size-3" aria-hidden />
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {tabla.getRowModel().rows.map((r) => (
              <TableRow
                key={r.id}
                className={
                  r.original.activo ? 'hover:bg-surface-2' : 'text-muted hover:bg-surface-2'
                }
              >
                {r.getVisibleCells().map((c) => (
                  <TableCell key={c.id}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <NuevoPersonalDialog abierto={creando} alCambiar={setCreando} />
    </>
  );
}
