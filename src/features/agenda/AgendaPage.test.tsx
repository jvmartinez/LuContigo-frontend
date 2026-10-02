import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { API_URL } from '@/api/client';
import { db, errorApi } from '@/test/mocks/handlers';
import { servidor } from '@/test/mocks/servidor';
import { EMAILS, renderApp } from '@/test/utils';

const abrirAgenda = async () => {
  const app = renderApp('/agenda', { como: EMAILS.recepcion });
  await screen.findByRole('heading', { name: 'Dra. Ana Torres' });
  return app;
};

describe('agenda de recepción', () => {
  it('muestra una columna por médico con las citas y su estado', async () => {
    await abrirAgenda();
    expect(screen.getByRole('heading', { name: 'Dr. Luis Paredes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dra. Carmen Ruiz' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /08:30, Dra\. Ana Torres: Rojas Díaz, María José, En consulta/,
      }),
    ).toBeInTheDocument();
    // Cardiología usa celdas de 40 minutos.
    expect(screen.getByText('Cardiología · 40 min')).toBeInTheDocument();
  });

  it('agenda desde una celda libre con médico, fecha y hora ya elegidos', async () => {
    const { usuario, router } = await abrirAgenda();
    await usuario.click(
      screen.getByRole('button', { name: '11:30, Dra. Ana Torres: libre. Agendar cita' }),
    );

    const panel = await screen.findByRole('dialog', { name: 'Nueva cita' });
    expect(router.state.location.pathname).toBe('/agenda/nueva');
    expect(within(panel).getByLabelText('Médico')).toHaveValue('per_med1');
    await waitFor(() =>
      expect(within(panel).getByLabelText('Hora libre')).toHaveDisplayValue('11:30'),
    );

    await usuario.type(within(panel).getByLabelText('Paciente'), 'Vargas');
    await usuario.click(await within(panel).findByRole('button', { name: /Vargas León, Tomás/ }));
    await usuario.type(within(panel).getByLabelText(/Motivo/), 'Control');
    await usuario.click(within(panel).getByRole('button', { name: 'Agendar cita' }));

    expect(await screen.findByText('Cita agendada')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/agenda'));
    expect(db.citas.at(-1)).toMatchObject({
      pacienteId: 'pac_12',
      medicoId: 'per_med1',
      motivo: 'Control',
    });

    // Vuelve a la agenda con el detalle de la cita nueva abierto; al cerrarlo, está en su celda.
    const detalle = await screen.findByRole('dialog', { name: 'Tomás Vargas León' });
    await usuario.click(within(detalle).getByRole('button', { name: 'Cerrar panel' }));
    expect(
      await screen.findByRole('button', {
        name: /11:30, Dra\. Ana Torres: Vargas León, Tomás, Programada/,
      }),
    ).toBeInTheDocument();
  });

  it('exige elegir al paciente', async () => {
    const { usuario } = renderApp('/agenda/nueva?medicoId=per_med1&fecha=2026-10-05&hora=11:30', {
      como: EMAILS.recepcion,
    });
    const panel = await screen.findByRole('dialog', { name: 'Nueva cita' });
    await waitFor(() =>
      expect(within(panel).getByLabelText('Hora libre')).toHaveDisplayValue('11:30'),
    );
    await usuario.click(within(panel).getByRole('button', { name: 'Agendar cita' }));
    expect(await within(panel).findByText('Busca y elige al paciente')).toBeInTheDocument();
  });

  it('si el horario se acaba de ocupar (409) pide elegir otro y refresca los libres', async () => {
    let consultasDisponibilidad = 0;
    servidor.events.on('request:start', ({ request }) => {
      if (request.url.includes('/disponibilidad?medicoId=per_med1')) consultasDisponibilidad++;
    });
    servidor.use(
      http.post(`${API_URL}/citas`, () =>
        errorApi(409, 'HORARIO_OCUPADO', 'Ese horario ya tiene una cita. Elige otro.'),
      ),
    );
    const { usuario } = renderApp('/agenda/nueva?medicoId=per_med1&fecha=2026-10-05&hora=11:30', {
      como: EMAILS.recepcion,
    });
    const panel = await screen.findByRole('dialog', { name: 'Nueva cita' });
    const hora = within(panel).getByLabelText('Hora libre');
    await waitFor(() => expect(hora).toHaveDisplayValue('11:30'));
    await usuario.type(within(panel).getByLabelText('Paciente'), 'Vargas');
    await usuario.click(await within(panel).findByRole('button', { name: /Vargas León, Tomás/ }));
    const antes = consultasDisponibilidad;
    await usuario.click(within(panel).getByRole('button', { name: 'Agendar cita' }));

    expect(
      await within(panel).findByText('Ese horario acaba de ocuparse. Elige otro.'),
    ).toBeInTheDocument();
    expect(hora).toHaveValue('');
    expect(hora).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(consultasDisponibilidad).toBeGreaterThan(antes));
    servidor.events.removeAllListeners();
  });

  it('confirma una cita desde el panel de detalle', async () => {
    const { usuario } = await abrirAgenda();
    await usuario.click(
      screen.getByRole('button', {
        name: /10:30, Dra\. Ana Torres: Ortega Ramos, Camila, Programada/,
      }),
    );
    const panel = await screen.findByRole('dialog', { name: 'Camila Ortega Ramos' });
    await usuario.click(await within(panel).findByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('Cita confirmada')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(panel).getByText('Confirmada', { selector: 'span' })).toBeInTheDocument(),
    );
    expect(within(panel).queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
  });

  it('registra la llegada: el paciente pasa a sala de espera', async () => {
    const { usuario } = await abrirAgenda();
    await usuario.click(
      screen.getByRole('button', {
        name: /10:00, Dra\. Ana Torres: Navarro Cruz, Diego, Confirmada/,
      }),
    );
    const panel = await screen.findByRole('dialog', { name: 'Diego Navarro Cruz' });
    await usuario.click(await within(panel).findByRole('button', { name: 'Registrar llegada' }));
    expect(await screen.findByText(/Llegada registrada/)).toBeInTheDocument();
    expect(db.citas.find((c) => c.pacienteId === 'pac_08')?.estado).toBe('EN_ESPERA');
  });

  it('muestra un error recuperable si la agenda no carga', async () => {
    servidor.use(
      http.get(`${API_URL}/citas`, () =>
        errorApi(500, 'ERROR_INTERNO', 'Ocurrió un error inesperado.'),
      ),
    );
    renderApp('/agenda', { como: EMAILS.recepcion });
    expect(await screen.findByText('No pudimos cargar la agenda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});
