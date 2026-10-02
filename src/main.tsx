import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Providers } from './app/providers';
import { queryClient } from './app/query-client';
import { crearRouter } from './app/router';
import { Cargando } from './components/ui/estados';
import './styles/index.css';

/** `npm run dev:mock`: sin API, con datos de demostración servidos por MSW en el navegador. */
async function prepararMocks() {
  if (import.meta.env.VITE_API_MOCK !== 'true') return;
  const { iniciarMocksNavegador } = await import('./test/mocks/navegador');
  await iniciarMocksNavegador();
}

void prepararMocks().then(() => {
  const router = crearRouter(queryClient);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Providers client={queryClient}>
        <RouterProvider router={router} fallbackElement={<Cargando texto="Abriendo MediCita…" />} />
      </Providers>
    </StrictMode>,
  );
});
