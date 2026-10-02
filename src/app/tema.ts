import { useCallback, useState } from 'react';
import { guardarPreferencia, leerPreferencia } from '@/lib/preferencias';

export type Tema = 'sistema' | 'light' | 'dark';

function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  if (tema === 'sistema') delete raiz.dataset.theme;
  else raiz.dataset.theme = tema;
}

/** Tema claro/oscuro: sigue al sistema (`prefers-color-scheme`) salvo que se elija a mano. */
export function useTema() {
  const [tema, setTema] = useState<Tema>(() => {
    const t = leerPreferencia('tema');
    return t === 'light' || t === 'dark' ? t : 'sistema';
  });

  const cambiar = useCallback((nuevo: Tema) => {
    aplicar(nuevo);
    guardarPreferencia('tema', nuevo === 'sistema' ? null : nuevo);
    setTema(nuevo);
  }, []);

  return { tema, cambiar };
}
