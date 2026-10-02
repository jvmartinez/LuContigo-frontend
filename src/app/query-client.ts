import { QueryClient } from '@tanstack/react-query';
import { ErrorApi } from '@/api/errores';

/** Solo se reintentan fallas de red o del servidor; un 4xx no cambia al repetirlo. */
function reintentar(intentos: number, error: unknown): boolean {
  if (error instanceof ErrorApi && error.status >= 400 && error.status < 500) return false;
  return intentos < 2;
}

export function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: reintentar, staleTime: 15_000, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  });
}

export const queryClient = crearQueryClient();
