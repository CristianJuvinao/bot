/**
 * reservas.js — Detección de disponibilidad y ejecución de reserva
 *
 * Las funciones aceptan la URL de reservas como parámetro (viene del panel HTML)
 * con fallback a config.RESERVAS_URL del archivo .env.
 */

import { config } from './config.js';
import { log, sleep, randomDelay } from './utils.js';

/**
 * Navega a la sección de reservas y detecta el estado del almuerzo.
 *
 * @param {import('playwright').Page} page
 * @param {string} [reservasUrl] — URL dinámica desde el panel HTML
 * @returns {Promise<{ estado: string, codigo?: string }>}
 */
export async function verificarDisponibilidad(page, reservasUrl) {
  const url = reservasUrl || config.RESERVAS_URL;
  await navegarAReservas(page, url);

  // ── Comprobar si ya hay reserva activa ────────────────────────────────────
  const yaReservado = await detectarReservaExistente(page);
  if (yaReservado) return { estado: 'ya_reservo', codigo: yaReservado };

  // ── Comprobar horario de atención ─────────────────────────────────────────
  const fueraHorario = await detectarFueraDeHorario(page);
  if (fueraHorario) return { estado: 'fuera_horario' };

  // ── Detectar disponibilidad real ──────────────────────────────────────────
  const disponible = await detectarDisponibilidad(page);
  if (disponible) return { estado: 'disponible' };

  return { estado: 'agotado' };
}

/**
 * Ejecuta la reserva cuando el almuerzo está disponible.
 *
 * @param {import('playwright').Page} page
 * @param {string} [reservasUrl]
 * @returns {Promise<{ ok: boolean, codigo?: string, error?: string }>}
 */
export async function ejecutarReserva(page, reservasUrl) {
  try {
    const url = reservasUrl || config.RESERVAS_URL;
    await navegarAReservas(page, url);

    await ejecutarAccionReserva(page);
    const confirmacion = await confirmarReserva(page);

    if (confirmacion.ok) {
      return { ok: true, codigo: confirmacion.codigo || 'N/A' };
    } else {
      return { ok: false, error: 'No se pudo confirmar la reserva visualmente.' };
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Navegación ────────────────────────────────────────────────────────────────

async function navegarAReservas(page, reservasUrl) {
  const current = page.url();
  const path = new URL(reservasUrl).pathname;

  if (!current.includes(path)) {
    log('info', `🧭 Navegando a reservas: ${reservasUrl}`);
    await page.goto(reservasUrl, { waitUntil: 'networkidle', timeout: 20_000 });
  } else {
    // Recargar suavemente para estado fresco
    await page.reload({ waitUntil: 'networkidle', timeout: 15_000 });
  }
  await sleep(randomDelay(800));
}

// ── Detección de estados ──────────────────────────────────────────────────────

async function detectarReservaExistente(page) {
  const patterns = [
    'text=Ya tienes reserva',
    'text=Reserva activa',
    'text=Almuerzo reservado',
    'text=Ya reservaste',
    '[class*="reserva-activa"]',
    '[class*="ya-reservado"]',
  ];
  for (const p of patterns) {
    try {
      const el = page.locator(p).first();
      if (await el.isVisible({ timeout: 1500 })) {
        // Intentar extraer código si está disponible
        const texto = await el.textContent().catch(() => '');
        const match = texto.match(/[A-Z0-9]{4,12}/);
        return match ? match[0] : 'activa';
      }
    } catch { /* continuar */ }
  }
  return null;
}

async function detectarFueraDeHorario(page) {
  const patterns = [
    'text=fuera de horario',
    'text=Fuera del horario',
    'text=No disponible en este horario',
    'text=Reservas cerradas',
  ];
  for (const p of patterns) {
    try {
      if (await page.locator(p).first().isVisible({ timeout: 1500 })) return true;
    } catch { /* continuar */ }
  }
  return false;
}

async function detectarDisponibilidad(page) {
  // Estrategia 1: texto explícito de disponibilidad
  const textPatterns = [
    config.SELECTORS.ESTADO_DISPONIBLE,
    'text=Disponible',
    'text=DISPONIBLE',
    'text=Hay cupos',
    'text=Cupos disponibles',
  ];
  for (const p of textPatterns) {
    try {
      if (await page.locator(p).first().isVisible({ timeout: 2000 })) {
        log('info', `📌 Disponibilidad detectada: "${p}"`);
        return true;
      }
    } catch { /* continuar */ }
  }

  // Estrategia 2: botón de reservar habilitado (no disabled)
  const btnSelectors = [
    config.SELECTORS.BOTON_RESERVAR,
    'button:has-text("Reservar"):not([disabled])',
    'button:has-text("Solicitar"):not([disabled])',
    'a:has-text("Reservar")',
    'input[value="Reservar"]:not([disabled])',
  ];
  for (const s of btnSelectors) {
    try {
      const btn = page.locator(s).first();
      const visible  = await btn.isVisible({ timeout: 2000 });
      const disabled = await btn.isDisabled({ timeout: 1000 }).catch(() => true);
      if (visible && !disabled) {
        log('info', `🟢 Botón de reserva activo: "${s}"`);
        return true;
      }
    } catch { /* continuar */ }
  }

  // Estrategia 3: clases CSS de disponibilidad
  const cssSelectors = [
    '[class*="disponible"]',
    '[class*="available"]',
    '[data-estado="disponible"]',
    '.badge-success:has-text("Disponible")',
  ];
  for (const s of cssSelectors) {
    try {
      if (await page.locator(s).first().isVisible({ timeout: 1500 })) {
        log('info', `🏷️  Badge de disponibilidad: "${s}"`);
        return true;
      }
    } catch { /* continuar */ }
  }

  return false;
}

// ── Acciones de reserva ───────────────────────────────────────────────────────

async function ejecutarAccionReserva(page) {
  const botonReservar = await resolverSelector(page, [
    config.SELECTORS.BOTON_RESERVAR,
    'button:has-text("Reservar"):not([disabled])',
    'button:has-text("Solicitar almuerzo")',
    'a:has-text("Reservar")',
    'input[value="Reservar"]',
  ]);

  await botonReservar.scrollIntoViewIfNeeded();
  await sleep(randomDelay(500));
  await botonReservar.click();
  log('info', '🖱️  Clic en "Reservar" ejecutado');

  // Esperar posible modal de confirmación
  await sleep(randomDelay(1500));
  await manejarModalConfirmacion(page);
}

async function manejarModalConfirmacion(page) {
  const confirmarPatterns = [
    config.SELECTORS.BOTON_CONFIRMAR,
    'button:has-text("Confirmar")',
    'button:has-text("Aceptar")',
    'button:has-text("Sí")',
    'button:has-text("OK")',
  ];
  for (const p of confirmarPatterns) {
    try {
      const btn = page.locator(p).first();
      if (await btn.isVisible({ timeout: 3000 })) {
        await sleep(randomDelay(600));
        await btn.click();
        log('info', `✅ Modal confirmado: "${p}"`);
        await sleep(randomDelay(1200));
        return;
      }
    } catch { /* sin modal */ }
  }
}

async function confirmarReserva(page) {
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await sleep(randomDelay(800));

  const successPatterns = [
    'text=Reserva exitosa',
    'text=Almuerzo reservado',
    'text=Tu reserva fue confirmada',
    'text=Reserva confirmada',
    'text=Solicitud enviada',
    '.alert-success',
    '[class*="success"]',
    '.confirmacion',
  ];

  for (const p of successPatterns) {
    try {
      const el = page.locator(p).first();
      if (await el.isVisible({ timeout: 3000 })) {
        const texto = await el.textContent().catch(() => '');
        const match = texto.match(/[A-Z0-9]{4,12}/);
        await page.screenshot({ path: 'reserva_confirmada.png', fullPage: true });
        log('info', '📸 Screenshot guardado: reserva_confirmada.png');
        return { ok: true, codigo: match ? match[0] : undefined };
      }
    } catch { /* continuar */ }
  }

  // Verificar si el botón quedó deshabilitado (señal de éxito)
  try {
    const btn = page.locator('button:has-text("Reservar")').first();
    if (await btn.isDisabled({ timeout: 2000 })) {
      await page.screenshot({ path: 'reserva_confirmada.png', fullPage: true });
      return { ok: true };
    }
  } catch { /* el botón ya no existe = éxito probable */ return { ok: true }; }

  return { ok: false };
}

// ── Util ──────────────────────────────────────────────────────────────────────

async function resolverSelector(page, selectors) {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      await locator.waitFor({ state: 'visible', timeout: 3000 });
      return locator;
    } catch { /* probar siguiente */ }
  }
  throw new Error(`Selector no encontrado: ${selectors.join(', ')}`);
}
