/**
 * Tipos de las respuestas de la API. La especificación OpenAPI del backend documenta las
 * entradas (esquemas Zod) pero no las salidas, así que estas formas se escriben a mano a partir
 * de los serializadores de `LuContigo-backend/src/modules/**`. Las entradas vienen de `@/shared`.
 */
import type {
  CanalOrigen,
  CanalRecordatorio,
  EstadoCita,
  EstadoTarea,
  Rol,
  Turno,
} from '@/shared/enums';

export type { CanalOrigen, CanalRecordatorio, EstadoCita, EstadoTarea, Rol, Turno };

export interface Pagina<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// ─── Autenticación ──────────────────────────────────────────────────────────

export interface RespuestaLogin {
  accessToken: string;
  /** Segundos de vida del access token. */
  expiraEn: number;
}

export interface Sesion {
  id: string;
  email: string;
  rol: Rol;
  clinica: { id: string; nombre: string; zonaHoraria: string; pais: string };
  personal: {
    id: string;
    nombre: string;
    especialidad: string | null;
    consultorio: string | null;
  } | null;
  paciente: {
    id: string;
    nombres: string;
    apellidos: string;
    canalPreferido: CanalRecordatorio | null;
  } | null;
}

// ─── Citas ──────────────────────────────────────────────────────────────────

export interface Cita {
  id: string;
  estado: EstadoCita;
  inicio: string;
  fin: string;
  motivo: string | null;
  canalOrigen: CanalOrigen;
  motivoCancelacion: string | null;
  pacienteId: string;
  paciente: { id: string; nombres: string; apellidos: string; documento: string };
  medico: { id: string; nombre: string; especialidad: string | null };
  consultorio: { id: string; nombre: string };
  recordatorio: { programadoPara: string; estado: string; canal: CanalRecordatorio } | null;
}

export interface CitaDetalle extends Cita {
  historialEstados: {
    de: EstadoCita | null;
    a: EstadoCita;
    usuarioId: string | null;
    fecha: string;
  }[];
}

export interface CitaCreada extends Cita {
  recordatorioProgramadoPara: string | null;
}

export interface Agenda {
  fecha: string;
  citas: Cita[];
}

export interface Disponibilidad {
  medicoId: string;
  duracionMin: number;
  huecos: { inicio: string; fin: string }[];
}

export interface MisCitas {
  proximas: Cita[];
  pasadas: Cita[];
}

export interface ConfirmacionPublica {
  cita: {
    id: string;
    estado: EstadoCita;
    inicio: string;
    fin: string;
    paciente: string;
    medico: string;
    especialidad: string | null;
    consultorio: string;
    clinica: {
      nombre: string;
      direccion: string | null;
      telefono: string | null;
      zonaHoraria: string;
    };
  };
  accionesDisponibles: ('confirmar' | 'cancelar')[];
}

export interface ResultadoConfirmacion {
  estado: EstadoCita;
  inicio: string;
}

// ─── Pacientes ──────────────────────────────────────────────────────────────

export interface PacienteResumen {
  id: string;
  nombres: string;
  apellidos: string;
  documento: string;
  fechaNacimiento: string;
  telefono: string | null;
}

export interface Paciente extends PacienteResumen {
  email: string | null;
  alergias: string | null;
  antecedentes: string | null;
  seguro: string | null;
  canalPreferido: CanalRecordatorio | null;
  tieneAccesoPortal: boolean;
  consentimientoEn: string;
}

export interface SignosVitales {
  id: string;
  citaId: string;
  enfermeraId: string;
  presionSistolica: number | null;
  presionDiastolica: number | null;
  frecuenciaCardiaca: number | null;
  temperatura: number | null;
  spo2: number | null;
  pesoKg: number | null;
  tallaCm: number | null;
  imc: number | null;
  nota: string | null;
  alertas: string[];
  tomadoEn: string;
}

export interface NotaConsulta {
  id: string;
  motivo: string | null;
  examenFisico: string | null;
  diagnostico: string | null;
  cie10: string | null;
  tratamiento: string | null;
  indicaciones: string | null;
  cerradaEn: string | null;
}

export interface Consulta extends NotaConsulta {
  citaId: string;
  pacienteId: string;
  medicoId: string;
  actualizadaEn: string;
}

export interface TareaHistorial {
  id: string;
  tipo: string;
  detalle: string | null;
  estado: EstadoTarea;
  enfermera: { id: string; nombre: string };
  creadaEn: string;
  completadaEn: string | null;
}

export interface EventoHistorial {
  citaId: string;
  fecha: string;
  estado: EstadoCita;
  medico: { id: string; nombre: string; especialidad: string | null };
  signosVitales: SignosVitales | null;
  consulta: NotaConsulta | null;
  tareas: TareaHistorial[];
}

export interface Historial {
  pacienteId: string;
  paciente: Paciente;
  eventos: EventoHistorial[];
}

export interface Indicacion {
  citaId: string;
  fecha: string;
  medico: string;
  especialidad: string | null;
  indicaciones: string | null;
}

// ─── Enfermería ─────────────────────────────────────────────────────────────

export interface CitaEnCola {
  id: string;
  pacienteId: string;
  estado: Extract<EstadoCita, 'EN_ESPERA' | 'LISTA'>;
  inicio: string;
  llegadaEn: string | null;
  paciente: {
    id: string;
    nombres: string;
    apellidos: string;
    edad: number;
    alergias: string | null;
  };
  medico: { id: string; nombre: string };
  consultorio: { id: string; nombre: string };
  alertas: string[];
}

export interface Cola {
  fecha: string;
  citas: CitaEnCola[];
}

export interface Tarea {
  id: string;
  tipo: string;
  detalle: string | null;
  estado: EstadoTarea;
  creadaEn: string;
  completadaEn: string | null;
  citaId: string;
  medico: { id: string; nombre: string };
  paciente: { id: string; nombres: string; apellidos: string };
}

export interface TareaCreada {
  id: string;
  citaId: string;
  pacienteId: string;
  tipo: string;
  detalle: string | null;
  estado: EstadoTarea;
  enfermera: { id: string; nombre: string };
  creadaEn: string;
}

// ─── Personal y clínica ─────────────────────────────────────────────────────

export interface Clinica {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  zonaHoraria: string;
  pais: string;
}

export interface Especialidad {
  id: string;
  nombre: string;
  duracionCitaMin: number;
}

export interface Consultorio {
  id: string;
  nombre: string;
  activo: boolean;
  especialidadId: string | null;
  especialidad?: { id: string; nombre: string } | null;
}

export interface Medico {
  id: string;
  nombre: string;
  especialidad: Especialidad | null;
}

export interface MiembroPersonal {
  id: string;
  nombre: string;
  email: string;
  rol: Exclude<Rol, 'PACIENTE'>;
  activo: boolean;
  licencia: string | null;
  especialidad: { id: string; nombre: string } | null;
  consultorio: { id: string; nombre: string } | null;
}

export interface BloqueHorario {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface Horarios {
  personalId: string;
  bloques: BloqueHorario[];
}

export interface Ausencia {
  id: string;
  desde: string;
  hasta: string;
  motivo: string | null;
}

export interface AusenciaCreada {
  ausencia: Ausencia;
  citasAfectadas: Cita[];
}

export interface Asignacion {
  id: string;
  fecha: string;
  turno: Turno;
  medico: { id: string; nombre: string; especialidad: string | null };
  enfermera: { id: string; nombre: string };
}

// ─── Indicadores y auditoría ────────────────────────────────────────────────

export interface Indicadores {
  desde: string;
  hasta: string;
  citas: number;
  porEstado: Partial<Record<EstadoCita, number>>;
  atendidas: number;
  cancelaciones: number;
  noAsistio: number;
  /** Porcentaje con un decimal. */
  tasaInasistencia: number;
  tasaCancelacion: number;
  ocupacionPorMedico: {
    medicoId: string;
    nombre: string;
    minutosDisponibles: number;
    minutosAgendados: number;
    ocupacion: number;
  }[];
}

export interface RegistroAuditoria {
  id: string;
  usuarioId: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  pacienteId: string | null;
  ip: string | null;
  fecha: string;
}
