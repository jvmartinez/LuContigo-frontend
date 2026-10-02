import { ArrowLeft, CalendarPlus, Globe } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useActualizarPaciente, usePaciente } from '@/api/queries/pacientes';
import { useUsuario } from '@/auth/sesion';
import { AlertaAlergia } from '@/components/AlertaAlergia';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardContent, EncabezadoPagina } from '@/components/ui/card';
import { Cargando, ErrorEstado } from '@/components/ui/estados';
import { aviso } from '@/components/ui/toast';
import { textoEdad } from '@/lib/edad';
import { fechaHoraCorta } from '@/lib/fechas';
import type { ActualizarPacienteEntrada } from '@/shared/pacientes';
import { PacienteFormulario, valoresDesdePaciente } from './PacienteFormulario';

export default function PacienteDetallePage() {
  const { id = '' } = useParams();
  const { zona } = useUsuario();
  const paciente = usePaciente(id);
  const actualizar = useActualizarPaciente(id);

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variante="enlace" className="mb-2">
        <Link to="/pacientes">
          <ArrowLeft aria-hidden /> Pacientes
        </Link>
      </Button>
      {paciente.isPending ? (
        <Cargando />
      ) : paciente.isError ? (
        <ErrorEstado error={paciente.error} reintentar={() => paciente.refetch()} />
      ) : (
        <>
          <EncabezadoPagina
            titulo={`${paciente.data.nombres} ${paciente.data.apellidos}`}
            descripcion={
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono">{paciente.data.documento}</span>·
                <span>{textoEdad(paciente.data.fechaNacimiento)}</span>
                {paciente.data.tieneAccesoPortal && (
                  <Badge tono="info">
                    <Globe className="size-3" aria-hidden /> Usa el portal
                  </Badge>
                )}
              </span>
            }
            acciones={
              <Button asChild>
                <Link to={`/agenda/nueva?pacienteId=${paciente.data.id}`}>
                  <CalendarPlus aria-hidden /> Agendar cita
                </Link>
              </Button>
            }
          />
          <AlertaAlergia alergias={paciente.data.alergias} compacta={false} className="mb-4" />
          <Card>
            <CardContent className="pt-4">
              <PacienteFormulario<typeof ActualizarPacienteEntrada>
                key={paciente.dataUpdatedAt}
                modo="editar"
                valores={valoresDesdePaciente(paciente.data)}
                guardando={actualizar.isPending}
                error={actualizar.error}
                alGuardar={(datos) =>
                  actualizar
                    .mutateAsync(datos)
                    .then(() => aviso.exito('Datos del paciente actualizados'))
                }
              />
            </CardContent>
          </Card>
          <p className="mt-3 text-xs text-muted">
            Consentimiento de datos registrado el{' '}
            {fechaHoraCorta(paciente.data.consentimientoEn, zona)}.
          </p>
        </>
      )}
    </div>
  );
}
