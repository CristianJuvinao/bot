/**
 * bot.js — Punto de entrada principal del bot de reservas
 * Orquesta el login, el polling y la reserva automática de almuerzo.
 */

import { chromium } from 'playwright';
import { login } from './login.js';
import { verificarYReservar } from './reservas.js';
import { config } from './config.js';
import { log, sleep, randomDelay } from './utils.js';

/**
 * Función principal que inicializa el navegador y coordina el flujo completo.
 */
async function main() {
  log('info', '🤖 Bot de reservas universitarias iniciado');
  log('info', `📋 Plataforma: ${config.BASE_URL}`);
  log('info', `⏱️  Intervalo de verificación: ${config.POLL_INTERVAL_MS / 1000}s`);

  // Lanzar navegador con perfil de usuario realista
  const browser = await chromium.launch({
    headless: config.HEADLESS,          // false para ver el navegador en acción
    slowMo: 80,                          // ralentiza acciones para simular humano
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-infobars',
    ],
  });

  // Contexto con viewport y user-agent realistas
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    // Persistir cookies de sesión entre ciclos
    storageState: undefined,
  });

  const page = await context.newPage();

  // Ocultar indicadores de automatización del navegador
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  let reservaExitosa = false;
  let intentos = 0;

  try {
    // ── 1. LOGIN ─────────────────────────────────────────────────────────────
    log('info', '🔐 Iniciando sesión en la plataforma...');
    await login(page, context);
    log('success', '✅ Sesión iniciada correctamente');

    // ── 2. POLLING: verificar disponibilidad en bucle ─────────────────────
    while (!reservaExitosa && intentos < config.MAX_INTENTOS) {
      intentos++;
      const hora = new Date().toLocaleTimeString('es-CO');
      log('info', `🔍 [${hora}] Verificando disponibilidad... (intento #${intentos})`);

      reservaExitosa = await verificarYReservar(page);

      if (!reservaExitosa) {
        log('wait', `⏳ Almuerzo no disponible. Próxima verificación en ${config.POLL_INTERVAL_MS / 1000}s`);
        // Espera con pequeña variación aleatoria para simular comportamiento humano
        await sleep(config.POLL_INTERVAL_MS + randomDelay(5000));
      }
    }

    // ── 3. RESULTADO FINAL ────────────────────────────────────────────────
    if (reservaExitosa) {
      log('success', '🎉 ¡Reserva de almuerzo completada exitosamente! Bot finalizado.');
    } else {
      log('warn', `⚠️  Se alcanzó el límite de ${config.MAX_INTENTOS} intentos sin éxito.`);
    }
  } catch (error) {
    log('error', `❌ Error inesperado: ${error.message}`);
    // Captura screenshot de diagnóstico ante errores críticos
    await page.screenshot({ path: 'error_screenshot.png', fullPage: true });
    log('info', '📸 Screenshot guardado en error_screenshot.png para diagnóstico');
  } finally {
    await context.close();
    await browser.close();
    log('info', '🛑 Navegador cerrado. Bot detenido.');
  }
}

main();
