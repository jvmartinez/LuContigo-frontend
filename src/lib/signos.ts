import { ALERTAS, calcularAlertas, calcularImc, RANGOS_SIGNOS } from '@/shared/signos-vitales';

export { calcularAlertas, calcularImc, RANGOS_SIGNOS };

export type CampoSigno = keyof typeof RANGOS_SIGNOS;
export type NivelSigno = 'normal' | 'alerta' | 'fuera-de-rango';

export const ETIQUETA_ALERTA: Record<string, string> = {
  [ALERTAS.PRESION_ALTA]: 'Presión alta',
  [ALERTAS.TAQUICARDIA]: 'Taquicardia',
  [ALERTAS.FIEBRE]: 'Fiebre',
  [ALERTAS.SATURACION_BAJA]: 'Saturación baja',
};

export const etiquetaAlerta = (codigo: string) => ETIQUETA_ALERTA[codigo] ?? codigo;

/** Interpreta la presión escrita como "120/80". `null` si está vacía. */
export function leerPresion(
  texto: string,
): { sistolica: number; diastolica: number } | null | 'invalida' {
  const limpio = texto.replace(/\s/g, '');
  if (!limpio) return null;
  const m = /^(\d{2,3})\/(\d{2,3})$/.exec(limpio);
  if (!m) return 'invalida';
  return { sistolica: Number(m[1]), diastolica: Number(m[2]) };
}

export function fueraDeRango(campo: CampoSigno, valor: number): boolean {
  const [min, max] = RANGOS_SIGNOS[campo];
  return valor < min || valor > max;
}

/**
 * Nivel de un valor para pintarlo: rojo si está fuera del rango aceptado o si dispara una
 * alerta clínica (umbrales de BACKEND.md §8.4, los mismos que usa `calcularAlertas`).
 */
export function nivelSigno(
  campo: CampoSigno,
  valor: number | undefined,
  edadAnios: number,
): NivelSigno {
  if (valor === undefined || Number.isNaN(valor)) return 'normal';
  if (fueraDeRango(campo, valor)) return 'fuera-de-rango';
  const alerta = (() => {
    switch (campo) {
      case 'presionSistolica':
        return valor >= 140;
      case 'presionDiastolica':
        return valor >= 90;
      case 'frecuenciaCardiaca':
        return edadAnios > 12 && valor > 100;
      case 'temperatura':
        return valor >= 38;
      case 'spo2':
        return valor < 94;
      default:
        return false;
    }
  })();
  return alerta ? 'alerta' : 'normal';
}

export function categoriaImc(imc: number): string {
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25) return 'Normal';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidad';
}
