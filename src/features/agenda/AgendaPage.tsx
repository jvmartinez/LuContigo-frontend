import { CalendarPlus, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Link, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import type { Cita } from '@/api/tipos';
import { useUsuario } from '@/auth/sesion';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/campo';
import { Card, EncabezadoPagina } from '@/components/ui/card';
import { ErrorEstado, Esqueleto, Vacio } from '@/components/ui/estados';
import { etiquetaDia, hoyEn, sumarDias } from '@/lib/fechas';
import { CitaDetallePanel } from './CitaDetallePanel';
import { CuadriculaAgenda } from './CuadriculaAgenda';
import { useAgendaDia } from './useAgendaDia';

function Resumen({ citas }: { citas: Cita[] }) {
  const cuenta = (...estados: Cita['estado'][]) =>
    citas.filter((c) => estados.includes(c.estado)).length;
  const datos = [
    {
      texto: 'Activas',
      valor: cuenta('PROGRAMADA', 'CONFIRMADA', 'EN_ESPERA', 'LISTA', 'EN_CONSULTA', 'ATENDIDA'),
    },
    { texto: 'Por confirmar', valor: cuenta('PROGRAMADA') },
    { texto: 'En sala', valor: cuenta('EN_ESPERA', 'LISTA') },
    { texto: 'Atendidas', valor: cuenta('ATENDIDA') },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {datos.map((d) => (
        <Card key={d.texto} className="px-4 py-3">
          <dt className="text-xs font-medium text-muted">{d.texto}</dt>
          <dd className="font-mono text-2xl font-medium">{d.valor}</dd>
        </Card>
      ))}
    </dl>
  );
}

/** Agenda del día de recepción (RF-01 a RF-05). */
export default function AgendaPage() {
  const { zona } = useUsuario();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const hoy = hoyEn(zona);
  const fecha = params.get('fecha') ?? hoy;
  const citaId = params.get('cita');
  const { modelo, citas, cargando, error, reintentar, actualizando } = useAgendaDia(fecha, zona);

  const actualizarParams = (cambios: Record<string, string | null>) =>
    setParams((p) => {
      const nuevos = new URLSearchParams(p);
      Object.entries(cambios).forEach(([k, v]) =>
        v === null ? nuevos.delete(k) : nuevos.set(k, v),
      );
      return nuevos;
    });

  const cambiarFecha = (f: string) => actualizarParams({ fecha: f === hoy ? null : f, cita: null });

  return (
    <>
      <EncabezadoPagina
        titulo="Agenda"
        descripcion={
          <span className="first-letter:uppercase">
            {etiquetaDia(fecha)}
            {fecha === hoy && ' · hoy'}
          </span>
        }
        acciones={
          <Button asChild>
            <Link to={`nueva?fecha=${fecha}`}>
              <CalendarPlus aria-hidden /> Nueva cita
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Button
          variante="secundario"
          tamano="icono"
          aria-label="Día anterior"
          onClick={() => cambiarFecha(sumarDias(fecha, -1))}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <div className="flex flex-col gap-1">
          <Label htmlFor="fecha-agenda" className="sr-only">
            Fecha de la agenda
          </Label>
          <Input
            id="fecha-agenda"
            type="date"
            value={fecha}
            onChange={(e) => e.target.value && cambiarFecha(e.target.value)}
            className="w-auto"
          />
        </div>
        <Button
          variante="secundario"
          tamano="icono"
          aria-label="Día siguiente"
          onClick={() => cambiarFecha(sumarDias(fecha, 1))}
        >
          <ChevronRight aria-hidden />
        </Button>
        {fecha !== hoy && (
          <Button variante="fantasma" onClick={() => cambiarFecha(hoy)}>
            Hoy
          </Button>
        )}
        <p className="ml-auto flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
          <RefreshCw className={actualizando ? 'size-3.5 animate-spin' : 'size-3.5'} aria-hidden />
          {actualizando ? 'Actualizando…' : 'Se actualiza cada 30 s'}
        </p>
      </div>

      {error ? (
        <ErrorEstado error={error} titulo="No pudimos cargar la agenda" reintentar={reintentar} />
      ) : cargando || !modelo ? (
        <div className="flex flex-col gap-4" role="status" aria-label="Cargando agenda">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Esqueleto key={i} className="h-16" />
            ))}
          </div>
          <Esqueleto className="h-[480px]" />
        </div>
      ) : modelo.columnas.length === 0 ? (
        <Vacio
          titulo="No hay médicos activos"
          descripcion="Cuando administración registre médicos y sus horarios, aparecerán aquí."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Resumen citas={citas} />
          <CuadriculaAgenda
            modelo={modelo}
            fecha={fecha}
            zona={zona}
            alAbrirCita={(id) => actualizarParams({ cita: id })}
            alAgendar={(medicoId, hora) =>
              navigate(`nueva?${new URLSearchParams({ medicoId, fecha, hora }).toString()}`)
            }
          />
        </div>
      )}

      <CitaDetallePanel
        citaId={citaId}
        zona={zona}
        alCerrar={() => actualizarParams({ cita: null })}
      />
      <Outlet />
    </>
  );
}
