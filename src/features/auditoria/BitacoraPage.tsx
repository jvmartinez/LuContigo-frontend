import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuditoria } from '@/api/queries/clinica';
import { useUsuario } from '@/auth/sesion';
import { Button } from '@/components/ui/button';
import { Campo, Input } from '@/components/ui/campo';
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
import { fechaHoraCorta, instanteLocal, isoConZona } from '@/lib/fechas';

const ACCION: Record<string, { texto: string; tono: 'neutro' | 'info' | 'good' | 'warn' }> = {
  LEER: { texto: 'Lectura', tono: 'neutro' },
  CREAR: { texto: 'Creación', tono: 'good' },
  ACTUALIZAR: { texto: 'Modificación', tono: 'info' },
  CERRAR: { texto: 'Cierre', tono: 'warn' },
};

const ENTIDAD: Record<string, string> = {
  PACIENTE: 'Paciente',
  HISTORIAL: 'Historial',
  CONSULTA: 'Nota de consulta',
  SIGNOS_VITALES: 'Signos vitales',
  TAREA: 'Tarea',
};

const TAMANO = 50;

interface Filtros {
  documento: string;
  usuarioId: string;
  desde: string;
}

/** Bitácora de accesos al expediente (RF-20): quién vio o modificó cada historial. */
export default function BitacoraPage() {
  const { zona } = useUsuario();
  const [filtros, setFiltros] = useState<Filtros>({ documento: '', usuarioId: '', desde: '' });
  const [page, setPage] = useState(1);
  const bitacora = useAuditoria({
    documento: filtros.documento || undefined,
    usuarioId: filtros.usuarioId || undefined,
    desde: filtros.desde
      ? isoConZona(instanteLocal(filtros.desde, '00:00', zona), zona)
      : undefined,
    page,
    pageSize: TAMANO,
  });
  const { register, handleSubmit, reset } = useForm<Filtros>({ defaultValues: filtros });

  const total = bitacora.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO));

  return (
    <>
      <EncabezadoPagina
        titulo="Bitácora"
        descripcion="Accesos y cambios al expediente clínico. Solo lectura."
      />
      <form
        className="mb-4 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-[1fr_1fr_180px_auto]"
        onSubmit={handleSubmit((f) => {
          setFiltros({
            documento: f.documento.trim(),
            usuarioId: f.usuarioId.trim(),
            desde: f.desde,
          });
          setPage(1);
        })}
      >
        <Campo etiqueta="Documento del paciente" opcional>
          <Input className="font-mono" minLength={3} maxLength={30} {...register('documento')} />
        </Campo>
        <Campo etiqueta="ID de usuario" opcional>
          <Input className="font-mono" placeholder="usu_…" {...register('usuarioId')} />
        </Campo>
        <Campo etiqueta="Desde" opcional>
          <Input type="date" {...register('desde')} />
        </Campo>
        <div className="flex items-end gap-2">
          <Button type="submit">
            <Filter aria-hidden /> Filtrar
          </Button>
          <Button
            type="button"
            variante="fantasma"
            onClick={() => {
              reset({ documento: '', usuarioId: '', desde: '' });
              setFiltros({ documento: '', usuarioId: '', desde: '' });
              setPage(1);
            }}
          >
            Limpiar
          </Button>
        </div>
      </form>

      {bitacora.isError ? (
        <ErrorEstado error={bitacora.error} reintentar={() => bitacora.refetch()} />
      ) : bitacora.isPending ? (
        <Esqueleto className="h-64" />
      ) : bitacora.data.items.length === 0 ? (
        <Vacio titulo="Sin registros para estos filtros" />
      ) : (
        <>
          <Table aria-label="Registros de auditoría">
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead>Documento del paciente</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bitacora.data.items.map((r) => {
                const accion = ACCION[r.accion] ?? { texto: r.accion, tono: 'neutro' as const };
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {fechaHoraCorta(r.fecha, zona)}
                    </TableCell>
                    <TableCell>
                      <Badge tono={accion.tono}>{accion.texto}</Badge>
                    </TableCell>
                    <TableCell>
                      {ENTIDAD[r.entidad] ?? r.entidad}
                      {r.entidadId && (
                        <span className="block font-mono text-xs text-muted">{r.entidadId}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.documento ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.usuarioId ?? 'Enlace público'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.ip ?? '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <nav
            aria-label="Paginación"
            className="mt-3 flex items-center justify-between gap-2 text-sm"
          >
            <span className="text-muted">
              {total} registros · página {page} de {paginas}
            </span>
            <div className="flex gap-2">
              <Button
                variante="secundario"
                tamano="icono"
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <Button
                variante="secundario"
                tamano="icono"
                aria-label="Página siguiente"
                disabled={page >= paginas}
                onClick={() => setPage(page + 1)}
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
