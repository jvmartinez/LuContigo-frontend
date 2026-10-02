import { resumirHorario } from './horario';

const bloque = (diaSemana: number, horaInicio: string, horaFin: string) => ({
  diaSemana,
  horaInicio,
  horaFin,
});

describe('resumen del horario semanal', () => {
  it('agrupa días consecutivos con los mismos bloques', () => {
    const bloques = [1, 2, 3, 4, 5].flatMap((d) => [
      bloque(d, '14:00', '18:00'),
      bloque(d, '08:00', '12:00'),
    ]);
    expect(resumirHorario(bloques)).toBe('L–V 08:00–12:00, 14:00–18:00');
  });

  it('separa días distintos y no agrupa días salteados', () => {
    const bloques = [
      bloque(1, '08:00', '12:00'),
      bloque(3, '08:00', '12:00'),
      bloque(6, '09:00', '13:00'),
    ];
    expect(resumirHorario(bloques)).toBe('L 08:00–12:00 · X 08:00–12:00 · S 09:00–13:00');
  });

  it('usa coma para dos días seguidos', () => {
    expect(resumirHorario([bloque(6, '08:00', '12:00'), bloque(7, '08:00', '12:00')])).toBe(
      'S, D 08:00–12:00',
    );
  });

  it('indica cuando no hay horario', () => {
    expect(resumirHorario([])).toBe('Sin horario');
  });
});
