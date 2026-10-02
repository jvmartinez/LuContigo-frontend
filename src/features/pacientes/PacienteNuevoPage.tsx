import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCrearPaciente } from '@/api/queries/pacientes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, EncabezadoPagina } from '@/components/ui/card';
import { aviso } from '@/components/ui/toast';
import type { CrearPacienteEntrada } from '@/shared/pacientes';
import { PacienteFormulario } from './PacienteFormulario';

export default function PacienteNuevoPage() {
  const navigate = useNavigate();
  const crear = useCrearPaciente();

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variante="enlace" className="mb-2">
        <Link to="/pacientes">
          <ArrowLeft aria-hidden /> Pacientes
        </Link>
      </Button>
      <EncabezadoPagina titulo="Registrar paciente" />
      <Card>
        <CardContent className="pt-4">
          <PacienteFormulario<typeof CrearPacienteEntrada>
            modo="crear"
            guardando={crear.isPending}
            error={crear.error}
            alGuardar={(datos) =>
              crear.mutateAsync(datos).then((p) => {
                aviso.exito(
                  'Paciente registrado',
                  datos.crearAccesoPortal
                    ? 'Le enviamos la invitación al portal por email.'
                    : undefined,
                );
                navigate(`/pacientes/${p.id}`, { replace: true });
              })
            }
            acciones={
              <Button asChild variante="secundario">
                <Link to="/pacientes">Cancelar</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
