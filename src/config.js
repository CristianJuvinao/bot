/**
 * config.js — Configuración centralizada del bot
 * Carga variables de entorno y exporta parámetros ajustables.
 *
 * ⚠️  NUNCA escribas credenciales directamente aquí.
 *     Usa el archivo .env para datos sensibles.
 */

import 'dotenv/config';

// ── Validar variables de entorno obligatorias ─────────────────────────────────
const requiredEnvVars = ['BOT_USERNAME', 'BOT_PASSWORD', 'BOT_BASE_URL'];
const missing = requiredEnvVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(`\n❌ Variables de entorno faltantes: ${missing.join(', ')}`);
  console.error('   Revisa tu archivo .env\n');
  process.exit(1);
}

// ── Construcción de la configuración ─────────────────────────────────────────
export const config = {
  // ── URLs ────────────────────────────────────────────────────────────────
  BASE_URL: process.env.BOT_BASE_URL,
  LOGIN_URL: process.env.BOT_LOGIN_URL || `${process.env.BOT_BASE_URL}/login`,
  RESERVAS_URL: process.env.BOT_RESERVAS_URL || `${process.env.BOT_BASE_URL}/reservas`,
  RESERVAS_PATH: process.env.BOT_RESERVAS_PATH || '/reservas',

  // ── Credenciales (desde variables de entorno) ────────────────────────────
  CREDENTIALS: {
    USERNAME: process.env.BOT_USERNAME,
    PASSWORD: process.env.BOT_PASSWORD,
  },

  // ── Comportamiento del bot ───────────────────────────────────────────────
  POLL_INTERVAL_MS: parseInt(process.env.BOT_POLL_INTERVAL_MS || '45000', 10), // 45s por defecto
  MAX_INTENTOS: parseInt(process.env.BOT_MAX_INTENTOS || '100', 10),
  HEADLESS: process.env.BOT_HEADLESS !== 'false', // true por defecto

  // ── Selectores CSS personalizables ───────────────────────────────────────
  // Ajusta estos valores según la plataforma universitaria específica.
  SELECTORS: {
    USERNAME: process.env.SELECTOR_USERNAME || '#username',
    PASSWORD: process.env.SELECTOR_PASSWORD || '#password',
    LOGIN_BUTTON: process.env.SELECTOR_LOGIN_BTN || 'button[type="submit"]',
    BOTON_RESERVAR: process.env.SELECTOR_RESERVAR || 'button:has-text("Reservar")',
    BOTON_CONFIRMAR: process.env.SELECTOR_CONFIRMAR || 'button:has-text("Confirmar")',
    ESTADO_DISPONIBLE: process.env.SELECTOR_DISPONIBLE || 'text=Disponible',
  },
};
