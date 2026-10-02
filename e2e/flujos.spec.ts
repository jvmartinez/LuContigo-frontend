import { expect, test } from '@playwright/test';
import {
  clienteApi,
  CUENTAS,
  entrar,
  firmarEnlace,
  horaEnClinica,
  hoyEnClinica,
  MEDICO_GENERAL,
  PACIENTE_PORTAL,
  primerHueco,
} from './utilidades';

/** FRONTEND.md §9: E2E contra la API con el seed. */

test('1. recepción agenda → llegada → enfermera toma signos → médico cierra → el paciente ve la indicación', async ({
  browser,
}) => {
  const api = await clienteApi(CUENTAS.recepcion);
  const medicos = await api.get<{ id: string; nombre: string }[]>('medicos');
  const medico = medicos.find((m) => m.nombre === MEDICO_GENERAL)!;
  const hueco = await primerHueco(api, medico.id, hoyEnClinica());
  await api.cerrar();
  test.skip(
    !hueco,
    `${MEDICO_GENERAL} no tiene huecos libres hoy (la cola de enfermería es del día).`,
  );
  const hora = horaEnClinica(hueco!);
  const indicacion = `Caminar 30 minutos al día (e2e ${Date.now()})`;

  // Recepción agenda desde la celda libre y registra la llegada.
  const recepcion = await (await browser.newContext()).newPage();
  await entrar(recepcion, CUENTAS.recepcion, /\/agenda$/);
  await recepcion
    .getByRole('button', { name: `${hora}, ${MEDICO_GENERAL}: libre. Agendar cita` })
    .click();
  const panel = recepcion.getByRole('dialog', { name: 'Nueva cita' });
  await expect(panel.getByLabel('Hora libre')).toHaveValue(hueco!);
  await panel.getByLabel('Paciente').fill(PACIENTE_PORTAL.busqueda);
  await panel.getByRole('button', { name: /Rojas Díaz, Ana María/ }).click();
  await panel.getByLabel(/Motivo/).fill('Control e2e');
  await panel.getByRole('button', { name: 'Agendar cita' }).click();
  await expect(recepcion.getByText('Cita agendada', { exact: true })).toBeVisible();
  const detalle = recepcion.getByRole('dialog', { name: PACIENTE_PORTAL.nombre });
  await detalle.getByRole('button', { name: 'Registrar llegada' }).click();
  await expect(
    recepcion.getByText('Llegada registrada: el paciente pasó a sala de espera', { exact: true }),
  ).toBeVisible();
  const citaId = new URL(recepcion.url()).searchParams.get('cita')!;
  expect(citaId).toBeTruthy();

  // Enfermería toma los signos.
  const enfermera = await (await browser.newContext()).newPage();
  await entrar(enfermera, CUENTAS.enfermera, /\/enfermeria$/);
  await enfermera.goto(`/enfermeria/triaje/${citaId}`);
  await expect(enfermera.getByRole('note', { name: /Alergias: Penicilina/ })).toBeVisible();
  await enfermera.getByLabel('Presión arterial (mmHg)').fill('125/82');
  await enfermera.getByLabel('Temperatura (°C)').fill('36.6');
  await enfermera.getByLabel('Peso (kg)').fill('64');
  await enfermera.getByLabel('Talla (cm)').fill('162');
  await enfermera.getByRole('button', { name: /Guardar signos/ }).click();
  await expect(enfermera).toHaveURL(/\/enfermeria$/);

  // El médico inicia, escribe la nota y la cierra.
  const medicoPagina = await (await browser.newContext()).newPage();
  await entrar(medicoPagina, CUENTAS.medico, /\/consultorio$/);
  await medicoPagina.goto(`/consultorio/${citaId}`);
  await expect(medicoPagina.getByText('125/82')).toBeVisible();
  await medicoPagina.getByRole('button', { name: 'Iniciar consulta' }).click();
  await medicoPagina.getByLabel('Diagnóstico').fill('Paciente sano');
  await medicoPagina.getByLabel('Tratamiento').fill('Ninguno');
  await medicoPagina.getByLabel('Indicaciones para el paciente').fill(indicacion);
  await medicoPagina.getByRole('button', { name: 'Finalizar y guardar en historial' }).click();
  await medicoPagina
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Finalizar consulta' })
    .click();
  await expect(medicoPagina.getByText('Consulta finalizada', { exact: true })).toBeVisible();

  // El paciente ve la indicación en su portal.
  const paciente = await (await browser.newContext()).newPage();
  await entrar(paciente, CUENTAS.paciente, /\/mis-citas$/);
  await paciente.getByRole('link', { name: 'Mis indicaciones' }).first().click();
  await expect(paciente.getByText(indicacion)).toBeVisible();
});

test('2. el paciente cancela desde /c/:token y el horario aparece libre en la agenda', async ({
  browser,
}) => {
  const api = await clienteApi(CUENTAS.recepcion);
  const yo = await api.get<{ clinica: { id: string } }>('auth/yo');
  const medico = (await api.get<{ id: string; nombre: string }[]>('medicos')).find(
    (m) => m.nombre === MEDICO_GENERAL,
  )!;
  const paciente = (
    await api.get<{ items: { id: string }[] }>(
      `pacientes?q=${encodeURIComponent(PACIENTE_PORTAL.busqueda)}`,
    )
  ).items[0];

  // Busca el primer hueco en los próximos días hábiles.
  let fecha = '';
  let inicio: string | null = null;
  for (let d = 1; d <= 7 && !inicio; d++) {
    fecha = hoyEnClinica(d);
    inicio = await primerHueco(api, medico.id, fecha);
  }
  expect(inicio, 'hueco libre en la próxima semana').toBeTruthy();
  const cita = await api.post<{ id: string; inicio: string }>('citas', {
    pacienteId: paciente.id,
    medicoId: medico.id,
    inicio,
    motivo: 'Cita para cancelar (e2e)',
  });
  await api.cerrar();
  const hora = horaEnClinica(cita.inicio);

  // Enlace del recordatorio, sin sesión.
  const publica = await (await browser.newContext()).newPage();
  await publica.goto(`/c/${firmarEnlace(cita.id, yo.clinica.id, cita.inicio)}`);
  await expect(publica.getByRole('heading', { name: 'Hola, Ana María' })).toBeVisible();
  await publica.getByRole('button', { name: 'Cancelar cita' }).click();
  await publica.getByRole('alertdialog').getByRole('button', { name: 'Sí, cancelar' }).click();
  await expect(publica.getByRole('heading', { name: 'Tu cita fue cancelada' })).toBeVisible();

  // En la agenda de recepción el horario vuelve a estar libre.
  const recepcion = await (await browser.newContext()).newPage();
  await entrar(recepcion, CUENTAS.recepcion, /\/agenda$/);
  await recepcion.goto(`/agenda?fecha=${fecha}`);
  await expect(
    recepcion.getByRole('button', { name: `${hora}, ${MEDICO_GENERAL}: libre. Agendar cita` }),
  ).toBeVisible();
});

test('3. una enfermera no puede abrir /consultorio @tableta', async ({ page }) => {
  await entrar(page, CUENTAS.enfermera, /\/enfermeria$/);
  await page.goto('/consultorio');
  await expect(
    page.getByRole('heading', { name: 'No tienes acceso a esta pantalla' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/consultorio$/);
});

test('la agenda funciona a 400 px sin scroll horizontal de la página', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await entrar(page, CUENTAS.recepcion, /\/agenda$/);
  await expect(page.getByRole('region', { name: 'Agenda del día por médico' })).toBeVisible();
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(0);
});
