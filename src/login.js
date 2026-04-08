/**
 * login.js — Autenticación y cierre de sesión
 *
 * Acepta credenciales dinámicas (del panel HTML) con fallback al .env.
 */

import { config } from './config.js';
import { log, sleep, randomDelay, humanType } from './utils.js';

/**
 * Realiza el login en la plataforma universitaria.
 * @param {import('playwright').Page} page
 * @param {import('playwright').BrowserContext} context
 * @param {{ username, password, loginUrl }} creds
 */
export async function login(page, context, creds = {}) {
  const username = creds.username || config.CREDENTIALS.USERNAME;
  const password = creds.password || config.CREDENTIALS.PASSWORD;
  const loginUrl = creds.loginUrl || config.LOGIN_URL;

  await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  log('info', `🌐 Página de login cargada: ${loginUrl}`);
  await sleep(randomDelay(1500) + 800);

  // Campo usuario
  const userField = await resolveSelector(page, [
    config.SELECTORS.USERNAME,
    'input[name="usuario"]',
    'input[name="user"]',
    'input[name="username"]',
    'input[placeholder*="usuario" i]',
    'input[type="text"]:first-of-type',
  ]);
  await userField.click();
  await sleep(randomDelay(400));
  await humanType(userField, username);
  log('info', '👤 Usuario ingresado');
  await sleep(randomDelay(700));

  // Campo contraseña
  const passField = await resolveSelector(page, [
    config.SELECTORS.PASSWORD,
    'input[name="password"]',
    'input[name="contrasena"]',
    'input[name="pass"]',
    'input[type="password"]',
  ]);
  await passField.click();
  await sleep(randomDelay(300));
  await humanType(passField, password);
  log('info', '🔑 Contraseña ingresada');
  await sleep(randomDelay(900));

  // Botón login
  const loginBtn = await resolveSelector(page, [
    config.SELECTORS.LOGIN_BUTTON,
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Ingresar")',
    'button:has-text("Iniciar sesión")',
    'button:has-text("Entrar")',
    'button:has-text("Login")',
  ]);
  await loginBtn.click();
  log('info', '🖱️  Botón de login presionado');

  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20_000 });
  await sleep(randomDelay(1200));

  const loginFallido = await detectLoginError(page);
  if (loginFallido) {
    throw new Error('Login fallido: verifica tus credenciales o la URL de login.');
  }

  const cookies = await context.cookies();
  log('info', `🍪 Sesión activa — ${cookies.length} cookies almacenadas`);
}

/**
 * Cierra la sesión en la plataforma universitaria.
 * Intenta en orden: botón de logout → URL de logout → navegar al login.
 *
 * @param {import('playwright').Page} page
 * @param {string} loginUrl
 */
export async function logout(page, loginUrl) {
  log('info', '🚪 Cerrando sesión en la plataforma...');

  // Estrategia 1: botón/enlace de logout visible
  const logoutSelectors = [
    'a:has-text("Cerrar sesión")',
    'a:has-text("Salir")',
    'button:has-text("Cerrar sesión")',
    'button:has-text("Logout")',
    'a[href*="logout"]',
    'a[href*="salir"]',
    'a[href*="signout"]',
    '[data-action="logout"]',
  ];

  for (const selector of logoutSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click();
        log('info', `🖱️  Logout via botón: "${selector}"`);
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10_000 }).catch(() => {});
        await sleep(randomDelay(800));
        log('success', '✅ Sesión cerrada correctamente');
        return;
      }
    } catch { /* probar siguiente */ }
  }

  // Estrategia 2: URL de logout derivada de la URL de login
  const base = loginUrl.replace(/\/login.*$/i, '');
  const logoutUrls = [`${base}/logout`, `${base}/salir`, `${base}/signout`];

  for (const url of logoutUrls) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 8000 });
      log('info', `🔗 Logout via URL: ${url}`);
      await sleep(randomDelay(600));
      return;
    } catch { /* probar siguiente */ }
  }

  // Estrategia 3: navegar al login para invalidar sesión visualmente
  log('warn', '⚠️  Sin botón de logout. Navegando al login para invalidar sesión...');
  await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 10_000 }).catch(() => {});
  await sleep(randomDelay(500));
  log('info', '🔄 Sesión invalidada por navegación al login');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveSelector(page, selectors) {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      await locator.waitFor({ state: 'visible', timeout: 3000 });
      return locator;
    } catch { /* probar siguiente */ }
  }
  throw new Error(`Selector no encontrado: ${selectors.join(', ')}`);
}

async function detectLoginError(page) {
  const errorPatterns = [
    'text=Credenciales incorrectas',
    'text=Usuario o contraseña inválidos',
    'text=Error de autenticación',
    'text=Invalid credentials',
    '.alert-danger',
    '.error-message',
    '[class*="error"]',
  ];
  for (const pattern of errorPatterns) {
    try {
      if (await page.locator(pattern).first().isVisible({ timeout: 1000 })) return true;
    } catch { /* sin error */ }
  }
  const url = page.url();
  if (url.includes('login') || url.includes('signin')) {
    log('warn', `⚠️  Posible error de login — URL: ${url}`);
    return true;
  }
  return false;
}
