import { screen, waitFor } from '@testing-library/react';
import { db } from '@/test/mocks/handlers';
import { EMAILS, renderApp } from '@/test/utils';

describe('bitácora del administrador', () => {
  it('muestra el documento, filtra por documento y permite limpiar el filtro', async () => {
    const paciente = db.pacientes[0];
    db.auditoria.push({
      id: 'aud_prueba',
      usuarioId: null,
      accion: 'LEER',
      entidad: 'PACIENTE',
      entidadId: null,
      pacienteId: paciente.id,
      ip: '127.0.0.1',
      fecha: new Date().toISOString(),
    });
    const { usuario, qc } = renderApp('/admin/bitacora', { como: EMAILS.admin });
    await screen.findByRole('table', { name: 'Registros de auditoría' });
    expect(screen.getByRole('cell', { name: paciente.documento })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: paciente.id })).not.toBeInTheDocument();
    const documento = screen.getByRole('textbox', { name: /Documento del paciente/ });
    await usuario.type(documento, paciente.documento);
    await usuario.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() => {
      const consulta = qc.getQueryCache().findAll({ queryKey: ['auditoria'] }).at(-1)!;
      expect(consulta.queryKey[1]).toMatchObject({ documento: paciente.documento, page: 1 });
      expect(consulta.queryKey[1]).not.toHaveProperty('pacienteId');
      expect(consulta.state.status).toBe('success');
    });
    expect(screen.getByRole('table')).toBeInTheDocument();
    await usuario.clear(documento);
    await usuario.type(documento, 'documento-inexistente');
    await usuario.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(await screen.findByText('Sin registros para estos filtros')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(documento).toHaveValue('');
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('conserva los registros sin paciente y los accesos por enlace público', async () => {
    db.auditoria.push({
      id: 'aud_sin_paciente',
      usuarioId: null,
      accion: 'LEER',
      entidad: 'PACIENTE',
      entidadId: null,
      pacienteId: null,
      ip: '127.0.0.1',
      fecha: new Date().toISOString(),
    });
    renderApp('/admin/bitacora', { como: EMAILS.admin });
    await screen.findByRole('table', { name: 'Registros de auditoría' });
    expect(screen.getByRole('cell', { name: '—' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Enlace público' })).toBeInTheDocument();
  });
});