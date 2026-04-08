/**
 * server.js — Servidor HTTP local/nube para el bot de reservas
 *
 * Sirve el panel PWA estático y expone la API del bot.
 * Compatible con Railway, Render, Fly.io y cualquier host Node.js.
 *
 * Endpoints:
 *   GET  /           → sirve panel/index.html (PWA)
 *   GET  /ping       → health check para verificar conexión desde la app
 *   POST /verificar  → hace login (si no hay sesión) y verifica disponibilidad
 *   POST /reservar   → ejecuta la reserva
 *   POST /logout     → cierra sesión y destruye el contexto del navegador
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { config } from './config.js';
import { login, logout } from './login.js';
import { verificarDisponibilidad, ejecutarReserva } from './reservas.js';
import { log } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PANEL_DIR = path.join(__dirname, '..', 'panel');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Servir la PWA (panel HTML) como archivos estáticos
// → en producción (Railway) la app web y la API viven en el mismo servidor
app.use(express.static(PANEL_DIR));

// ── Estado global del navegador ───────────────────────────────────────────────
let browser      = null;
let context      = null;
let page         = null;
let sesionActiva = false;

async function inicializarNavegador() {
  if (!browser || !browser.isConnected()) {
    log('info', '🌐 Iniciando navegador Chromium...');
    browser = await chromium.launch({
      headless: true,   // siempre headless en la nube
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',  // necesario en Railway/Docker
        '--disable-gpu',
        '--disable-infobars',
      ],
    });
  }

  if (!context) {
    context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'es-CO',
      timezoneId: 'America/Bogota',
    });
    page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  }
}

async function destruirContexto() {
  try { if (context) { await context.close(); context = null; page = null; } } catch {}
  sesionActiva = false;
}

function resolverCredenciales(body) {
  return {
    username:    body.usuario     || config.CREDENTIALS.USERNAME,
    password:    body.password    || config.CREDENTIALS.PASSWORD,
    loginUrl:    body.loginUrl    || config.LOGIN_URL,
    reservasUrl: body.reservasUrl || config.RESERVAS_URL,
  };
}

// ── GET /ping ─────────────────────────────────────────────────────────────────
app.get('/ping', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), sesionActiva });
});

// ── POST /verificar ───────────────────────────────────────────────────────────
app.post('/verificar', async (req, res) => {
  try {
    await inicializarNavegador();
    const creds = resolverCredenciales(req.body);

    if (!sesionActiva) {
      log('info', '🔐 Sin sesión — ejecutando login...');
      await login(page, context, creds);
      sesionActiva = true;
      log('success', '✅ Login exitoso');
    }

    const resultado = await verificarDisponibilidad(page, creds.reservasUrl);
    log('info', `🔍 Estado: ${resultado.estado}`);
    res.json(resultado);
  } catch (err) {
    log('error', `❌ /verificar: ${err.message}`);
    sesionActiva = false;
    res.status(500).json({ estado: 'error', error: err.message });
  }
});

// ── POST /reservar ────────────────────────────────────────────────────────────
app.post('/reservar', async (req, res) => {
  try {
    await inicializarNavegador();
    const creds = resolverCredenciales(req.body);

    if (!sesionActiva) {
      log('info', '🔐 Sin sesión — login antes de reservar...');
      await login(page, context, creds);
      sesionActiva = true;
    }

    const resultado = await ejecutarReserva(page, creds.reservasUrl);
    log(resultado.ok ? 'success' : 'warn', `🍽 Reserva: ${JSON.stringify(resultado)}`);
    res.json(resultado);
  } catch (err) {
    log('error', `❌ /reservar: ${err.message}`);
    sesionActiva = false;
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /logout ──────────────────────────────────────────────────────────────
app.post('/logout', async (req, res) => {
  try {
    const creds = resolverCredenciales(req.body);
    log('info', '🚪 Ejecutando logout...');

    if (page && sesionActiva) await logout(page, creds.loginUrl);
    await destruirContexto();

    log('success', '✅ Sesión cerrada. Contexto destruido para re-login limpio.');
    res.json({ ok: true });
  } catch (err) {
    log('error', `❌ /logout: ${err.message}`);
    await destruirContexto();
    res.json({ ok: true, nota: 'Contexto destruido (logout web pudo fallar)' });
  }
});

// ── SPA fallback: cualquier ruta desconocida → index.html ─────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(PANEL_DIR, 'index.html'));
});

// ── Arranque ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;   // Railway inyecta PORT automáticamente
app.listen(PORT, () => {
  log('success', `🚀 Servidor corriendo en puerto ${PORT}`);
  log('info',    '   Panel PWA disponible en la raíz /');
  log('info',    '   API: POST /verificar  POST /reservar  POST /logout');
  log('info',    '   Health: GET /ping');
});

process.on('SIGINT', async () => {
  log('warn', '\n🛑 Apagando servidor...');
  await destruirContexto();
  if (browser) await browser.close();
  process.exit(0);
});
