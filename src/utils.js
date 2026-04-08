/**
 * utils.js — Funciones utilitarias del bot
 * Logging con colores, delays humanos, tipeo progresivo.
 */

// ── Colores ANSI para la terminal ─────────────────────────────────────────────
const COLORS = {
  reset: '\x1b[0m',
  info: '\x1b[36m',     // Cyan
  success: '\x1b[32m',  // Verde
  warn: '\x1b[33m',     // Amarillo
  error: '\x1b[31m',    // Rojo
  wait: '\x1b[35m',     // Magenta
};

const ICONS = {
  info: 'ℹ',
  success: '✔',
  warn: '⚠',
  error: '✖',
  wait: '⏳',
};

/**
 * Log con timestamp, nivel e ícono coloreado.
 * @param {'info'|'success'|'warn'|'error'|'wait'} level
 * @param {string} message
 */
export function log(level, message) {
  const ts = new Date().toLocaleTimeString('es-CO', { hour12: false });
  const color = COLORS[level] || COLORS.info;
  const icon = ICONS[level] || 'ℹ';
  console.log(`${color}[${ts}] ${icon} ${message}${COLORS.reset}`);
}

/**
 * Promesa de espera simple (ms).
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Genera un delay aleatorio entre 0 y maxMs milisegundos.
 * Simula comportamiento humano impredecible.
 * @param {number} maxMs
 */
export function randomDelay(maxMs = 2000) {
  return Math.floor(Math.random() * maxMs);
}

/**
 * Tipea texto carácter por carácter simulando velocidad humana variable.
 * @param {import('playwright').Locator} element
 * @param {string} text
 */
export async function humanType(element, text) {
  for (const char of text) {
    await element.type(char, { delay: 50 + randomDelay(100) });
  }
  await sleep(randomDelay(400));
}
