import type { BloqueHorario } from '@/api/tipos';

const LETRA = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Resume una plantilla semanal: días consecutivos con los mismos bloques se agrupan.
 * Ej.: "L–V 08:00–12:00, 14:00–18:00 · S 08:00–12:00".
 */
export function resumirHorario(bloques: BloqueHorario[]): string {
  if (bloques.length === 0) return 'Sin horario';
  const porDia = new Map<number, string>();
  for (let dia = 1; dia <= 7; dia++) {
    const texto = bloques
      .filter((b) => b.diaSemana === dia)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      .map((b) => `${b.horaInicio}–${b.horaFin}`)
      .join(', ');
    if (texto) porDia.set(dia, texto);
  }

  const grupos: { desde: number; hasta: number; texto: string }[] = [];
  for (const [dia, texto] of porDia) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.texto === texto && ultimo.hasta === dia - 1) ultimo.hasta = dia;
    else grupos.push({ desde: dia, hasta: dia, texto });
  }

  return grupos
    .map((g) => {
      const dias =
        g.desde === g.hasta
          ? LETRA[g.desde]
          : g.hasta === g.desde + 1
            ? `${LETRA[g.desde]}, ${LETRA[g.hasta]}`
            : `${LETRA[g.desde]}–${LETRA[g.hasta]}`;
      return `${dias} ${g.texto}`;
    })
    .join(' · ');
}
