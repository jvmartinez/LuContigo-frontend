import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  HeartPulse,
  ListChecks,
  ScrollText,
  Stethoscope,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Rol } from '@/shared/enums';

export interface EntradaMenu {
  a: string;
  texto: string;
  icono: LucideIcon;
  /** Solo activo en la ruta exacta (no en sus hijas). */
  exacta?: boolean;
}

/** Menú lateral por rol (§1). */
export const MENU: Record<Rol, EntradaMenu[]> = {
  RECEPCION: [
    { a: '/agenda', texto: 'Agenda', icono: CalendarDays },
    { a: '/pacientes', texto: 'Pacientes', icono: Users },
  ],
  ENFERMERA: [{ a: '/enfermeria', texto: 'Sala de espera', icono: HeartPulse }],
  MEDICO: [{ a: '/consultorio', texto: 'Pacientes de hoy', icono: Stethoscope }],
  PACIENTE: [
    { a: '/mis-citas', texto: 'Mis citas', icono: CalendarDays, exacta: true },
    { a: '/mis-citas/nueva', texto: 'Solicitar cita', icono: CalendarPlus },
    { a: '/mis-indicaciones', texto: 'Mis indicaciones', icono: ClipboardList },
  ],
  ADMIN: [
    { a: '/admin/panel', texto: 'Indicadores', icono: BarChart3 },
    { a: '/admin/personal', texto: 'Personal', icono: UserCog },
    { a: '/admin/asignaciones', texto: 'Asignaciones', icono: ListChecks },
    { a: '/admin/consultorios', texto: 'Consultorios', icono: Building2 },
    { a: '/admin/bitacora', texto: 'Bitácora', icono: ScrollText },
  ],
};
