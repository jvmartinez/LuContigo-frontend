import { screen, waitFor, within } from '@testing-library/react';
import { db } from '@/test/mocks/handlers';
import { EMAILS, renderApp } from '@/test/utils';

/** Lucía (10 años, alérgica al ibuprofeno) espera al pediatra, asignado a enfermera1. */
const citaDeLucia = () => db.citas.find((c) => c.pacienteId === 'pac_03')!.id;

describe('formulario de triaje', () => {
  it('muestra la alergia arriba, el IMC en vivo y marca en rojo los valores fuera de rango', async () => {
    const { usuario } = renderApp(`/enfermeria/triaje/${citaDeLucia()}`, {
      como: EMAILS.enfermera,
    });

    const alergia = await screen.findByRole('note', { name: 'Alergias: Ibuprofeno' });
    const titulo = screen.getByRole('heading', { name: 'Lucía Fernández Soto', level: 1 });
    expect(alergia.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await usuario.type(screen.getByLabelText('Presión arterial (mmHg)'), '150/95');
    expect(await screen.findByText('Alerta: Presión alta')).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Peso (kg)'), '30');
    await usuario.type(screen.getByLabelText('Talla (cm)'), '135');
    expect(screen.getByText('16.5')).toBeInTheDocument();
    expect(screen.getByText('Bajo peso')).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Temperatura (°C)'), '43');
    expect(screen.getByText('Fuera del rango aceptado (34–42.5)')).toBeInTheDocument();

    // En menores de 12 años una FC de 110 no es taquicardia.
    await usuario.type(screen.getByLabelText('Frecuencia cardiaca (lpm)'), '110');
    expect(screen.queryByText('Alerta: Taquicardia')).not.toBeInTheDocument();
  });

  it('valida con el esquema compartido y, al guardar, pasa la cita a "Listo"', async () => {
    const id = citaDeLucia();
    const { usuario, router } = renderApp(`/enfermeria/triaje/${id}`, { como: EMAILS.enfermera });

    const presion = await screen.findByLabelText('Presión arterial (mmHg)');
    await usuario.type(presion, '120');
    await usuario.type(screen.getByLabelText('Temperatura (°C)'), '43');
    await usuario.click(screen.getByRole('button', { name: /Guardar signos/ }));
    expect(await screen.findByText('Escribe la presión como 120/80')).toBeInTheDocument();
    expect(presion).toHaveAttribute('aria-invalid', 'true');

    await usuario.clear(presion);
    await usuario.type(presion, '110/70');
    await usuario.click(screen.getByRole('button', { name: /Guardar signos/ }));
    expect(await screen.findByText('El máximo es 42.5')).toBeInTheDocument();

    const temperatura = screen.getByLabelText('Temperatura (°C)');
    await usuario.clear(temperatura);
    await usuario.type(temperatura, '38,5');
    await usuario.click(screen.getByRole('button', { name: /Guardar signos/ }));

    expect(await screen.findByText('Lucía está listo para el médico')).toBeInTheDocument();
    expect(screen.getByText('Alertas: Fiebre.')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/enfermeria'));
    expect(db.citas.find((c) => c.id === id)?.estado).toBe('LISTA');

    const listos = await screen.findByRole('list', { name: 'Pacientes listos para el médico' });
    expect(await within(listos).findByText(/Fernández Soto, Lucía/)).toBeInTheDocument();
  });

  it('no deja guardar el formulario vacío', async () => {
    const { usuario } = renderApp(`/enfermeria/triaje/${citaDeLucia()}`, {
      como: EMAILS.enfermera,
    });
    await usuario.click(await screen.findByRole('button', { name: /Guardar signos/ }));
    expect(await screen.findByText('Registra al menos un signo vital.')).toBeInTheDocument();
  });
});
