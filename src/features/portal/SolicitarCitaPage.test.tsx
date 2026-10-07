import { screen, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { API_URL } from '@/api/client';
import { db } from '@/test/mocks/handlers';
import { servidor } from '@/test/mocks/servidor';
import { EMAILS, renderApp } from '@/test/utils';

describe('solicitud de cita', () => {
  it('permite recuperarse por separado de errores de catálogos', async () => {
    let intentosMedicos = 0;
    let intentosEspecialidades = 0;
    servidor.use(
      http.get(`${API_URL}/medicos`, async () => {
        intentosMedicos++;
        if (intentosMedicos === 1)
          return HttpResponse.json({ error: 'fallo temporal' }, { status: 503 });
        await delay(100);
        return HttpResponse.json([
          {
            id: 'per_med1',
            nombre: 'Dra. Ana Torres',
            especialidad: { id: 'esp_general', nombre: 'Medicina general', duracionCitaMin: 30 },
          },
        ]);
      }),
      http.get(`${API_URL}/especialidades`, () => {
        intentosEspecialidades++;
        if (intentosEspecialidades === 1)
          return HttpResponse.json({ error: 'fallo temporal' }, { status: 503 });
        return HttpResponse.json(db.especialidades);
      }),
    );

    const { usuario } = renderApp('/mis-citas/nueva', { como: EMAILS.paciente });
    const grupoEspecialidades = await screen.findByRole('group', { name: 'Especialidades' });
    const grupoMedicos = screen.getByRole('group', { name: 'Médicos' });

    expect(await within(grupoEspecialidades).findByRole('alert')).toHaveTextContent(
      'No pudimos cargar las especialidades',
    );
    expect(await within(grupoMedicos).findByRole('alert')).toHaveTextContent(
      'No pudimos cargar los médicos',
    );
    expect(within(grupoMedicos).getByRole('combobox')).toBeDisabled();

    await usuario.click(within(grupoEspecialidades).getByRole('button', { name: 'Reintentar' }));
    await usuario.click(within(grupoMedicos).getByRole('button', { name: 'Reintentar' }));
    expect(await within(grupoMedicos).findByRole('status')).toHaveTextContent(
      'Consultando médicos…',
    );

    expect(
      await within(grupoEspecialidades).findByRole('option', { name: 'Medicina general' }),
    ).toBeInTheDocument();
    const selectorMedicos = within(grupoMedicos).getByRole('combobox');
    await screen.findByRole('option', { name: /Dra\. Ana Torres/ });
    expect(selectorMedicos).toBeEnabled();
    await usuario.selectOptions(selectorMedicos, 'per_med1');
    expect(selectorMedicos).toHaveValue('per_med1');
    expect(intentosMedicos).toBe(2);
    expect(intentosEspecialidades).toBe(2);
  });

  it('permite continuar sin filtro si falla la carga de especialidades', async () => {
    servidor.use(
      http.get(`${API_URL}/medicos`, () =>
        HttpResponse.json([
          {
            id: 'per_med1',
            nombre: 'Dra. Ana Torres',
            especialidad: { id: 'esp_general', nombre: 'Medicina general', duracionCitaMin: 30 },
          },
        ]),
      ),
      http.get(`${API_URL}/especialidades`, () =>
        HttpResponse.json({ error: 'fallo temporal' }, { status: 503 }),
      ),
    );

    const { usuario } = renderApp('/mis-citas/nueva', { como: EMAILS.paciente });
    const grupoEspecialidades = await screen.findByRole('group', { name: 'Especialidades' });
    const grupoMedicos = await screen.findByRole('group', { name: 'Médicos' });
    expect(await within(grupoEspecialidades).findByRole('alert')).toHaveTextContent(
      'No pudimos cargar las especialidades',
    );

    const selectorMedicos = within(grupoMedicos).getByRole('combobox');
    await screen.findByRole('option', { name: /Dra\. Ana Torres/ });
    expect(selectorMedicos).toBeEnabled();
    await usuario.selectOptions(selectorMedicos, 'per_med1');
    expect(selectorMedicos).toHaveValue('per_med1');
  });

  it('distingue catálogos vacíos de errores y permite continuar sin especialidades', async () => {
    servidor.use(
      http.get(`${API_URL}/medicos`, () =>
        HttpResponse.json([
          {
            id: 'per_med1',
            nombre: 'Dra. Ana Torres',
            especialidad: { id: 'esp_general', nombre: 'Medicina general', duracionCitaMin: 30 },
          },
        ]),
      ),
      http.get(`${API_URL}/especialidades`, () => HttpResponse.json([])),
    );

    renderApp('/mis-citas/nueva', { como: EMAILS.paciente });

    expect(
      await screen.findByText('No hay especialidades disponibles; puedes continuar sin filtro.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /Dra\. Ana Torres/ })).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Médicos' })).getByRole('combobox'),
    ).toBeEnabled();
    expect(screen.queryByText('No pudimos cargar las especialidades')).not.toBeInTheDocument();
  });

  it('muestra explícitamente cuando no hay médicos', async () => {
    servidor.use(http.get(`${API_URL}/medicos`, () => HttpResponse.json([])));

    renderApp('/mis-citas/nueva', { como: EMAILS.paciente });

    const grupoMedicos = await screen.findByRole('group', { name: 'Médicos' });
    expect(
      await within(grupoMedicos).findByText('No hay médicos disponibles por ahora'),
    ).toBeInTheDocument();
    expect(within(grupoMedicos).getByRole('combobox')).toBeDisabled();
  });
});
