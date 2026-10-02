import { screen, within } from '@testing-library/react';
import { db } from '@/test/mocks/handlers';
import { renderApp } from '@/test/utils';

const citaDelEnlace = () => db.citas.find((c) => c.id === db.confirmaciones['enlace-demo'].citaId)!;

describe('confirmación desde el enlace del recordatorio (/c/:token)', () => {
  it('muestra la cita sin iniciar sesión y la confirma', async () => {
    const { usuario } = renderApp('/c/enlace-demo');
    expect(await screen.findByRole('heading', { name: 'Hola, María José' })).toBeInTheDocument();
    expect(screen.getByText('Dr. Luis Paredes')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Confirmar asistencia' }));
    expect(
      await screen.findByRole('heading', { name: '¡Listo, tu cita está confirmada!' }),
    ).toBeInTheDocument();
    expect(citaDelEnlace().estado).toBe('CONFIRMADA');
  });

  it('cancela después de confirmar la intención en un diálogo', async () => {
    const { usuario } = renderApp('/c/enlace-demo');
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar cita' }));
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Cancelar tu cita?' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Sí, cancelar' }));
    expect(
      await screen.findByRole('heading', { name: 'Tu cita fue cancelada' }),
    ).toBeInTheDocument();
    expect(citaDelEnlace()).toMatchObject({
      estado: 'CANCELADA',
      motivoCancelacion: 'Cancelada desde el recordatorio',
    });
  });

  it('explica qué hacer si el enlace ya se usó', async () => {
    db.confirmaciones['enlace-demo'].usado = true;
    renderApp('/c/enlace-demo');
    expect(
      await screen.findByRole('heading', { name: 'Este enlace ya no es válido' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('llama a la clínica');
  });

  it('solo ofrece cancelar si la cita ya estaba confirmada', async () => {
    citaDelEnlace().estado = 'CONFIRMADA';
    renderApp('/c/enlace-demo');
    expect(await screen.findByRole('button', { name: 'Cancelar cita' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar asistencia' })).not.toBeInTheDocument();
  });
});
