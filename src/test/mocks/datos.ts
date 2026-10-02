import type {
  Asignacion,
  Ausencia,
  BloqueHorario,
  Consulta,
  Consultorio,
  Especialidad,
  Paciente,
  SignosVitales,
} from '@/api/tipos';
import { hoyEn, instanteLocal, sumarDias } from '@/lib/fechas';
import type { CanalOrigen, EstadoCita, EstadoTarea, Rol } from '@/shared/enums';

/**
 * Datos de demostración para MSW, calcados del seed del backend (clínica demo, 3 médicos,
 * 2 enfermeras, recepción, admin y 12 pacientes). Solo para pruebas y `npm run dev:mock`:
 * todos los nombres son ficticios.
 */

export const ZONA = 'America/Bogota';
export const CONTRASENA_DEMO = 'Demo2026medicita';

export interface UsuarioMock {
  id: string;
  email: string;
  rol: Rol;
  activo: boolean;
  personalId?: string;
  pacienteId?: string;
}

export interface PersonalMock {
  id: string;
  usuarioId: string;
  nombre: string;
  especialidadId: string | null;
  licencia: string | null;
  consultorioId: string | null;
}

export interface CitaMock {
  id: string;
  pacienteId: string;
  medicoId: string;
  consultorioId: string;
  inicio: string;
  fin: string;
  estado: EstadoCita;
  motivo: string | null;
  canalOrigen: CanalOrigen;
  motivoCancelacion: string | null;
  historial: { de: EstadoCita | null; a: EstadoCita; usuarioId: string | null; fecha: string }[];
}

export interface TareaMock {
  id: string;
  citaId: string;
  enfermeraId: string;
  tipo: string;
  detalle: string | null;
  estado: EstadoTarea;
  creadaEn: string;
  completadaEn: string | null;
}

export interface Db {
  ahora: Date;
  hoy: string;
  clinica: {
    id: string;
    nombre: string;
    direccion: string;
    telefono: string;
    zonaHoraria: string;
    pais: string;
  };
  usuarios: UsuarioMock[];
  personal: PersonalMock[];
  especialidades: Especialidad[];
  consultorios: Consultorio[];
  horarios: Record<string, BloqueHorario[]>;
  ausencias: Record<string, Ausencia[]>;
  asignaciones: Asignacion[];
  pacientes: Paciente[];
  citas: CitaMock[];
  signos: Record<string, SignosVitales>;
  consultas: Record<string, Consulta>;
  tareas: TareaMock[];
  auditoria: {
    id: string;
    usuarioId: string | null;
    accion: string;
    entidad: string;
    entidadId: string | null;
    pacienteId: string | null;
    ip: string | null;
    fecha: string;
  }[];
  /** Enlaces de recordatorio: token → cita. */
  confirmaciones: Record<string, { citaId: string; usado: boolean }>;
  secuencia: number;
}

let n = 0;
export const nuevoId = (prefijo: string) => `${prefijo}_${(++n).toString(36).padStart(4, '0')}`;

export function crearDb(ahora: Date = new Date()): Db {
  n = 0;
  const hoy = hoyEn(ZONA, ahora);
  const en = (fecha: string, hora: string) => instanteLocal(fecha, hora, ZONA).toISOString();

  const especialidades: Especialidad[] = [
    { id: 'esp_general', nombre: 'Medicina general', duracionCitaMin: 30 },
    { id: 'esp_pediatria', nombre: 'Pediatría', duracionCitaMin: 30 },
    { id: 'esp_cardio', nombre: 'Cardiología', duracionCitaMin: 40 },
  ];
  const consultorios: Consultorio[] = [
    {
      id: 'con_1',
      nombre: 'Consultorio 1',
      activo: true,
      especialidadId: 'esp_general',
      especialidad: { id: 'esp_general', nombre: 'Medicina general' },
    },
    {
      id: 'con_2',
      nombre: 'Consultorio 2',
      activo: true,
      especialidadId: 'esp_pediatria',
      especialidad: { id: 'esp_pediatria', nombre: 'Pediatría' },
    },
    {
      id: 'con_3',
      nombre: 'Consultorio 3',
      activo: true,
      especialidadId: 'esp_cardio',
      especialidad: { id: 'esp_cardio', nombre: 'Cardiología' },
    },
  ];

  const staff: [string, string, Rol, string, string | null, string | null][] = [
    [
      'per_med1',
      'medico.general@demo.medicita.app',
      'MEDICO',
      'Dra. Ana Torres',
      'esp_general',
      'con_1',
    ],
    [
      'per_med2',
      'pediatra@demo.medicita.app',
      'MEDICO',
      'Dr. Luis Paredes',
      'esp_pediatria',
      'con_2',
    ],
    [
      'per_med3',
      'cardiologo@demo.medicita.app',
      'MEDICO',
      'Dra. Carmen Ruiz',
      'esp_cardio',
      'con_3',
    ],
    ['per_enf1', 'enfermera1@demo.medicita.app', 'ENFERMERA', 'Enf. Rosa Díaz', null, null],
    ['per_enf2', 'enfermera2@demo.medicita.app', 'ENFERMERA', 'Enf. Marta Gil', null, null],
    ['per_rec', 'recepcion@demo.medicita.app', 'RECEPCION', 'Julia Recepción', null, null],
    ['per_adm', 'admin@demo.medicita.app', 'ADMIN', 'Admin Demo', null, null],
  ];
  const usuarios: UsuarioMock[] = staff.map(([per, email, rol]) => ({
    id: `usu_${per.slice(4)}`,
    email,
    rol,
    activo: true,
    personalId: per,
  }));
  const personal: PersonalMock[] = staff.map(([per, , rol, nombre, esp, con]) => ({
    id: per,
    usuarioId: `usu_${per.slice(4)}`,
    nombre,
    especialidadId: esp,
    licencia: rol === 'MEDICO' ? `RM-${per.slice(-1)}2345` : null,
    consultorioId: con,
  }));

  const horarios: Record<string, BloqueHorario[]> = {};
  for (const p of personal) {
    horarios[p.id] = [1, 2, 3, 4, 5, 6, 7].flatMap((diaSemana) => [
      { diaSemana, horaInicio: '08:00', horaFin: '12:00' },
      { diaSemana, horaInicio: '14:00', horaFin: '18:00' },
    ]);
  }

  const nombres = [
    ['María José', 'Rojas Díaz', '1985-04-12', 'Penicilina'],
    ['Carlos', 'Gómez Pérez', '1972-09-30', null],
    ['Lucía', 'Fernández Soto', '2016-02-03', 'Ibuprofeno'],
    ['Andrés', 'Martínez Luna', '1990-11-21', null],
    ['Sofía', 'Herrera Vega', '1968-06-14', null],
    ['Jorge', 'Castro Ríos', '1955-01-08', 'Sulfas'],
    ['Valentina', 'Morales Pinto', '2019-07-19', null],
    ['Diego', 'Navarro Cruz', '1981-03-27', null],
    ['Camila', 'Ortega Ramos', '1999-12-02', null],
    ['Felipe', 'Silva Mora', '1963-08-15', null],
    ['Paula', 'Reyes Campos', '1993-05-09', 'Látex'],
    ['Tomás', 'Vargas León', '1977-10-25', null],
  ] as const;
  const pacientes: Paciente[] = nombres.map(([nom, ape, nac, alergia], i) => ({
    id: `pac_${String(i + 1).padStart(2, '0')}`,
    nombres: nom,
    apellidos: ape,
    documento: String(1032456700 + i),
    fechaNacimiento: nac,
    telefono: `+57300123${String(4500 + i)}`,
    email: `paciente${i + 1}@example.com`,
    alergias: alergia,
    antecedentes: i % 3 === 0 ? 'Hipertensión arterial' : null,
    seguro: null,
    canalPreferido: null,
    tieneAccesoPortal: i === 0,
    consentimientoEn: new Date(ahora.getTime() - 86_400_000 * 30).toISOString(),
  }));
  usuarios.push({
    id: 'usu_pac1',
    email: 'paciente@demo.medicita.app',
    rol: 'PACIENTE',
    activo: true,
    pacienteId: 'pac_01',
  });

  const cita = (
    pacienteId: string,
    medicoId: string,
    fecha: string,
    hora: string,
    estado: EstadoCita,
    motivo: string | null = null,
  ): CitaMock => {
    const med = personal.find((p) => p.id === medicoId)!;
    const dur = especialidades.find((e) => e.id === med.especialidadId)!.duracionCitaMin;
    const inicio = en(fecha, hora);
    return {
      id: nuevoId('cit'),
      pacienteId,
      medicoId,
      consultorioId: med.consultorioId!,
      inicio,
      fin: new Date(new Date(inicio).getTime() + dur * 60_000).toISOString(),
      estado,
      motivo,
      canalOrigen: 'RECEPCION',
      motivoCancelacion: estado === 'CANCELADA' ? 'El paciente tuvo un imprevisto' : null,
      historial: [
        {
          de: null,
          a: 'PROGRAMADA',
          usuarioId: 'usu_rec',
          fecha: new Date(ahora.getTime() - 86_400_000 * 3).toISOString(),
        },
      ],
    };
  };

  const ayer = sumarDias(hoy, -1);
  const manana = sumarDias(hoy, 1);
  const citas: CitaMock[] = [
    cita('pac_02', 'per_med1', hoy, '08:00', 'ATENDIDA', 'Control de presión arterial'),
    cita('pac_01', 'per_med1', hoy, '08:30', 'EN_CONSULTA', 'Dolor de cabeza recurrente'),
    cita('pac_04', 'per_med1', hoy, '09:00', 'LISTA', 'Chequeo general'),
    cita('pac_05', 'per_med1', hoy, '09:30', 'EN_ESPERA', 'Tos persistente'),
    cita('pac_08', 'per_med1', hoy, '10:00', 'CONFIRMADA', null),
    cita('pac_09', 'per_med1', hoy, '10:30', 'PROGRAMADA', 'Resultados de laboratorio'),
    cita('pac_10', 'per_med1', hoy, '11:00', 'CANCELADA', null),
    cita('pac_03', 'per_med2', hoy, '08:00', 'EN_ESPERA', 'Fiebre'),
    cita('pac_07', 'per_med2', hoy, '09:00', 'PROGRAMADA', 'Control de niño sano'),
    cita('pac_06', 'per_med3', hoy, '08:00', 'NO_ASISTIO', 'Arritmia'),
    cita('pac_12', 'per_med3', hoy, '09:20', 'CONFIRMADA', 'Control cardiológico'),
    cita('pac_01', 'per_med1', ayer, '09:00', 'ATENDIDA', 'Gripe'),
    cita('pac_01', 'per_med2', manana, '10:00', 'PROGRAMADA', 'Revisión'),
    cita('pac_11', 'per_med1', manana, '08:00', 'PROGRAMADA', null),
  ];

  const signos: Record<string, SignosVitales> = {};
  const conSignos = (c: CitaMock, s: Partial<SignosVitales>, alertas: string[]) => {
    signos[c.id] = {
      id: nuevoId('sig'),
      citaId: c.id,
      enfermeraId: 'per_enf1',
      presionSistolica: null,
      presionDiastolica: null,
      frecuenciaCardiaca: null,
      temperatura: null,
      spo2: null,
      pesoKg: null,
      tallaCm: null,
      imc: null,
      nota: null,
      alertas,
      tomadoEn: c.inicio,
      ...s,
    };
  };
  conSignos(
    citas[1],
    {
      presionSistolica: 145,
      presionDiastolica: 92,
      frecuenciaCardiaca: 88,
      temperatura: 36.8,
      spo2: 97,
      pesoKg: 68,
      tallaCm: 162,
      imc: 25.9,
    },
    ['PRESION_ALTA'],
  );
  conSignos(
    citas[2],
    {
      presionSistolica: 118,
      presionDiastolica: 76,
      frecuenciaCardiaca: 70,
      temperatura: 36.5,
      spo2: 98,
    },
    [],
  );
  conSignos(citas[11], { presionSistolica: 122, presionDiastolica: 80, temperatura: 38.4 }, [
    'FIEBRE',
  ]);

  const consultas: Record<string, Consulta> = {};
  const cerrada = (c: CitaMock, diagnostico: string, tratamiento: string, indicaciones: string) => {
    consultas[c.id] = {
      id: nuevoId('cns'),
      citaId: c.id,
      pacienteId: c.pacienteId,
      medicoId: c.medicoId,
      motivo: c.motivo,
      examenFisico: 'Sin hallazgos relevantes',
      diagnostico,
      cie10: null,
      tratamiento,
      indicaciones,
      cerradaEn: c.fin,
      actualizadaEn: c.fin,
    };
  };
  cerrada(
    citas[0],
    'Hipertensión arterial controlada',
    'Losartán 50 mg cada 24 h',
    'Dieta baja en sal y caminar 30 minutos al día.',
  );
  cerrada(
    citas[11],
    'Infección respiratoria alta',
    'Acetaminofén 500 mg cada 8 h por 3 días',
    'Reposo, líquidos abundantes y volver si la fiebre dura más de 3 días.',
  );

  const asignaciones: Asignacion[] = (['MANANA', 'TARDE'] as const).flatMap((turno) => [
    {
      id: nuevoId('asg'),
      fecha: hoy,
      turno,
      medico: { id: 'per_med1', nombre: 'Dra. Ana Torres', especialidad: 'Medicina general' },
      enfermera: { id: 'per_enf1', nombre: 'Enf. Rosa Díaz' },
    },
    {
      id: nuevoId('asg'),
      fecha: hoy,
      turno,
      medico: { id: 'per_med2', nombre: 'Dr. Luis Paredes', especialidad: 'Pediatría' },
      enfermera: { id: 'per_enf1', nombre: 'Enf. Rosa Díaz' },
    },
    {
      id: nuevoId('asg'),
      fecha: hoy,
      turno,
      medico: { id: 'per_med3', nombre: 'Dra. Carmen Ruiz', especialidad: 'Cardiología' },
      enfermera: { id: 'per_enf2', nombre: 'Enf. Marta Gil' },
    },
  ]);

  const tareas: TareaMock[] = [
    {
      id: nuevoId('tar'),
      citaId: citas[0].id,
      enfermeraId: 'per_enf1',
      tipo: 'Control de signos vitales',
      detalle: 'Tomar presión antes de salir',
      estado: 'PENDIENTE',
      creadaEn: citas[0].fin,
      completadaEn: null,
    },
  ];

  return {
    ahora,
    hoy,
    clinica: {
      id: 'cli_demo',
      nombre: 'Clínica Demo MediCita',
      direccion: 'Calle 100 # 15-20, Bogotá',
      telefono: '+576012345678',
      zonaHoraria: ZONA,
      pais: 'CO',
    },
    usuarios,
    personal,
    especialidades,
    consultorios,
    horarios,
    ausencias: {},
    asignaciones,
    pacientes,
    citas,
    signos,
    consultas,
    tareas,
    auditoria: [],
    confirmaciones: { 'enlace-demo': { citaId: citas[12].id, usado: false } },
    secuencia: 0,
  };
}
