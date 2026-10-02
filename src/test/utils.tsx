import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Providers } from '@/app/providers';
import { crearQueryClient } from '@/app/query-client';
import { crearRutas } from '@/app/router';
import { db, fijarSesionRefresh } from './mocks/handlers';

/**
 * Monta la app completa (rutas, guardas y providers reales) en una ruta dada. Con `como` la
 * sesión empieza iniciada con ese email del seed, como si hubiera una cookie de refresh.
 */
export function renderApp(ruta: string, { como }: { como?: string } = {}) {
  if (como) {
    const u = db.usuarios.find((x) => x.email === como);
    if (!u) throw new Error(`Usuario de prueba desconocido: ${como}`);
    fijarSesionRefresh(u.id);
  }
  const qc = crearQueryClient();
  qc.setDefaultOptions({ queries: { ...qc.getDefaultOptions().queries, retry: false } });
  const router = createMemoryRouter(crearRutas(qc), { initialEntries: [ruta] });
  const usuario = userEvent.setup();
  const resultado = render(
    <Providers client={qc}>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { ...resultado, router, qc, usuario };
}

export const EMAILS = {
  recepcion: 'recepcion@demo.medicita.app',
  enfermera: 'enfermera1@demo.medicita.app',
  medico: 'medico.general@demo.medicita.app',
  paciente: 'paciente@demo.medicita.app',
  admin: 'admin@demo.medicita.app',
} as const;
