import { formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, ClipboardList, HeartPulse, UserCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { mensajeDeError } from '@/api/errores';
import { useAsignaciones } from '@/api/queries/clinica';
import { useCola, useCompletarTarea, useTareas } from '@/api/queries/enfermeria';
import type { CitaEnCola, Tarea } from '@/api/tipos';
import { useUsuario } from '@/auth/sesion';
import { AlertaAlergia } from '@/components/AlertaAlergia';
import { Button } from '@/components/ui/button';
import { Badge, CardContent, CardHeader, CardTitle, EncabezadoPagina } from '@/components/ui/card';
import { ErrorEstado, Esqueleto, Vacio } from '@/components/ui/estados';
import { aviso } from '@/components/ui/toast';
import { etiquetaDia, horaEn, hoyEn } from '@/lib/fechas';
import { etiquetaAlerta } from '@/lib/signos';

function Bloque({
  titulo,
  cantidad,
  icono,
  children,
}: {
  titulo: string;
  cantidad?: number;
  icono: ReactNode;
  children: ReactNode;
}) {
  const id = `bloque-${titulo.replace(/\s/g, '-').toLowerCase()}`;
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col rounded-xl border border-line bg-surface shadow-sm"
    >
      <CardHeader>
        <CardTitle id={id} className="flex items-center gap-2">
          {icono}
          {titulo}
        </CardTitle>
        {cantidad !== undefined && <Badge tono={cantidad ? 'accent' : 'neutro'}>{cantidad}</Badge>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">{children}</CardContent>
    </section>
  );
}

function Paciente({ cita, zona, accion }: { cita: CitaEnCola; zona: string; accion?: ReactNode }) {
  const espera = cita.llegadaEn
    ? formatDistanceToNowStrict(new Date(cita.llegadaEn), { locale: es })
    : null;
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3">
      <AlertaAlergia alergias={cita.paciente.alergias} compacta />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">
            {cita.paciente.apellidos}, {cita.paciente.nombres}
            <span className="font-normal text-muted"> · {cita.paciente.edad} años</span>
          </p>
          <p className="text-sm text-muted">
            <span className="font-mono">{horaEn(cita.inicio, zona)}</span> · {cita.medico.nombre} ·{' '}
            {cita.consultorio.nombre}
          </p>
          {espera && <p className="text-xs text-muted">Llegó hace {espera}</p>}
        </div>
        {accion}
      </div>
      {cita.alertas.length > 0 && (
        <p className="flex flex-wrap gap-1.5">
          {cita.alertas.map((a) => (
            <Badge key={a} tono="crit">
              {etiquetaAlerta(a)}
            </Badge>
          ))}
        </p>
      )}
    </li>
  );
}

function Tareas({ zona }: { zona: string }) {
  const tareas = useTareas('PENDIENTE');
  const completar = useCompletarTarea();

  if (tareas.isPending) return <Esqueleto className="h-24" />;
  if (tareas.isError)
    return <ErrorEstado error={tareas.error} reintentar={() => tareas.refetch()} />;
  if (tareas.data.length === 0) {
    return (
      <Vacio
        titulo="Sin tareas pendientes"
        descripcion="Las tareas que te deleguen los médicos aparecerán aquí."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {tareas.data.map((t: Tarea) => (
        <li
          key={t.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 p-3"
        >
          <div className="min-w-0">
            <p className="font-semibold">{t.tipo}</p>
            {t.detalle && <p className="text-sm">{t.detalle}</p>}
            <p className="text-xs text-muted">
              {t.paciente.apellidos}, {t.paciente.nombres} · {t.medico.nombre} ·{' '}
              <span className="font-mono">{horaEn(t.creadaEn, zona)}</span>
            </p>
          </div>
          <Button
            variante="secundario"
            cargando={completar.isPending && completar.variables === t.id}
            disabled={completar.isPending}
            onClick={() =>
              completar.mutate(t.id, {
                onSuccess: () => aviso.exito('Tarea completada', t.tipo),
                onError: (e) => aviso.error('No se pudo completar la tarea', mensajeDeError(e)),
              })
            }
          >
            <Check aria-hidden /> Hecha
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** Enfermería (RF-09 a RF-11): sala de espera, listos para el médico y tareas delegadas. */
export default function EnfermeriaPage() {
  const { zona } = useUsuario();
  const hoy = hoyEn(zona);
  const cola = useCola(hoy);
  const asignaciones = useAsignaciones(hoy);

  const citas = cola.data?.citas ?? [];
  const enEspera = citas.filter((c) => c.estado === 'EN_ESPERA');
  const listos = citas.filter((c) => c.estado === 'LISTA');

  const consultorioDe = (medicoId: string) =>
    citas.find((c) => c.medico.id === medicoId)?.consultorio.nombre;
  const medicosAsignados = [
    ...new Map((asignaciones.data ?? []).map((a) => [a.medico.id, a.medico])).values(),
  ];

  return (
    <>
      <EncabezadoPagina
        titulo="Enfermería"
        descripcion={
          asignaciones.isPending ? (
            'Cargando asignación…'
          ) : medicosAsignados.length === 0 ? (
            'No tienes médicos asignados hoy. Consulta con administración.'
          ) : (
            <>
              <span className="font-semibold text-ink">Asignada hoy a: </span>
              {medicosAsignados
                .map((m) => {
                  const c = consultorioDe(m.id);
                  return c ? `${m.nombre} (${c})` : m.nombre;
                })
                .join(', ')}
            </>
          )
        }
      />
      <p className="-mt-3 mb-4 text-sm text-muted first-letter:uppercase">
        {etiquetaDia(hoy)} · se actualiza cada 30 s
      </p>

      {cola.isError ? (
        <ErrorEstado
          error={cola.error}
          titulo="No pudimos cargar la sala de espera"
          reintentar={() => cola.refetch()}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <Bloque
            titulo="Sala de espera"
            cantidad={cola.isPending ? undefined : enEspera.length}
            icono={<HeartPulse className="size-5 text-warn" aria-hidden />}
          >
            {cola.isPending ? (
              <Esqueleto className="h-24" />
            ) : enEspera.length === 0 ? (
              <Vacio
                titulo="Nadie en espera"
                descripcion="Cuando recepción registre una llegada, aparecerá aquí."
              />
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Pacientes en espera">
                {enEspera.map((c) => (
                  <Paciente
                    key={c.id}
                    cita={c}
                    zona={zona}
                    accion={
                      <Button asChild>
                        <Link
                          to={`/enfermeria/triaje/${c.id}`}
                          aria-label={`Tomar signos a ${c.paciente.nombres} ${c.paciente.apellidos}`}
                        >
                          Tomar signos
                        </Link>
                      </Button>
                    }
                  />
                ))}
              </ul>
            )}
          </Bloque>

          <Bloque
            titulo="Listos para el médico"
            cantidad={cola.isPending ? undefined : listos.length}
            icono={<UserCheck className="size-5 text-accent" aria-hidden />}
          >
            {cola.isPending ? (
              <Esqueleto className="h-24" />
            ) : listos.length === 0 ? (
              <Vacio
                titulo="Nadie listo todavía"
                descripcion="Los pacientes con signos registrados pasan aquí."
              />
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Pacientes listos para el médico">
                {listos.map((c) => (
                  <Paciente key={c.id} cita={c} zona={zona} />
                ))}
              </ul>
            )}
          </Bloque>

          <Bloque
            titulo="Tareas delegadas"
            icono={<ClipboardList className="size-5 text-info" aria-hidden />}
          >
            <Tareas zona={zona} />
          </Bloque>
        </div>
      )}
    </>
  );
}
