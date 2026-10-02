import * as DialogPrimitive from '@radix-ui/react-dialog';
import { LogOut, Menu, Monitor, Moon, Sun, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DialogOverlay } from '@/components/ui/dialog';
import { NOMBRE_ROL } from '@/auth/rutas';
import { SesionProvider, useUsuario } from '@/auth/sesion';
import { cn } from '@/lib/cn';
import { useTema, type Tema } from '../tema';
import { MENU } from './menu';

const APP = import.meta.env.VITE_APP_NOMBRE ?? 'MediCita';

function Logo() {
  return (
    <span className="flex items-center gap-2 font-display text-lg font-bold">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill="var(--accent)" />
        <path d="M13 8h6v5h5v6h-5v5h-6v-5H8v-6h5z" fill="var(--accent-ink)" />
      </svg>
      {APP}
    </span>
  );
}

function Navegacion({ alNavegar }: { alNavegar?: () => void }) {
  const { rol } = useUsuario();
  return (
    <nav aria-label="Principal">
      <ul className="flex flex-col gap-1">
        {MENU[rol].map(({ a, texto, icono: Icono, exacta }) => (
          <li key={a}>
            <NavLink
              to={a}
              end={exacta}
              onClick={alNavegar}
              className={({ isActive }) =>
                cn(
                  'flex min-h-tap items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent-soft text-ink'
                    : 'text-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <Icono className="size-5 shrink-0" aria-hidden />
              {texto}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const SIGUIENTE_TEMA: Record<Tema, { siguiente: Tema; icono: typeof Sun; texto: string }> = {
  sistema: { siguiente: 'light', icono: Monitor, texto: 'Tema: automático' },
  light: { siguiente: 'dark', icono: Sun, texto: 'Tema: claro' },
  dark: { siguiente: 'sistema', icono: Moon, texto: 'Tema: oscuro' },
};

function BotonTema() {
  const { tema, cambiar } = useTema();
  const { siguiente, icono: Icono, texto } = SIGUIENTE_TEMA[tema];
  return (
    <Button
      variante="fantasma"
      tamano="icono"
      onClick={() => cambiar(siguiente)}
      aria-label={`${texto}. Cambiar tema`}
      title={texto}
    >
      <Icono className="!size-5" aria-hidden />
    </Button>
  );
}

function Estructura() {
  const { usuario, rol, nombre, salir } = useUsuario();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only-focusable fixed left-2 top-2 z-[70] rounded-lg bg-accent px-4 py-2 text-accent-ink"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <DialogPrimitive.Root open={menuAbierto} onOpenChange={setMenuAbierto}>
            <DialogPrimitive.Trigger asChild>
              <Button
                variante="fantasma"
                tamano="icono"
                className="lg:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="!size-5" aria-hidden />
              </Button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogOverlay />
              <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-4 border-r border-line bg-surface p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <DialogPrimitive.Title asChild>
                    <span>
                      <Logo />
                    </span>
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Close asChild>
                    <Button variante="fantasma" tamano="icono" aria-label="Cerrar menú">
                      <X className="!size-5" aria-hidden />
                    </Button>
                  </DialogPrimitive.Close>
                </div>
                <DialogPrimitive.Description className="sr-only">
                  Menú de navegación
                </DialogPrimitive.Description>
                <Navegacion alNavegar={() => setMenuAbierto(false)} />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>

          <Logo />
          <span className="hidden truncate text-sm text-muted md:inline">
            · {usuario.clinica.nombre}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <div className="mr-2 hidden text-right leading-tight sm:block">
              <p className="max-w-48 truncate text-sm font-semibold">{nombre}</p>
              <p className="text-xs text-muted">{NOMBRE_ROL[rol]}</p>
            </div>
            <BotonTema />
            <Button
              variante="fantasma"
              tamano="icono"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              cargando={saliendo}
              onClick={async () => {
                setSaliendo(true);
                await salir();
              }}
            >
              {!saliendo && <LogOut className="!size-5" aria-hidden />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 border-r border-line bg-surface p-3 lg:block">
          <Navegacion />
        </aside>
        <main
          id="contenido"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 py-5 outline-none sm:px-6 lg:px-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function LayoutApp() {
  const navigate = useNavigate();
  const alSalir = useCallback(() => navigate('/login', { replace: true }), [navigate]);
  return (
    <SesionProvider alSalir={alSalir}>
      <Estructura />
    </SesionProvider>
  );
}
