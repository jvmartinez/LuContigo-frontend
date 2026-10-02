import {
  calcularAlertas,
  calcularImc,
  categoriaImc,
  etiquetaAlerta,
  leerPresion,
  nivelSigno,
} from './signos';

describe('IMC', () => {
  it('se calcula con un decimal', () => {
    expect(calcularImc(72.5, 168)).toBe(25.7);
    expect(calcularImc(30, 135)).toBe(16.5);
  });

  it('es null si falta peso o talla', () => {
    expect(calcularImc(undefined, 168)).toBeNull();
    expect(calcularImc(70, undefined)).toBeNull();
  });

  it('se clasifica', () => {
    expect(categoriaImc(17)).toBe('Bajo peso');
    expect(categoriaImc(22)).toBe('Normal');
    expect(categoriaImc(27)).toBe('Sobrepeso');
    expect(categoriaImc(31)).toBe('Obesidad');
  });
});

describe('presión arterial escrita como 120/80', () => {
  it.each([
    ['120/80', { sistolica: 120, diastolica: 80 }],
    [' 145 / 92 ', { sistolica: 145, diastolica: 92 }],
    ['', null],
    ['120', 'invalida'],
    ['120-80', 'invalida'],
    ['1200/80', 'invalida'],
  ])('%s', (texto, esperado) => {
    expect(leerPresion(texto)).toEqual(esperado);
  });
});

describe('alertas de signos (BACKEND.md §8.4)', () => {
  it('marca presión alta por sistólica o diastólica', () => {
    expect(calcularAlertas({ presionSistolica: 140, presionDiastolica: 80 }, 40)).toEqual([
      'PRESION_ALTA',
    ]);
    expect(calcularAlertas({ presionSistolica: 130, presionDiastolica: 90 }, 40)).toEqual([
      'PRESION_ALTA',
    ]);
    expect(calcularAlertas({ presionSistolica: 139, presionDiastolica: 89 }, 40)).toEqual([]);
  });

  it('solo marca taquicardia en mayores de 12 años', () => {
    expect(calcularAlertas({ frecuenciaCardiaca: 110 }, 30)).toEqual(['TAQUICARDIA']);
    expect(calcularAlertas({ frecuenciaCardiaca: 110 }, 8)).toEqual([]);
  });

  it('marca fiebre y saturación baja', () => {
    expect(calcularAlertas({ temperatura: 38, spo2: 93 }, 30)).toEqual([
      'FIEBRE',
      'SATURACION_BAJA',
    ]);
  });

  it('pinta cada campo según su nivel', () => {
    expect(nivelSigno('temperatura', 36.5, 30)).toBe('normal');
    expect(nivelSigno('temperatura', 38.2, 30)).toBe('alerta');
    expect(nivelSigno('temperatura', 43, 30)).toBe('fuera-de-rango');
    expect(nivelSigno('frecuenciaCardiaca', 120, 10)).toBe('normal');
    expect(nivelSigno('spo2', 90, 30)).toBe('alerta');
    expect(nivelSigno('pesoKg', 400, 30)).toBe('fuera-de-rango');
    expect(nivelSigno('spo2', undefined, 30)).toBe('normal');
  });

  it('traduce los códigos de alerta', () => {
    expect(etiquetaAlerta('SATURACION_BAJA')).toBe('Saturación baja');
    expect(etiquetaAlerta('OTRA')).toBe('OTRA');
  });
});
