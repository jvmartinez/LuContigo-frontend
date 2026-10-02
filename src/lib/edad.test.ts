import { edadEnAnios, textoEdad } from './edad';

describe('edad', () => {
  const hoy = new Date(2026, 9, 5); // 5 de octubre de 2026

  it('cuenta años cumplidos', () => {
    expect(edadEnAnios('1985-04-12', hoy)).toBe(41);
  });

  it('no suma el año antes del cumpleaños', () => {
    expect(edadEnAnios('1990-10-06', hoy)).toBe(35);
    expect(edadEnAnios('1990-10-05', hoy)).toBe(36);
  });

  it('maneja recién nacidos y el 29 de febrero', () => {
    expect(edadEnAnios('2026-09-01', hoy)).toBe(0);
    expect(edadEnAnios('2024-02-29', new Date(2025, 1, 28))).toBe(0);
    expect(edadEnAnios('2024-02-29', new Date(2025, 2, 1))).toBe(1);
  });

  it('escribe la edad en texto', () => {
    expect(textoEdad('2025-10-01', hoy)).toBe('1 año');
    expect(textoEdad('2016-02-03', hoy)).toBe('10 años');
  });
});
