import { screen, waitFor, within } from '@testing-library/react';
import { db } from '@/test/mocks/handlers';
import { EMAILS, renderApp } from '@/test/utils';

const citaEnConsulta = () =>
  db.citas.find((c) => c.pacienteId === 'pac_01' && c.estado === 'EN_CONSULTA')!;

describe('consulta del médico', () => {
  it('abre por defecto la cita EN_CONSULTA con alergias, signos de hoy e historial', async () => {
    renderApp('/consultorio', { como: EMAILS.medico });
    expect(
      await screen.findByRole('heading', { name: 'María José Rojas Díaz', level: 2 }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('note', { name: 'Alergias: Penicilina' })).toBeInTheDocument();
    expect(await screen.findByText('145/92')).toBeInTheDocument();
    expect(screen.getAllByText('Presión alta').length).toBeGreaterThan(0);
    // La consulta de ayer aparece en el historial.
    expect(await screen.findByText('Infección respiratoria alta')).toBeInTheDocument();
  });

  it('finalizar exige diagnóstico y tratamiento y pide confirmación en un diálogo propio', async () => {
    const cita = citaEnConsulta();
    const { usuario } = renderApp(`/consultorio/${cita.id}`, { como: EMAILS.medico });

    const finalizar = await screen.findByRole('button', {
      name: 'Finalizar y guardar en historial',
    });
    expect(screen.getByLabelText('Motivo de consulta')).toHaveValue('Dolor de cabeza recurrente');
    await usuario.click(finalizar);
    expect(
      await screen.findByText('El diagnóstico es obligatorio para finalizar'),
    ).toBeInTheDocument();
    expect(screen.getByText('El tratamiento es obligatorio para finalizar')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Diagnóstico'), 'Cefalea tensional');
    await usuario.type(screen.getByLabelText('Tratamiento'), 'Acetaminofén 500 mg cada 8 h');
    await usuario.type(screen.getByLabelText('Indicaciones para el paciente'), 'Dormir 8 horas');
    await usuario.click(finalizar);

    const dialogo = await screen.findByRole('alertdialog', { name: '¿Finalizar la consulta?' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Volver' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(cita.estado).toBe('EN_CONSULTA');

    await usuario.click(finalizar);
    await usuario.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Finalizar consulta',
      }),
    );

    expect(await screen.findByText('Consulta finalizada')).toBeInTheDocument();
    expect(cita.estado).toBe('ATENDIDA');
    expect(db.consultas[cita.id]).toMatchObject({
      diagnostico: 'Cefalea tensional',
      indicaciones: 'Dormir 8 horas',
    });
    // La nota cerrada se muestra en solo lectura y el respaldo local se borra.
    expect(await screen.findByText('Acetaminofén 500 mg cada 8 h')).toBeInTheDocument();
    expect(sessionStorage.getItem(`medicita:nota:${cita.id}`)).toBeNull();
  });

  it('respalda lo escrito en sessionStorage y lo recupera si no llegó al servidor', async () => {
    const cita = citaEnConsulta();
    const primera = renderApp(`/consultorio/${cita.id}`, { como: EMAILS.medico });
    await primera.usuario.type(await screen.findByLabelText('Examen físico'), 'TA 145/92');
    const respaldo = JSON.parse(sessionStorage.getItem(`medicita:nota:${cita.id}`)!);
    expect(respaldo.valores.examenFisico).toBe('TA 145/92');
    expect(localStorage.length).toBe(0);
    primera.unmount();

    renderApp(`/consultorio/${cita.id}`, { como: EMAILS.medico });
    expect(await screen.findByText(/Recuperamos cambios de esta nota/)).toBeInTheDocument();
    expect(screen.getByLabelText('Examen físico')).toHaveValue('TA 145/92');
  });

  it('guarda el borrador en el servidor', async () => {
    const cita = citaEnConsulta();
    const { usuario } = renderApp(`/consultorio/${cita.id}`, { como: EMAILS.medico });
    await usuario.type(await screen.findByLabelText('Diagnóstico'), 'Migraña');
    await usuario.click(screen.getByRole('button', { name: /Guardar borrador/ }));
    expect(await screen.findByText(/Borrador guardado/)).toBeInTheDocument();
    expect(db.consultas[cita.id]).toMatchObject({ diagnostico: 'Migraña', cerradaEn: null });
    expect(sessionStorage.getItem(`medicita:nota:${cita.id}`)).toBeNull();
  });

  it('delega una tarea a la enfermera asignada', async () => {
    const cita = citaEnConsulta();
    const { usuario } = renderApp(`/consultorio/${cita.id}`, { como: EMAILS.medico });
    await usuario.click(await screen.findByRole('button', { name: 'Delegar a Enf. Rosa Díaz' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Delegar a Enf. Rosa Díaz' });
    await usuario.selectOptions(within(dialogo).getByLabelText('Tipo de tarea'), 'Nebulización');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Delegar' }));
    expect(await screen.findByText('Tarea delegada')).toBeInTheDocument();
    expect(db.tareas.at(-1)).toMatchObject({
      citaId: cita.id,
      enfermeraId: 'per_enf1',
      tipo: 'Nebulización',
    });
  });
});
