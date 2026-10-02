import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import '@/lib/formulario';
import { fijarSesionRefresh, reiniciarDb } from './mocks/handlers';
import { servidor } from './mocks/servidor';
import { tokenAcceso } from '@/api/token';

/**
 * Las pruebas corren un lunes a las 07:30 en Bogotá (antes de la primera cita del seed), así
 * los huecos libres y los estados no dependen de la hora real. Solo se falsea `Date`: los
 * temporizadores siguen siendo reales para user-event, MSW y TanStack Query.
 */
export const AHORA_PRUEBAS = new Date('2026-10-05T12:30:00Z');

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AHORA_PRUEBAS);
  reiniciarDb();
  fijarSesionRefresh(null);
  tokenAcceso.guardar(null);
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  servidor.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => servidor.close());

// React Router crea `Request` (de Node/undici) con el AbortSignal de jsdom, que undici rechaza.
// En pruebas se omite esa señal (las navegaciones de prueba no se abortan).
const RequestNativo = globalThis.Request;
globalThis.Request = class extends RequestNativo {
  constructor(entrada: RequestInfo | URL, init?: RequestInit) {
    if (init?.signal) {
      const { signal: _signal, ...resto } = init;
      super(entrada, resto);
    } else {
      super(entrada, init);
    }
  }
} as typeof Request;

// jsdom no implementa estas APIs que usan Radix y Recharts.
class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverFalso as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};
window.scrollTo = () => {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;
