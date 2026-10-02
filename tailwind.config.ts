import type { Config } from 'tailwindcss';

/**
 * Los colores salen de `src/styles/tokens.css`; el tema oscuro redefine las variables.
 * `color-mix` permite los modificadores de opacidad (`border-crit/40`) sobre tokens hex.
 */
const color = (nombre: string) =>
  `color-mix(in srgb, var(--${nombre}) calc(<alpha-value> * 100%), transparent)`;
const token = (nombre: string) => `var(--${nombre})`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: color('bg'),
        surface: color('surface'),
        'surface-2': color('surface-2'),
        ink: color('ink'),
        muted: color('muted'),
        line: color('line'),
        accent: { DEFAULT: color('accent'), soft: color('accent-soft'), ink: color('accent-ink') },
        good: { DEFAULT: color('good'), soft: color('good-soft') },
        warn: { DEFAULT: color('warn'), soft: color('warn-soft') },
        crit: { DEFAULT: color('crit'), soft: color('crit-soft') },
        info: { DEFAULT: color('info'), soft: color('info-soft') },
      },
      fontFamily: {
        display: token('font-display'),
        sans: token('font-body'),
        mono: token('font-mono'),
      },
      borderColor: { DEFAULT: color('line') },
      ringColor: { DEFAULT: color('accent') },
      minHeight: { tap: '44px' },
      minWidth: { tap: '44px' },
      keyframes: {
        'entrar-derecha': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        aparecer: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'entrar-derecha': 'entrar-derecha 180ms ease-out',
        aparecer: 'aparecer 150ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
