/**
 * El access token vive solo en memoria (FRONTEND.md §7): al recargar la página se pierde y
 * el cliente pide otro con la cookie httpOnly del refresh token.
 */
let accessToken: string | null = null;

export const tokenAcceso = {
  obtener: () => accessToken,
  guardar: (token: string | null) => {
    accessToken = token;
  },
};

type Oyente = () => void;
const oyentesExpiracion = new Set<Oyente>();

/** Avisa cuando el refresh falla: la sesión terminó y hay que volver a /login. */
export function alExpirarSesion(oyente: Oyente): () => void {
  oyentesExpiracion.add(oyente);
  return () => {
    oyentesExpiracion.delete(oyente);
  };
}

export function notificarSesionExpirada(): void {
  oyentesExpiracion.forEach((o) => o());
}
