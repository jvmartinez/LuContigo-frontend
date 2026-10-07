import { screen, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { API_URL } from '@/api/client';
import { db } from '@/test/mocks/handlers';
import { servidor } from '@/test/mocks/servidor';
import { EMAILS, renderApp } from '@/test/utils';

describe('horarios del personal', () => {
  it('distingue carga y error y reintenta solo el horario de la persona afectada', async () => {
    let intentosMedico = 0;
    servidor.use(
      http.get(`${API_URL}/personal/:id/horarios`, async ({ params }) => {
        const id = String(params.id);
        if (id === 'per_med1') {
          intentosMedico++;
          if (intentosMedico === 1)
            return HttpResponse.json({ error: 'fallo temporal' }, { status: 503 });
          await delay(100);
          return HttpResponse.json({
            personalId: id,
            bloques: [{ diaSemana: 1, horaInicio: '09:00', horaFin: '17:00' }],
          });
        }
        return HttpResponse.json({ personalId: id, bloques: db.horarios[id] ?? [] });
      }),
    );

    const { usuario } = renderApp('/admin/personal', { como: EMAILS.admin });
    const filaMedico = await screen.findByRole('row', { name: /Dra\. Ana Torres/ });
    const filaOtraPersona = await screen.findByRole('row', { name: /Dr\. Luis Paredes/ });

    const reintentar = await within(filaMedico).findByRole('button', {
      name: 'Reintentar horario de Dra. Ana Torres',
    });
    await within(filaOtraPersona).findByText('L–D 08:00–12:00, 14:00–18:00');
    expect(within(filaMedico).getByRole('alert')).toHaveTextContent(
      'No se pudo cargar el horario de Dra. Ana Torres.',
    );
    expect(filaOtraPersona).toHaveTextContent('L–D 08:00–12:00, 14:00–18:00');
    expect(within(filaOtraPersona).queryByRole('alert')).not.toBeInTheDocument();

    await usuario.click(reintentar);
    expect(await within(filaMedico).findByRole('status')).toHaveTextContent('Cargando horario…');

    expect(await within(filaMedico).findByText('L 09:00–17:00')).toBeInTheDocument();
    expect(intentosMedico).toBe(2);
    expect(filaOtraPersona).toHaveTextContent('L–D 08:00–12:00, 14:00–18:00');
  });
});
