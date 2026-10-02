import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { mensajeDeError } from '@/api/errores';
import {
  useConsultorios,
  useEspecialidades,
  useGuardarConsultorio,
  useGuardarEspecialidad,
} from '@/api/queries/clinica';
import type { Consultorio, Especialidad } from '@/api/tipos';
import { Button } from '@/components/ui/button';
import { Campo, Input, SelectNativo } from '@/components/ui/campo';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EncabezadoPagina,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alerta, ErrorEstado, Esqueleto, Vacio } from '@/components/ui/estados';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { aviso } from '@/components/ui/toast';
import { resolverZod } from '@/lib/formulario';
import { CrearConsultorioEntrada, CrearEspecialidadEntrada } from '@/shared/clinica';

type Edicion<T> = { nuevo: true } | { nuevo: false; valor: T } | null;

const Esquema = CrearConsultorioEntrada.extend({ activo: z.boolean() });

function ConsultorioDialog({
  edicion,
  cerrar,
}: {
  edicion: Edicion<Consultorio>;
  cerrar: () => void;
}) {
  const guardar = useGuardarConsultorio();
  const especialidades = useEspecialidades();
  const actual = edicion && !edicion.nuevo ? edicion.valor : null;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    { nombre: string; especialidadId: string; activo: boolean },
    unknown,
    z.output<typeof Esquema>
  >({
    resolver: resolverZod(Esquema, (v) => ({
      nombre: v.nombre,
      activo: v.activo,
      ...(v.especialidadId && { especialidadId: v.especialidadId }),
    })),
    defaultValues: {
      nombre: actual?.nombre ?? '',
      especialidadId: actual?.especialidadId ?? '',
      activo: actual?.activo ?? true,
    },
  });

  return (
    <Dialog open={Boolean(edicion)} onOpenChange={(a) => !a && cerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actual ? `Editar ${actual.nombre}` : 'Nuevo consultorio'}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((d) =>
            guardar.mutate(
              actual
                ? {
                    id: actual.id,
                    nombre: d.nombre,
                    especialidadId: d.especialidadId ?? null,
                    activo: d.activo,
                  }
                : { nombre: d.nombre, especialidadId: d.especialidadId },
              {
                onSuccess: () => {
                  aviso.exito(actual ? 'Consultorio actualizado' : 'Consultorio creado');
                  cerrar();
                },
              },
            ),
          )}
        >
          <Campo etiqueta="Nombre" error={errors.nombre?.message}>
            <Input {...register('nombre')} />
          </Campo>
          <Campo etiqueta="Especialidad" opcional>
            <SelectNativo {...register('especialidadId')}>
              <option value="">Sin especialidad</option>
              {especialidades.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          {actual && (
            <label className="flex min-h-tap items-center gap-3">
              <input
                type="checkbox"
                className="size-5 accent-[var(--accent)]"
                {...register('activo')}
              />
              Consultorio activo (se pueden agendar citas)
            </label>
          )}
          {guardar.isError && <Alerta>{mensajeDeError(guardar.error)}</Alerta>}
          <DialogFooter>
            <Button type="button" variante="secundario" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardar.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EspecialidadDialog({
  edicion,
  cerrar,
}: {
  edicion: Edicion<Especialidad>;
  cerrar: () => void;
}) {
  const guardar = useGuardarEspecialidad();
  const actual = edicion && !edicion.nuevo ? edicion.valor : null;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    { nombre: string; duracionCitaMin: string },
    unknown,
    z.output<typeof CrearEspecialidadEntrada>
  >({
    resolver: resolverZod(CrearEspecialidadEntrada, (v) => ({
      nombre: v.nombre,
      duracionCitaMin: v.duracionCitaMin === '' ? undefined : Number(v.duracionCitaMin),
    })),
    defaultValues: {
      nombre: actual?.nombre ?? '',
      duracionCitaMin: String(actual?.duracionCitaMin ?? 30),
    },
  });

  return (
    <Dialog open={Boolean(edicion)} onOpenChange={(a) => !a && cerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actual ? `Editar ${actual.nombre}` : 'Nueva especialidad'}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((d) =>
            guardar.mutate(actual ? { id: actual.id, ...d } : d, {
              onSuccess: () => {
                aviso.exito(actual ? 'Especialidad actualizada' : 'Especialidad creada');
                cerrar();
              },
            }),
          )}
        >
          <Campo etiqueta="Nombre" error={errors.nombre?.message}>
            <Input {...register('nombre')} />
          </Campo>
          <Campo
            etiqueta="Duración de la cita (minutos)"
            error={errors.duracionCitaMin?.message}
            ayuda="Define el tamaño de las celdas de la agenda para sus médicos."
          >
            <Input
              type="number"
              inputMode="numeric"
              min={5}
              max={240}
              step={5}
              {...register('duracionCitaMin')}
            />
          </Campo>
          {guardar.isError && <Alerta>{mensajeDeError(guardar.error)}</Alerta>}
          <DialogFooter>
            <Button type="button" variante="secundario" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardar.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Consultorios y especialidades de la clínica (RF-17). */
export default function ConsultoriosPage() {
  const consultorios = useConsultorios();
  const especialidades = useEspecialidades();
  const [consultorio, setConsultorio] = useState<Edicion<Consultorio>>(null);
  const [especialidad, setEspecialidad] = useState<Edicion<Especialidad>>(null);

  return (
    <>
      <EncabezadoPagina titulo="Consultorios y especialidades" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consultorios</CardTitle>
            <Button
              variante="secundario"
              tamano="sm"
              onClick={() => setConsultorio({ nuevo: true })}
            >
              <Plus aria-hidden /> Nuevo
            </Button>
          </CardHeader>
          <CardContent>
            {consultorios.isPending ? (
              <Esqueleto className="h-32" />
            ) : consultorios.isError ? (
              <ErrorEstado error={consultorios.error} reintentar={() => consultorios.refetch()} />
            ) : consultorios.data.length === 0 ? (
              <Vacio titulo="Sin consultorios" />
            ) : (
              <Table aria-label="Consultorios">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Especialidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultorios.data.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold">{c.nombre}</TableCell>
                      <TableCell>{c.especialidad?.nombre ?? '—'}</TableCell>
                      <TableCell>
                        {c.activo ? <Badge tono="good">Activo</Badge> : <Badge>Inactivo</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variante="fantasma"
                          tamano="icono"
                          aria-label={`Editar ${c.nombre}`}
                          onClick={() => setConsultorio({ nuevo: false, valor: c })}
                        >
                          <Pencil aria-hidden />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Especialidades</CardTitle>
            <Button
              variante="secundario"
              tamano="sm"
              onClick={() => setEspecialidad({ nuevo: true })}
            >
              <Plus aria-hidden /> Nueva
            </Button>
          </CardHeader>
          <CardContent>
            {especialidades.isPending ? (
              <Esqueleto className="h-32" />
            ) : especialidades.isError ? (
              <ErrorEstado
                error={especialidades.error}
                reintentar={() => especialidades.refetch()}
              />
            ) : especialidades.data.length === 0 ? (
              <Vacio titulo="Sin especialidades" />
            ) : (
              <Table aria-label="Especialidades">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {especialidades.data.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-semibold">{e.nombre}</TableCell>
                      <TableCell className="font-mono">{e.duracionCitaMin} min</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variante="fantasma"
                          tamano="icono"
                          aria-label={`Editar ${e.nombre}`}
                          onClick={() => setEspecialidad({ nuevo: false, valor: e })}
                        >
                          <Pencil aria-hidden />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      {consultorio && (
        <ConsultorioDialog
          key={consultorio.nuevo ? 'nuevo' : consultorio.valor.id}
          edicion={consultorio}
          cerrar={() => setConsultorio(null)}
        />
      )}
      {especialidad && (
        <EspecialidadDialog
          key={especialidad.nuevo ? 'nueva' : especialidad.valor.id}
          edicion={especialidad}
          cerrar={() => setEspecialidad(null)}
        />
      )}
    </>
  );
}
