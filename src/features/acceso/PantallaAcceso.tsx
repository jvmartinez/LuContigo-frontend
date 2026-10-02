import type { ReactNode } from 'react';

const APP = import.meta.env.VITE_APP_NOMBRE ?? 'MediCita';

/** Marco común de las pantallas públicas (login, recuperar acceso, enlace de confirmación). */
export function PantallaAcceso({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 font-display text-2xl font-bold">
          <svg viewBox="0 0 32 32" className="size-9" aria-hidden>
            <rect width="32" height="32" rx="8" fill="var(--accent)" />
            <path d="M13 8h6v5h5v6h-5v5h-6v-5H8v-6h5z" fill="var(--accent-ink)" />
          </svg>
          {APP}
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold">{titulo}</h1>
          {descripcion && <p className="mt-1 text-muted">{descripcion}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
