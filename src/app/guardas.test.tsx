import { screen, waitFor } from '@testing-library/react';
import { EMAILS, renderApp } from '@/test/utils';

describe('rutas protegidas por rol', () => {
  it('sin sesión lleva al login y, al entrar, a la pantalla del rol', async () => {
    const { usuario, router } = renderApp('/agenda');
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
    expect(router.state.location.search).toContain('siguiente=%2Fagenda');

    await usuario.type(screen.getByLabelText('Email'), EMAILS.medico);
    await usuario.type(screen.getByLabelText('Contraseña'), 'Demo2026medicita');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    // El médico no puede abrir /agenda: aterriza en su pantalla principal.
    await waitFor(() => expect(router.state.location.pathname).toBe('/consultorio'));
    expect(await screen.findByRole('heading', { name: 'Pacientes de hoy' })).toBeInTheDocument();
  });

  it('muestra el error de credenciales con un mensaje que dice qué pasó', async () => {
    const { usuario } = renderApp('/login');
    await usuario.type(await screen.findByLabelText('Email'), EMAILS.recepcion);
    await usuario.type(screen.getByLabelText('Contraseña'), 'mala');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.');
  });

  it('una enfermera no puede abrir /consultorio', async () => {
    const { router } = renderApp('/consultorio', { como: EMAILS.enfermera });
    expect(
      await screen.findByRole('heading', { name: 'No tienes acceso a esta pantalla' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/consultorio');
    expect(screen.getByRole('link', { name: 'Ir a mi pantalla principal' })).toHaveAttribute(
      'href',
      '/enfermeria',
    );
  });

  it.each([
    [EMAILS.recepcion, '/agenda'],
    [EMAILS.enfermera, '/enfermeria'],
    [EMAILS.medico, '/consultorio'],
    [EMAILS.paciente, '/mis-citas'],
    [EMAILS.admin, '/admin/panel'],
  ])('%s aterriza en %s', async (email, ruta) => {
    const { router } = renderApp('/', { como: email });
    await waitFor(() => expect(router.state.location.pathname).toBe(ruta));
  });
});
