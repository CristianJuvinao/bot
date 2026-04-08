# 🤖 Lunch Bot v3 — PWA + Servidor en la Nube

Bot de reservas automáticas con **app móvil instalable (PWA)** y servidor desplegado en Railway o Render. Sin Play Store, sin Xcode — se instala directo desde el navegador.

---

## 📁 Estructura

```
lunch-bot/
├── panel/
│   ├── index.html       ← PWA (app móvil instalable)
│   ├── manifest.json    ← Metadatos de la PWA
│   ├── sw.js            ← Service Worker (offline + caché)
│   └── icons/           ← Íconos de la app (192 y 512px)
├── src/
│   ├── server.js        ← API + sirve la PWA estática
│   ├── bot.js           ← Modo consola sin panel
│   ├── login.js         ← Login + logout automático
│   ├── reservas.js      ← Detección y ejecución de reserva
│   ├── config.js        ← Variables de entorno
│   └── utils.js         ← Logger, delays, tipeo humano
├── railway.toml         ← Config de despliegue en Railway
├── Procfile             ← Config de despliegue en Render
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Despliegue en Railway (gratis, 5 minutos)

### Paso 1 — Subir el código a GitHub

```bash
git init
git add .
git commit -m "lunch-bot v3"
# Crear repo en github.com y conectarlo:
git remote add origin https://github.com/TU_USUARIO/lunch-bot.git
git push -u origin main
```

### Paso 2 — Crear proyecto en Railway

1. Ve a **[railway.app](https://railway.app)** → "Start a New Project"
2. Elige **"Deploy from GitHub repo"**
3. Selecciona tu repositorio `lunch-bot`
4. Railway detecta el `railway.toml` automáticamente ✓

### Paso 3 — Variables de entorno en Railway

En el panel de Railway → tu servicio → pestaña **Variables**, agrega:

| Variable | Valor |
|---|---|
| `BOT_HEADLESS` | `true` |
| `BOT_USERNAME` | *(opcional — fallback si no se ingresa en el panel)* |
| `BOT_PASSWORD` | *(opcional)* |
| `BOT_LOGIN_URL` | *(opcional)* |
| `BOT_RESERVAS_URL` | *(opcional)* |

> Las variables son opcionales si siempre vas a ingresar las credenciales en el panel PWA.

### Paso 4 — Obtener la URL pública

Railway te asigna una URL como:
```
https://lunch-bot-production-xxxx.up.railway.app
```

Cópiala — la necesitas en el panel PWA.

---

## 📲 Instalar la PWA en el celular

Una vez desplegado el servidor, la app web ya es instalable:

### Android (Chrome)
1. Abre `https://tu-url.up.railway.app` en Chrome
2. Aparece un banner **"Instalar como app"** — tócalo
3. O: menú ⋮ → **"Añadir a pantalla de inicio"**

### iPhone (Safari)
1. Abre la URL en **Safari** (no Chrome)
2. Toca el botón **Compartir** (cuadrado con flecha ↑)
3. Selecciona **"Añadir a pantalla de inicio"**
4. Toca **"Añadir"**

La app aparece en tu pantalla de inicio con el ícono verde de Biofood.

---

## 📱 Uso de la app

1. **URL del servidor** → pega tu URL de Railway y toca "Verificar conexión"
2. **Credenciales** → ingresa usuario y contraseña de la plataforma universitaria
3. **URLs** → pega las URLs de login y reservas
4. Toca **"Iniciar bot"**

El bot verifica disponibilidad cada N segundos. Cuando detecta un cupo, reserva automáticamente y te envía una notificación push.

---

## 🔄 Re-login automático

Cuando el almuerzo está agotado o no disponible:
1. El bot hace logout en la plataforma
2. Destruye las cookies de sesión completamente
3. En el próximo ciclo hace login de nuevo desde cero

Esto refresca la sesión y evita que expire silenciosamente.

---

## ⚙️ Variables de entorno (.env local)

```env
BOT_USERNAME=tu_usuario
BOT_PASSWORD=tu_contraseña
BOT_BASE_URL=https://tu-plataforma.edu.co
BOT_LOGIN_URL=https://tu-plataforma.edu.co/login
BOT_RESERVAS_URL=https://tu-plataforma.edu.co/cafeteria/reservas
BOT_POLL_INTERVAL_MS=45000
BOT_MAX_INTENTOS=100
BOT_HEADLESS=true
```

---

## 🛡️ Seguridad

- Las credenciales van solo al servidor que **tú mismo desplegaste**
- La URL del servidor se guarda en `localStorage` de tu dispositivo
- No hay base de datos — nada se almacena en el servidor
- `.env` excluido de Git vía `.gitignore`

---

## 🌐 Alternativa: Render (también gratis)

1. Ve a **[render.com](https://render.com)** → "New Web Service"
2. Conecta tu repo de GitHub
3. **Build Command:** `npm install`
4. **Start Command:** `npx playwright install chromium --with-deps && node src/server.js`
5. Agrega las variables de entorno necesarias

> ⚠️ Render en plan gratuito duerme el servicio tras 15 min de inactividad.
> Railway no tiene este problema en el plan Hobby ($5/mes).

---

## 📄 Licencia

MIT — Uso personal y educativo.
