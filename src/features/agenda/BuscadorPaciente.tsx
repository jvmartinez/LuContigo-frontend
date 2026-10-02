import { Search, UserRound, X } from 'lucide-react';
import { forwardRef, useDeferredValue, useId, useState } from 'react';
import { usePacientes } from '@/api/queries/pacientes';
import type { PacienteResumen } from '@/api/tipos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/campo';
import { textoEdad } from '@/lib/edad';

/**
 * Buscador de pacientes por nombre o documento. Muestra resultados como lista de botones,
 * accesible con Tab y lector de pantalla; al elegir uno queda fijado hasta pulsar "Cambiar".
 */
export const BuscadorPaciente = forwardRef<
  HTMLInputElement,
  {
    valor: PacienteResumen | null;
    alElegir: (p: PacienteResumen | null) => void;
  }
>(({ valor, alElegir }, ref) => {
  const [texto, setTexto] = useState('');
  const q = useDeferredValue(texto.trim());
  const buscar = q.length >= 2;
  const resultados = usePacientes(q, 1, { enabled: buscar && !valor });
  const idLista = useId();

  if (valor) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-accent/50 bg-accent-soft px-3 py-2">
        <UserRound className="size-5 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {valor.apellidos}, {valor.nombres}
          </p>
          <p className="font-mono text-xs text-muted">
            {valor.documento} · {textoEdad(valor.fechaNacimiento)}
          </p>
        </div>
        <Button type="button" variante="fantasma" tamano="sm" onClick={() => alElegir(null)}>
          <X aria-hidden /> Cambiar
        </Button>
      </div>
    );
  }

  const items = resultados.data?.items ?? [];
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          ref={ref}
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre, apellido o documento"
          className="pl-9"
          autoComplete="off"
          aria-controls={idLista}
        />
      </div>
      <div id={idLista} aria-live="polite">
        {!buscar ? (
          <p className="text-xs text-muted">Escribe al menos 2 letras o números.</p>
        ) : resultados.isPending ? (
          <p className="text-sm text-muted">Buscando…</p>
        ) : resultados.isError ? (
          <p className="text-sm text-crit">No pudimos buscar pacientes. Intenta de nuevo.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">Sin resultados para “{q}”.</p>
        ) : (
          <ul
            className="flex max-h-60 flex-col gap-1 overflow-y-auto"
            aria-label="Pacientes encontrados"
          >
            {items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => alElegir(p)}
                  className="flex min-h-tap w-full items-center justify-between gap-2 rounded-lg border border-line px-3 py-1.5 text-left hover:border-accent hover:bg-accent-soft"
                >
                  <span className="font-medium">
                    {p.apellidos}, {p.nombres}
                  </span>
                  <span className="font-mono text-xs text-muted">{p.documento}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});
BuscadorPaciente.displayName = 'BuscadorPaciente';
