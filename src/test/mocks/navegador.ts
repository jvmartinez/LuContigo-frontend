import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** `npm run dev:mock`: la API simulada corre en el navegador con un service worker. */
export async function iniciarMocksNavegador(): Promise<void> {
  await setupWorker(...handlers).start({ onUnhandledRequest: 'bypass', quiet: true });
}
