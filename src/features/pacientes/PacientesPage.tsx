import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Search, UserPlus } from 'lucide-react';
import { useDeferredValue, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePacientes } from '@/api/queries/pacientes';
import type { PacienteResumen } from '@/api/tipos';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/campo';
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
import { textoEdad } from '@/lib/edad';

const col = createColumnHelper<PacienteResumen>();

const columnas = [
  col.display({
    id: 'nombre',
    header: 'Paciente',
    cell: ({ row: { original: p } }) => (
      <Link to={`/pacientes/${p.id}`} className="font-semibold text-accent hover:underline">
        {p.apellidos}, {p.nombres}
      </Link>
    ),
  }),
  col.accessor('documento', {
    header: 'Documento',
    cell: (c) => <span className="font-mono">{c.getValue()}</span>,
  }),
  col.accessor('fechaNacimiento', { header: 'Edad', cell: (c) => textoEdad(c.getValue()) }),
  col.accessor('telefono', {
    header: 'Teléfono',
    cell: (c) => <span className="font-mono">{c.getValue() ?? '—'}</span>,
  }),
];

export default function PacientesPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Number(params.get('pagina') ?? '1') || 1;
  const qDiferida = useDeferredValue(q);
  const pacientes = usePacientes(qDiferida.trim(), page);

  const items = useMemo(() => pacientes.data?.items ?? [], [pacientes.data]);
  const tabla = useReactTable({
    data: items,
    columns: columnas,
    getCoreRowModel: getCoreRowModel(),
  });
  const total = pacientes.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / (pacientes.data?.pageSize ?? 20)));

  const actualizar = (cambios: Record<string, string>) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        Object.entries(cambios).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
        return n;
      },
      { replace: true },
    );

  return (
    <>
      <EncabezadoPagina
        titulo="Pacientes"
        descripcion="Busca por nombre, apellido o documento."
        acciones={
          <Button asChild>
            <Link to="/pacientes/nuevo">
              <UserPlus aria-hidden /> Registrar paciente
            </Link>
          </Button>
        }
      />
      <div className="relative mb-4 max-w-md">
        <Label htmlFor="buscar-paciente" className="sr-only">
          Buscar paciente
        </Label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          id="buscar-paciente"
          type="search"
          value={q}
          onChange={(e) => actualizar({ q: e.target.value, pagina: '' })}
          placeholder="Ej.: Rojas o 1032456789"
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {pacientes.isError ? (
        <ErrorEstado error={pacientes.error} reintentar={() => pacientes.refetch()} />
      ) : pacientes.isPending ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Cargando pacientes">
          {[0, 1, 2, 3, 4].map((i) => (
            <Esqueleto key={i} className="h-12" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Vacio
          titulo={q ? `Ningún paciente coincide con “${q}”` : 'Todavía no hay pacientes'}
          descripcion={q ? 'Revisa la escritura o busca por documento.' : undefined}
          accion={
            <Button asChild variante="secundario">
              <Link to="/pacientes/nuevo">Registrar paciente</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Table aria-label="Pacientes" aria-busy={pacientes.isFetching || undefined}>
            <TableHeader>
              {tabla.getHeaderGroups().map((g) => (
                <TableRow key={g.id}>
                  {g.headers.map((h) => (
                    <TableHead key={h.id}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {tabla.getRowModel().rows.map((r) => (
                <TableRow key={r.id} className="hover:bg-surface-2">
                  {r.getVisibleCells().map((c) => (
                    <TableCell key={c.id}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <nav
            aria-label="Paginación"
            className="mt-3 flex items-center justify-between gap-2 text-sm"
          >
            <span className="text-muted">
              {total} {total === 1 ? 'paciente' : 'pacientes'} · página {page} de {paginas}
            </span>
            <div className="flex gap-2">
              <Button
                variante="secundario"
                tamano="icono"
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => actualizar({ pagina: String(page - 1) })}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <Button
                variante="secundario"
                tamano="icono"
                aria-label="Página siguiente"
                disabled={page >= paginas}
                onClick={() => actualizar({ pagina: String(page + 1) })}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
