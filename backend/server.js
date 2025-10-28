// ===== Imports =====
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import crypto from "crypto";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
// Proveedores alternativos de email
import sgMail from "@sendgrid/mail";
import { Resend } from "resend";
import rateLimit from "express-rate-limit";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// ==== Compatibilidad de nombres de variables (shim) ====
// Aceptar tanto FLOW_SECRET como FLOW_SECRET_KEY
if (!process.env.FLOW_SECRET && process.env.FLOW_SECRET_KEY) {
  process.env.FLOW_SECRET = process.env.FLOW_SECRET_KEY;
}
// Aceptar tanto FLOW_BASE_URL como FLOW_API_URL
if (!process.env.FLOW_BASE_URL && process.env.FLOW_API_URL) {
  process.env.FLOW_BASE_URL = process.env.FLOW_API_URL;
}

// Log de variables de entorno para debugging
console.log("=== VERIFICACIÓN DE VARIABLES DE ENTORNO ===");
console.log("🔑 FLOW_API_KEY existe:", !!process.env.FLOW_API_KEY);
console.log("🔑 FLOW_SECRET existe:", !!process.env.FLOW_SECRET);
console.log("🔑 FLOW_BASE_URL:", process.env.FLOW_BASE_URL || "NO CONFIGURADA");
console.log("🔥 FIREBASE_DATABASE_URL existe:", !!process.env.FIREBASE_DATABASE_URL);
console.log("🌍 NODE_ENV:", process.env.NODE_ENV || "development");
console.log("=============================================");

if (!process.env.FLOW_API_KEY || !process.env.FLOW_SECRET) {
  console.error("❌ ERROR: Faltan credenciales de Flow!");
  console.error("Por favor configura FLOW_API_KEY y FLOW_SECRET en las variables de entorno de Render");
}

// ===== Protección contra Replay Attacks =====
// Almacén temporal de tokens procesados (en producción usar Redis)
const processedTokens = new Map();
const TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutos

function isTokenProcessed(token) {
  return processedTokens.has(token);
}

function markTokenAsProcessed(token) {
  processedTokens.set(token, Date.now());
  // Auto-cleanup de tokens antiguos
  setTimeout(() => {
    processedTokens.delete(token);
  }, TOKEN_EXPIRY_MS);
}

// Limpiar tokens expirados cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [token, timestamp] of processedTokens.entries()) {
    if (now - timestamp > TOKEN_EXPIRY_MS) {
      processedTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

// ===== Inicializar Firebase Admin =====
if (!admin.apps.length) {
  try {
    // Intentar cargar credenciales desde archivo
    const serviceAccountPath = join(__dirname, 'firebase-credentials.json');
    let serviceAccount = null;
    globalThis.__HAS_SERVICE_ACCOUNT__ = false;
    
    try {
      serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      console.log('✅ Credenciales Firebase encontradas');
      globalThis.__HAS_SERVICE_ACCOUNT__ = true;
    } catch (err) {
      console.log('⚠️ No se encontraron credenciales Firebase, usando solo databaseURL');
    }

    const config = {
      databaseURL: "https://mision3d-72b4a-default-rtdb.firebaseio.com/"
    };

    if (serviceAccount) {
      config.credential = admin.credential.cert(serviceAccount);
    }

    admin.initializeApp(config);
    console.log("🔥 Firebase Admin inicializado");
  } catch (err) {
    console.error("❌ Error inicializando Firebase Admin:", err.message);
  }
}
const db = admin.database();
const RTDB_URL = "https://mision3d-72b4a-default-rtdb.firebaseio.com";
const HAS_ADMIN_CREDENTIALS = !!globalThis.__HAS_SERVICE_ACCOUNT__;

// ===== Helpers Firebase (Admin/REST fallback) =====
async function rtdbRest(path, method = 'GET', data) {
  const base = RTDB_URL.replace(/\/$/, '');
  const url = `${base}/${path.replace(/^\//, '')}.json`;
  const resp = await axios({ method, url, data });
  return resp.data;
}

async function createPedido(pedidoData) {
  if (HAS_ADMIN_CREDENTIALS) {
    // Admin SDK
    const ref = await db.ref('pedidos').push(pedidoData);
    return { key: ref.key };
  } else {
    // REST (requiere reglas abiertas en dev)
    const res = await rtdbRest('pedidos', 'POST', pedidoData);
    // res = { name: "-Nx..." }
    return { key: res?.name };
  }
}

async function findPedidosByCommerceOrder(commerceOrder) {
  if (HAS_ADMIN_CREDENTIALS) {
    const snap = await db.ref('pedidos').orderByChild('commerceOrder').equalTo(commerceOrder).once('value');
    const out = [];
    snap.forEach(ch => out.push({ id: ch.key, ...ch.val() }));
    return out;
  } else {
    // REST query: orderBy="commerceOrder"&equalTo="ORD-..."
    const params = `orderBy=${encodeURIComponent('"commerceOrder"')}&equalTo=${encodeURIComponent('"' + commerceOrder + '"')}`;
    const base = RTDB_URL.replace(/\/$/, '');
    const url = `${base}/pedidos.json?${params}`;
    const { data } = await axios.get(url);
    const obj = data || {};
    return Object.keys(obj).map(k => ({ id: k, ...obj[k] }));
  }
}

async function updatePedidoPagadoMulti(updatesObj, paymentDataMinimal) {
  if (HAS_ADMIN_CREDENTIALS) {
    await db.ref().update(updatesObj);
  } else {
    // No hay multi-location updates vía REST: aplicar por cada clave
    const entries = Object.entries(updatesObj);
    for (const [path, value] of entries) {
      // path como 'pedidos/<id>/campo'
      const m = path.match(/^pedidos\/([^/]+)\/(.+)$/);
      if (!m) continue;
      const id = m[1];
      const fieldPath = m[2];
      // Convertir fieldPath plano a objeto para PATCH
      const nested = fieldPath.split('/').reverse().reduce((acc, key) => ({ [key]: acc }), value);
      await rtdbRest(`pedidos/${id}`, 'PATCH', nested);
    }
  }
}

const app = express();

// Configurar trust proxy para Render (soluciona warning de express-rate-limit)
app.set('trust proxy', 1);

// CORS: restringir en producción con CORS_ORIGIN (coma-separado)
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map(s=>s.trim()).filter(Boolean);
const corsOptions = {
  origin: (origin, cb) => {
    // En desarrollo, permitir localhost y 127.0.0.1
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isLocalhost = origin?.includes('localhost') || origin?.includes('127.0.0.1');
    
    if (!allowedOrigins.length && isDevelopment) {
      // Sin restricción en desarrollo
      return cb(null, true);
    }
    if (!origin) return cb(null, true); // llamadas server-to-server
    if (isLocalhost) return cb(null, true); // permitir localhost siempre
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (!allowedOrigins.length) return cb(null, true); // sin restricción si no se configuró
    
    console.warn('❌ CORS bloqueado para origen:', origin);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// ===== Health Check Endpoint para Render =====
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Root endpoint
app.get('/api', (req, res) => {
  res.status(200).json({ 
    message: 'Mision3D API', 
    version: '1.0.0',
    status: 'running' 
  });
});

// ===== Pedidos: listar por email del pagador =====
// Devuelve los pedidos cuyo campo payer.email coincida exactamente
app.get('/api/orders/by-email', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ success:false, error:'Email requerido' });

    let results = [];
    if (HAS_ADMIN_CREDENTIALS) {
      const snap = await db.ref('pedidos').orderByChild('payer/email').equalTo(email).once('value');
      snap.forEach(ch => results.push({ id: ch.key, ...ch.val() }));
    } else {
      // REST query
      const params = `orderBy=${encodeURIComponent('"payer/email"')}&equalTo=${encodeURIComponent('"' + email + '"')}`;
      const base = RTDB_URL.replace(/\/$/, '');
      const url = `${base}/pedidos.json?${params}`;
      const { data } = await axios.get(url);
      const obj = data || {};
      results = Object.keys(obj).map(k => ({ id: k, ...obj[k] }));
    }

    // Ordenar por fecha creación descendente si existe
    results.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
    res.json({ success:true, count: results.length, pedidos: results });
  } catch (err) {
    console.error('❌ Error listando pedidos por email:', err?.message || err);
    res.status(500).json({ success:false, error:'server_error', detail: err?.message || String(err) });
  }
});

// Servir archivos estáticos del frontend (HTML, CSS, JS, imágenes)
// Los archivos están en la carpeta padre (..)
import path from 'path';
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath));
console.log('📂 Sirviendo frontend desde:', frontendPath);

// ===== Helpers numéricos =====
const toNum = (v) => Number(v) || 0;

// ===== Utilidades Flow =====
function calcCartTotals(items) {
  let subtotal = 0;
  (items || []).forEach(i => {
    const price = toNum(i?.price);
    const qty   = toNum(i?.qty);
    subtotal += price * qty;
  });
  return { subtotal: Math.round(subtotal) };
}

function flowSign(params, secret) {
  const ordered = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHmac("sha256", secret).update(ordered).digest("hex");
}

// ===== Email (multi-proveedor: SMTP | SendGrid | Resend) =====
// Selección por VARIABLE: EMAIL_PROVIDER = smtp | sendgrid | resend
// Autodetección: si no está EMAIL_PROVIDER, se infiere por variables presentes
// Variables por proveedor:
// - smtp: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM | EMAIL_FROM
// - sendgrid: SENDGRID_API_KEY, MAIL_FROM | EMAIL_FROM
// - resend: RESEND_API_KEY, MAIL_FROM | EMAIL_FROM
// Normaliza HTML de correos para evitar problemas de codificación en clientes (Gmail, Outlook)
function normalizeEmailHtml(html) {
  if (typeof html !== 'string') return html;
  let out = html;
  const lower = out.toLowerCase();
  const hasHtmlShell = lower.includes('<html') || lower.includes('<!doctype');
  if (!hasHtmlShell) {
    out = `<!doctype html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body>${out}</body></html>`;
  } else if (!lower.includes('charset')) {
    // Añadir charset si falta
    out = `<!doctype html><meta charset="utf-8">` + out;
  }
  // Reemplazar signos invertidos por entidades HTML para máxima compatibilidad
  out = out
    .replace(/\u00A1/g, '&iexcl;') // ¡
    .replace(/\u00BF/g, '&iquest;'); // ¿
  return out;
}
let sendEmail = async ({ to, subject, html, text }) => {
  console.log('📭 [Email omitido] Asunto:', subject, 'Para:', to);
  return { ok: false, skipped: true };
};

(() => {
  // Inferir proveedor si no está definido explícitamente
  let provider = (process.env.EMAIL_PROVIDER || '').toLowerCase().trim();
  if (!provider) {
    if (process.env.RESEND_API_KEY) provider = 'resend';
    else if (process.env.SENDGRID_API_KEY) provider = 'sendgrid';
    else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) provider = 'smtp';
  }
  // Permitir EMAIL_FROM como alias de MAIL_FROM
  const from = process.env.MAIL_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'Misión 3D <no-reply@mision3d.cl>';
  global.__EMAIL_PROVIDER_ACTIVE__ = provider || 'auto';
  global.__EMAIL_FROM_ACTIVE__ = from;

  try {
    if (provider === 'sendgrid') {
      const key = process.env.SENDGRID_API_KEY;
      if (!key) {
        console.warn('⚠️ EMAIL_PROVIDER=sendgrid pero falta SENDGRID_API_KEY');
        return;
      }
      sgMail.setApiKey(key);
      sendEmail = async ({ to, subject, html, text }) => {
        const msg = { to, from, subject, html: normalizeEmailHtml(html), text };
        await sgMail.send(msg);
        return { ok: true };
      };
      console.log('📧 SendGrid listo para enviar correos');
      global.__EMAIL_PROVIDER_ACTIVE__ = 'sendgrid';
      return;
    }

    if (provider === 'resend') {
      const key = process.env.RESEND_API_KEY;
      if (!key) {
        console.warn('⚠️ EMAIL_PROVIDER=resend pero falta RESEND_API_KEY');
        return;
      }
      const resend = new Resend(key);
      sendEmail = async ({ to, subject, html, text }) => {
        const { error } = await resend.emails.send({
          from,
          to: Array.isArray(to) ? to : [to],
          subject,
          html: normalizeEmailHtml(html),
          text
        });
        if (error) throw error;
        return { ok: true };
      };
      console.log('📧 Resend listo para enviar correos');
      global.__EMAIL_PROVIDER_ACTIVE__ = 'resend';
      return;
    }

    // Default / SMTP
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const mailer = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Boolean(process.env.SMTP_SECURE === 'true'),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      sendEmail = async ({ to, subject, html, text }) => {
        await mailer.sendMail({ from, to, subject, html: normalizeEmailHtml(html), text });
        return { ok: true };
      };
      console.log('📧 SMTP listo para enviar correos');
      global.__EMAIL_PROVIDER_ACTIVE__ = 'smtp';
    } else if (!provider) {
      console.log('ℹ️ EMAIL_PROVIDER no definido y SMTP/SendGrid/Resend no configurados; los correos se omitirán');
    }
  } catch (e) {
    console.warn('⚠️ No se pudo inicializar proveedor de email:', e?.message);
  }
})();

// Endpoint de depuración rápida de email (no expone secretos)
app.get('/api/email-config', (req, res) => {
  res.json({
    provider: global.__EMAIL_PROVIDER_ACTIVE__ || null,
    from: global.__EMAIL_FROM_ACTIVE__ || null,
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasSendgridKey: !!process.env.SENDGRID_API_KEY,
    hasSmtp: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  });
});

// ===== Rate Limiting (Protección DDoS y fuerza bruta) =====
// Limitar peticiones globales a la API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 peticiones por IP
  message: {
    error: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true, // Retorna info en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
});
// Aplicar rate limiting general a todas las rutas /api/* (después de declarar apiLimiter)
app.use('/api/', apiLimiter);

// Limiter estricto para webhooks (crítico)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // máximo 10 peticiones por minuto por IP
  message: {
    error: 'Demasiadas peticiones al webhook. Posible ataque detectado.',
    retryAfter: '1 minuto'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Logging de intentos sospechosos
  handler: (req, res) => {
    console.warn('🚨 [RATE LIMIT] Webhook bloqueado desde IP:', req.ip);
    res.status(429).json({
      error: 'Demasiadas peticiones al webhook',
      message: 'Has excedido el límite de peticiones permitidas. Intenta más tarde.',
      retryAfter: '1 minuto'
    });
  }
});

// Limiter para creación de pagos (prevenir spam)
const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 pagos por 5 minutos
  message: {
    error: 'Has creado demasiados pagos en poco tiempo. Espera unos minutos.',
    retryAfter: '5 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Contar todas las peticiones
});

// Limiter para recuperación de contraseña (prevenir abuso pero permitir uso legítimo)
const passwordRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 solicitudes de recuperación por 15 minutos
  message: {
    error: 'Has solicitado demasiadas recuperaciones de contraseña. Espera un momento.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

console.log('🛡️  Rate Limiting activado:');
console.log('   • API General: 100 req/15min');
console.log('   • Webhook: 10 req/min');
console.log('   • Pagos: 20 req/5min');
console.log('   • Recuperación contraseña: 5 req/15min');

// ===== Healthcheck =====
app.get("/api/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// ===== Endpoint de prueba de email (protegido) =====
// Uso: POST /api/test-email con header x-test-key = TEST_EMAIL_KEY
// Body: { to, subject, html, text }
app.post('/api/test-email', async (req, res) => {
  try {
    const key = req.headers['x-test-key'];
    // Normalizar para evitar errores por espacios o mayúsculas/minúsculas
    const expected = (process.env.TEST_EMAIL_KEY || '').trim();
    const provided = (typeof key === 'string' ? key : String(key || '')).trim();
    // Exigir siempre TEST_EMAIL_KEY y que coincida
    if (!expected) {
      console.warn('⚠️ [Test Email] TEST_EMAIL_KEY ausente en servidor');
      return res.status(401).json({ error: 'unauthorized', reason: 'TEST_EMAIL_KEY not configured on server' });
    }
    if (provided !== expected) {
      console.log('[Test Email] Auth failed. Expected:', expected.substring(0,8)+'...', 'Got:', provided.substring(0,8)+'...');
      return res.status(401).json({ error: 'unauthorized' });
    }
    const { to, subject = 'Prueba de correo', html = '<p>Prueba OK</p>', text } = req.body || {};
    if (!to) return res.status(400).json({ error: 'to requerido' });
    // Normalización centralizada en sendEmail/normalizeEmailHtml
    const result = await sendEmail({ to, subject, html, text });
    return res.json({ ok: true, result });
  } catch (e) {
    console.error('[Test Email] Error:', e?.message || e);
    return res.status(500).json({ error: 'server', detail: e?.message });
  }
});

// Ruta raíz sirve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ===== Endpoint Flow =====
// Aplicar rate limiting para prevenir spam de pagos
app.post("/api/payments/flow", paymentLimiter, async (req, res) => {
  try {
    const {
      items,
      payer,
      shippingCost = 0,
      discount = 0
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items vacíos" });
    }

  const apiKey     = process.env.FLOW_API_KEY;
  const secret     = process.env.FLOW_SECRET;
  const commerceId = process.env.FLOW_COMMERCE_ID; // opcional
    const returnUrl  = process.env.FLOW_RETURN_URL;
    const confirmUrl = process.env.FLOW_CONFIRM_URL;
    const baseUrl    = process.env.FLOW_BASE_URL || "https://sandbox.flow.cl/api";

    if (!apiKey || !secret) {
      return res.status(500).json({ error: "Faltan credenciales Flow (FLOW_API_KEY/FLOW_SECRET)" });
    }
    if (!returnUrl || !confirmUrl) {
      return res.status(500).json({ error: "Faltan URLs (FLOW_RETURN_URL/FLOW_CONFIRM_URL)" });
    }

    // Recalcular SIEMPRE el costo de envío en el servidor para no depender del cliente
    // Reglas actuales:
    //  - Región Metropolitana de Santiago + método 'domicilio' o 'santiago' => $2.990
    //  - 'porpagar' / 'retiro' => $0 (se paga aparte)
    const meta = req.body?.meta || {};
    const regionMeta = String(meta.region || '').trim();
    const envioMeta  = String(meta.envio || '').trim();
    const norm = (s) => s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const regionN = norm(regionMeta);
    const envioN  = norm(envioMeta);

    const { subtotal } = calcCartTotals(items);

    let ship = 0;
    const clientShip = toNum(shippingCost);
    if (
      (regionN.includes('metropolitana') && regionN.includes('santiago')) &&
      (envioN === 'domicilio' || envioN === 'santiago')
    ) {
      ship = 2990;
    } else {
      // por pagar o retiro/en-tiendas => 0
      ship = 0;
    }
    if (clientShip !== ship) {
      console.warn('⚠️  [SECURITY] shippingCost del cliente no coincide. Se usará el calculado en servidor.', {
        clientShip,
        serverShip: ship,
        region: regionMeta,
        envio: envioMeta,
      });
    }
  const disc   = toNum(discount);
    const total  = Math.max(0, subtotal - disc + ship);
  console.log('[Flow Create] region:', regionMeta, '| envio:', envioMeta, '| ship:', ship, '| subtotal:', subtotal, '| disc:', disc, '| total:', total);

    console.log('[Flow] Subtotal:', subtotal, 'Shipping:', ship, 'Discount:', disc, 'Total:', total);

    // Flow espera strings en algunos campos; amount puede ir como número o string
    const params = {
      apiKey,
      commerceOrder: "ORD-" + Date.now(),
      amount: total,
      subject: "Compra Mision3D",
      email: payer?.email || "cliente@example.com",
      urlConfirmation: confirmUrl,
      urlReturn: returnUrl
    };
    // Incluir commerceId solo si está configurado
    if (commerceId) params.commerceId = commerceId;

    console.log('[Flow] Params enviados:', params);

    const s = flowSign(params, secret);
    const body = new URLSearchParams({ ...params, s });
    const url = baseUrl.replace(/\/+$/, "") + "/payment/create";

    try {
      const resp = await axios.post(url, body.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      // Respuesta esperada: { token, flowOrder, url } o similar
      const data = resp.data || {};
      console.log('[Flow] Respuesta completa:', JSON.stringify(data, null, 2));
      
      if (data.token) {
        const isSandbox = /sandbox/.test(baseUrl);
        const payHost = isSandbox ? 'https://sandbox.flow.cl' : 'https://flow.cl';
        const flowUrl = `${payHost}/app/web/pay.php?token=${data.token}`;
        console.log('[Flow] Redirigiendo a:', flowUrl);
        
        // Guardar pedido en Firebase/REST con commerceOrder
        try {
          const pedidoData = {
            commerceOrder: params.commerceOrder,
            flowOrder: data.flowOrder,
            items: items,
            payer: payer,
            shippingCost: ship,
            discount: disc,
            totalCLP: total,
            estado: 'pendiente',
            createdAt: HAS_ADMIN_CREDENTIALS ? admin.database.ServerValue.TIMESTAMP : Date.now(),
            ...(req.body?.meta || {})
          };
          const created = await createPedido(pedidoData);
          console.log('✅ [Firebase] Pedido creado:', created?.key, 'commerceOrder:', params.commerceOrder, HAS_ADMIN_CREDENTIALS ? '(admin)' : '(rest)');
        } catch (fbErr) {
          console.error('❌ [Firebase] Error creando pedido (admin/rest):', fbErr?.message || fbErr);
          // No bloqueamos el flujo si Firebase falla
        }
        
        return res.json({
          url: flowUrl,
          flowOrder: data.flowOrder,
          token: data.token,
          commerceOrder: params.commerceOrder
        });
      }
      // fallback por si Flow devuelve url directa
      if (data.url) return res.json({ url: data.url });

      console.error('[Flow] Respuesta inesperada:', data);
      return res.status(502).json({ error: "Respuesta inesperada de Flow", detail: data });
    } catch (err) {
      console.error('[Flow] Error completo:', err);
      console.error('[Flow] Error respuesta:', err.response?.data || err.message);
      console.error('[Flow] Status:', err.response?.status);
      return res.status(500).json({
        error: "flow",
        detail: err.response?.data || err.message,
        status: err.response?.status
      });
    }
  } catch (err) {
    console.error("Flow error", err.response?.data || err.message);
    return res.status(500).json({
      error: "flow",
      detail: err.response?.data || err.message,
    });
  }
});

// ===== Confirmación Flow (webhook) =====
// Aplicar rate limiting ESTRICTO para prevenir ataques
app.post("/flow/confirm", webhookLimiter, async (req, res) => {
  try {
    const { token, s: receivedSignature } = req.body;
    
    if (!token) {
      console.error('[Flow Confirm] Token no recibido');
      return res.status(400).send("Token requerido");
    }

    const apiKey = process.env.FLOW_API_KEY;
    const secret = process.env.FLOW_SECRET;
    const baseUrl = process.env.FLOW_BASE_URL || "https://sandbox.flow.cl/api";

    console.log('[Flow Confirm] Token recibido:', token);

    // ⚠️ VALIDACIÓN DE FIRMA (Webhook Security)
    // Flow envía un parámetro 's' (firma) que debemos validar
    // para asegurar que la petición viene realmente de Flow
    if (receivedSignature) {
      // Calcular la firma esperada con los parámetros recibidos
      const paramsToSign = { token };
      const expectedSignature = flowSign(paramsToSign, secret);
      
      if (receivedSignature !== expectedSignature) {
        console.error('🚨 [SECURITY] Firma inválida en webhook de Flow');
        console.error('  - Firma recibida:', receivedSignature);
        console.error('  - Firma esperada:', expectedSignature);
        console.error('  - Token:', token);
        return res.status(401).json({ 
          error: 'Firma inválida', 
          message: 'La firma de la petición no es válida. Posible intento de fraude.'
        });
      }
      console.log('✅ [SECURITY] Firma validada correctamente');
    } else {
      console.warn('⚠️ [SECURITY] Webhook sin firma. Esto puede ser un test o versión antigua de Flow.');
      // En producción, puedes hacer esto obligatorio:
      // return res.status(401).json({ error: 'Firma requerida' });
    }

    // ⚠️ VALIDACIÓN CONTRA REPLAY ATTACKS
    // Verificar que este token no haya sido procesado antes
    if (isTokenProcessed(token)) {
      console.error('🚨 [SECURITY] Intento de replay attack detectado');
      console.error('  - Token ya procesado:', token);
      return res.status(409).json({ 
        error: 'Token duplicado', 
        message: 'Este token ya fue procesado anteriormente.'
      });
    }
    
    // Marcar token como procesado ANTES de hacer la consulta a Flow
    // para evitar race conditions
    markTokenAsProcessed(token);
    console.log('🔒 [SECURITY] Token marcado como procesado');

    // Consultar estado del pago en Flow
    const params = { apiKey, token };
    const s = flowSign(params, secret);
    const queryParams = new URLSearchParams({ ...params, s });
    const url = `${baseUrl.replace(/\/+$/, "")}/payment/getStatus?${queryParams}`;

    const resp = await axios.get(url);
    const paymentData = resp.data;

    console.log('[Flow Confirm] Estado del pago:', JSON.stringify(paymentData, null, 2));

    // ⚠️ VALIDACIONES DE SEGURIDAD ADICIONALES
    // Verificar que los datos esenciales estén presentes
    if (!paymentData.flowOrder || !paymentData.commerceOrder || !paymentData.status) {
      console.error('🚨 [SECURITY] Respuesta de Flow incompleta');
      console.error('  - Datos recibidos:', paymentData);
      return res.status(400).json({ 
        error: 'Datos incompletos', 
        message: 'La respuesta de Flow no contiene los datos necesarios.'
      });
    }

    // Verificar que el monto sea válido (mayor a 0)
    if (!paymentData.amount || paymentData.amount <= 0) {
      console.error('🚨 [SECURITY] Monto inválido en el pago');
      console.error('  - Monto recibido:', paymentData.amount);
      return res.status(400).json({ 
        error: 'Monto inválido', 
        message: 'El monto del pago es inválido.'
      });
    }

    // Flow devuelve: { flowOrder, commerceOrder, status, amount, ... }
    // status puede ser: 1=pendiente, 2=pagado, 3=rechazado, 4=anulado
    
    if (paymentData.status === 2) {
      console.log('✅ [Flow Confirm] Pago confirmado para orden:', paymentData.commerceOrder);
      
      // ⚠️ VALIDACIÓN DE MONTO vs PEDIDO ORIGINAL
      // Buscar el pedido original y verificar que el monto coincida
      
      // Buscar y actualizar pedido en Firebase/REST
      try {
        const pedidos = await findPedidosByCommerceOrder(paymentData.commerceOrder);
        if (pedidos && pedidos.length) {
          const pedidoActual = pedidos[0];
          
          // ⚠️ VALIDAR MONTO: Verificar que el monto pagado coincida con el pedido original
          const montoEsperado = pedidoActual?.totalCLP || 0;
          const montoPagado = paymentData.amount || 0;
          
          // Permitir pequeñas diferencias por redondeo (±1 CLP)
          const diferencia = Math.abs(montoPagado - montoEsperado);
          if (diferencia > 1) {
            console.error('🚨 [SECURITY] Monto pagado no coincide con el pedido');
            console.error('  - Monto esperado:', montoEsperado);
            console.error('  - Monto pagado:', montoPagado);
            console.error('  - Diferencia:', diferencia);
            console.error('  - commerceOrder:', paymentData.commerceOrder);
            
            // Registrar la discrepancia en Firebase pero NO marcar como pagado
            const updates = {};
            for (const p of pedidos) {
              updates[`pedidos/${p.id}/estado`] = 'discrepancia_monto';
              updates[`pedidos/${p.id}/flowOrder`] = paymentData.flowOrder;
              updates[`pedidos/${p.id}/errorData`] = {
                type: 'monto_no_coincide',
                montoEsperado,
                montoPagado,
                diferencia,
                timestamp: Date.now()
              };
            }
            await updatePedidoPagadoMulti(updates, { status: 'error', amount: paymentData.amount });
            
            return res.status(400).json({ 
              error: 'Discrepancia de monto', 
              message: 'El monto pagado no coincide con el pedido original. Se requiere revisión manual.'
            });
          }
          
          console.log('✅ [SECURITY] Validación de monto exitosa:', montoPagado, 'CLP');
          
          const updates = {};
          let emailDestino = null;
          for (const p of pedidos) {
            if (!emailDestino) emailDestino = p?.payer?.email;
            updates[`pedidos/${p.id}/estado`] = 'pagado';
            updates[`pedidos/${p.id}/flowOrder`] = paymentData.flowOrder;
            updates[`pedidos/${p.id}/paymentDate`] = HAS_ADMIN_CREDENTIALS ? admin.database.ServerValue.TIMESTAMP : Date.now();
            updates[`pedidos/${p.id}/paymentData`] = {
              status: paymentData.status,
              amount: paymentData.amount,
              payer: paymentData.payer || {}
            };
            console.log('✅ [Firebase] Actualizando pedido:', p.id);
          }
          await updatePedidoPagadoMulti(updates, { status: paymentData.status, amount: paymentData.amount });
          console.log('✅ [Firebase] Pedido actualizado a estado "pagado"', HAS_ADMIN_CREDENTIALS ? '(admin)' : '(rest)');

          // Enviar email de confirmación (si hay correo)
          if (emailDestino) {
            const totalFmt = (pedidoActual?.totalCLP || paymentData.amount || 0).toLocaleString('es-CL');
            const asunto = `Confirmación de pago - ${paymentData.commerceOrder}`;
            const html = `
              <h2>¡Gracias por tu compra en Misión 3D!</h2>
              <p>Hemos confirmado tu pago correctamente.</p>
              <ul>
                <li>Orden comercio: <strong>${paymentData.commerceOrder}</strong></li>
                <li>Orden Flow: <strong>${paymentData.flowOrder}</strong></li>
                <li>Monto: <strong>$${totalFmt}</strong></li>
                <li>Estado: <strong>Pagado</strong></li>
              </ul>
              <p>Pronto te contactaremos con el estado del envío.</p>
            `;
            try {
              await sendEmail({ to: emailDestino, subject: asunto, html, text: `Pago confirmado. Orden ${paymentData.commerceOrder}` });
              console.log('📧 Email de confirmación enviado a', emailDestino);
            } catch (e) {
              console.warn('⚠️ No se pudo enviar el email de confirmación:', e?.message);
            }
          }
        } else {
          console.warn('⚠️ [Firebase] No se encontró pedido con commerceOrder:', paymentData.commerceOrder);
        }
      } catch (firebaseErr) {
        console.error('❌ [Firebase] Error actualizando pedido:', firebaseErr);
      }
      
      return res.status(200).send("CONFIRMED");
    } else {
      console.log('⚠️ [Flow Confirm] Pago no confirmado. Status:', paymentData.status);
      return res.status(200).send("PENDING");
    }

  } catch (err) {
    console.error('[Flow Confirm] Error:', err.response?.data || err.message);
    return res.status(500).send("ERROR");
  }
});

// ===== Orden por transferencia (crear pedido y enviar instrucciones) =====
app.post('/api/orders/transfer', async (req, res) => {
  try {
    const { items, payer, shippingCost = 0, discount = 0, meta = {} } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items vacíos' });
    const { subtotal } = calcCartTotals(items);
    // Recalcular envío también para órdenes por transferencia
    const regionMeta = String(meta.region || '').trim();
    const envioMeta  = String(meta.envio || '').trim();
    const norm = (s) => s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const regionN = norm(regionMeta);
    const envioN  = norm(envioMeta);
    let ship = 0;
    const clientShip = toNum(shippingCost);
    if (
      (regionN.includes('metropolitana') && regionN.includes('santiago')) &&
      (envioN === 'domicilio' || envioN === 'santiago')
    ) {
      ship = 2990;
    } else {
      ship = 0;
    }
    if (clientShip !== ship) {
      console.warn('⚠️  [SECURITY] shippingCost (transfer) del cliente no coincide. Se usará el calculado en servidor.', {
        clientShip,
        serverShip: ship,
        region: regionMeta,
        envio: envioMeta,
      });
    }
    const disc = toNum(discount);
    const total = Math.max(0, subtotal - disc + ship);
    console.log('[Transfer Create] region:', regionMeta, '| envio:', envioMeta, '| ship:', ship, '| subtotal:', subtotal, '| disc:', disc, '| total:', total);

    const commerceOrder = 'ORD-' + Date.now();
    const pedido = {
      commerceOrder,
      items,
      payer,
      shippingCost: ship,
      discount: disc,
      totalCLP: total,
      estado: 'pendiente_transferencia',
      createdAt: admin.database.ServerValue.TIMESTAMP,
      ...meta
    };
    let key = null;
    try {
      const ref = await db.ref('pedidos').push(pedido);
      key = ref.key;
      console.log('✅ [Firebase] Pedido (transferencia) creado:', key);
    } catch (e) {
      console.warn('⚠️ [Firebase] No se pudo guardar pedido transferencia:', e?.message);
    }

    // Email con instrucciones de transferencia (si hay SMTP)
    try {
      if (payer?.email) {
        const totalFmt = total.toLocaleString('es-CL');
        const html = `
          <h2>Pedido recibido en Misión 3D</h2>
          <p>Seleccionaste <strong>Transferencia Bancaria</strong>. Realiza la transferencia usando estos datos:</p>
          <ul>
            <li>Titular: <strong>Patricio Germán Sánchez Casanova</strong></li>
            <li>RUT: <strong>192252148</strong></li>
            <li>Banco: <strong>Mercado Pago</strong></li>
            <li>Tipo: <strong>Cuenta Vista</strong></li>
            <li>N° Cuenta: <strong>1034627294</strong></li>
            <li>Email: <a href="mailto:pgscasanova@gmail.com">pgscasanova@gmail.com</a></li>
          </ul>
          <p>Monto a transferir: <strong>$${totalFmt}</strong></p>
          <p>Envía el comprobante a <a href="mailto:pgscasanova@gmail.com">pgscasanova@gmail.com</a> indicando tu número de pedido <strong>${commerceOrder}</strong>.</p>
        `;
        await sendEmail({ to: payer.email, subject: `Instrucciones de transferencia - ${commerceOrder}`, html, text: `Monto: $${totalFmt} - Orden: ${commerceOrder}` });
        console.log('📧 Email con instrucciones de transferencia enviado a', payer.email);
      }
    } catch (e) {
      console.warn('⚠️ No se pudo enviar email de transferencia:', e?.message);
    }

    res.json({ ok: true, commerceOrder, id: key });
  } catch (err) {
    console.error('[Transfer] Error:', err?.response?.data || err?.message);
    res.status(500).json({ error: 'server', detail: err?.message });
  }
});

// ===== Retorno Flow (usuario vuelve) =====
app.get("/flow/retorno", async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error - Pago Flow</title>
          <style>
            body{font-family:system-ui,sans-serif;background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}
            .card{background:#fff;padding:40px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:500px;text-align:center}
            .icon{font-size:4rem;margin-bottom:20px}
            h1{color:#dc2626;margin:0 0 10px;font-size:1.5rem}
            p{color:#6b7280;line-height:1.6;margin:0 0 30px}
            .btn{display:inline-block;background:#0052cc;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600}
            .btn:hover{background:#0043a8}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">❌</div>
            <h1>Error en el pago</h1>
            <p>No se recibió información del pago. Por favor, intenta nuevamente.</p>
            <a href="../index.html" class="btn">Volver a la tienda</a>
          </div>
        </body>
        </html>
      `);
    }

    const apiKey = process.env.FLOW_API_KEY;
    const secret = process.env.FLOW_SECRET;
    const baseUrl = process.env.FLOW_BASE_URL || "https://sandbox.flow.cl/api";

    // Consultar estado del pago
    const params = { apiKey, token };
    const s = flowSign(params, secret);
    const queryParams = new URLSearchParams({ ...params, s });
    const url = `${baseUrl.replace(/\/+$/, "")}/payment/getStatus?${queryParams}`;

    const resp = await axios.get(url);
    const payment = resp.data;

    console.log('[Flow Retorno] Datos del pago:', payment);

    // Renderizar página según el estado
    const isSuccess = payment.status === 2;
    const isPending = payment.status === 1;
    
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isSuccess ? 'Pago Exitoso' : isPending ? 'Pago Pendiente' : 'Pago Rechazado'} - Misión 3D</title>
        <style>
          body{font-family:system-ui,sans-serif;background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}
          .card{background:#fff;padding:40px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:600px;text-align:center}
          .icon{font-size:5rem;margin-bottom:20px}
          h1{margin:0 0 10px;font-size:1.8rem}
          .success h1{color:#059669}
          .pending h1{color:#f59e0b}
          .error h1{color:#dc2626}
          p{color:#6b7280;line-height:1.6;margin:0 0 30px}
          .details{background:#f9fafb;padding:20px;border-radius:12px;margin:20px 0;text-align:left}
          .detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb}
          .detail-row:last-child{border:none}
          .detail-label{color:#6b7280;font-size:.9rem}
          .detail-value{font-weight:600;color:#111827}
          .btn{display:inline-block;background:#0052cc;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:10px}
          .btn:hover{background:#0043a8}
        </style>
      </head>
      <body>
        <div class="card ${isSuccess ? 'success' : isPending ? 'pending' : 'error'}">
          <div class="icon">${isSuccess ? '✅' : isPending ? '⏳' : '❌'}</div>
          <h1>${isSuccess ? '¡Pago Exitoso!' : isPending ? 'Pago Pendiente' : 'Pago Rechazado'}</h1>
          <p>${isSuccess 
            ? 'Tu pedido ha sido confirmado y procesado correctamente. Recibirás un correo con los detalles.' 
            : isPending 
            ? 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.' 
            : 'Hubo un problema al procesar tu pago. Por favor, intenta nuevamente.'
          }</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Orden Flow:</span>
              <span class="detail-value">#${payment.flowOrder || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Orden comercio:</span>
              <span class="detail-value">${payment.commerceOrder || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Monto:</span>
              <span class="detail-value">$${(payment.amount || 0).toLocaleString('es-CL')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Estado:</span>
              <span class="detail-value">${isSuccess ? 'Pagado' : isPending ? 'Pendiente' : 'Rechazado'}</span>
            </div>
          </div>
          
          <a href="../index.html" class="btn">Volver a la tienda</a>
        </div>
        ${isSuccess ? `
        <script>
          // Limpia carrito local
          setTimeout(() => localStorage.removeItem('cart'), 1000);
          // Enviar evento de compra a GA4 si hay consentimiento
          (function(){
            try {
              var consent = JSON.parse(localStorage.getItem('cookieConsent')||'null');
              var GA_ID = localStorage.getItem('ga4_id');
              if (!consent || consent.analytics !== 'granted' || !GA_ID) return;
              window.dataLayer = window.dataLayer || [];
              function gtag(){ dataLayer.push(arguments); }
              var s = document.createElement('script'); s.async=true; s.src='https://www.googletagmanager.com/gtag/js?id='+GA_ID; document.head.appendChild(s);
              gtag('js', new Date());
              gtag('config', GA_ID);
              gtag('event','purchase', {
                currency: 'CLP',
                value: ${Number.isFinite(+payment.amount) ? +payment.amount : 0},
                transaction_id: '${payment.commerceOrder || ''}'
              });
            } catch(e) {}
          })();
        </script>
        ` : ''}
      </body>
      </html>
    `);

  } catch (err) {
    console.error('[Flow Retorno] Error:', err);
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Error</title>
        <style>body{font-family:sans-serif;text-align:center;padding:50px}h2{color:#dc2626}</style>
      </head>
      <body>
        <h2>❌ Error al verificar el pago</h2>
        <p>Por favor, contacta con soporte.</p>
        <a href="../index.html">Volver</a>
      </body>
      </html>
    `);
  }
});

// ===== Endpoint: Enviar correo de confirmación de registro =====
app.post("/api/send-registration-email", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email requerido" });
    }

    const userName = name || email.split('@')[0];

    // HTML del correo de confirmación
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .message-box { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin: 20px 0; }
          .button { display: inline-block; padding: 14px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { background: #0284c7; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .verification-code { background: #dbeafe; padding: 15px; border-radius: 6px; text-align: center; font-size: 24px; font-weight: 700; letter-spacing: 3px; color: #1e40af; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>¡Bienvenido a Misión 3D! 🎨</h1>
        </div>
        <div class="content">
          <div class="message-box">
            <h2>¡Hola ${userName}!</h2>
            <p>Tu cuenta ha sido creada exitosamente en <strong>Misión3D.cl</strong></p>
            
            <p>Hemos enviado este correo para confirmar tu dirección de email: <strong>${email}</strong></p>
            
            <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
              <p style="margin: 0;"><strong>✅ Tu cuenta está lista para usar</strong></p>
              <p style="margin: 10px 0 0 0;">Ya puedes iniciar sesión y comenzar a explorar nuestro catálogo de productos de impresión 3D.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="https://mision3d.cl/login.html" class="button">INICIAR SESIÓN</a>
            </div>
            
            <h3>Beneficios de tu cuenta:</h3>
            <ul style="line-height: 2;">
              <li>✨ Proceso de compra más rápido</li>
              <li>📦 Seguimiento de tus pedidos</li>
              <li>❤️ Lista de productos favoritos</li>
              <li>📍 Múltiples direcciones de envío</li>
              <li>🎁 Ofertas y promociones exclusivas</li>
            </ul>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              Si no creaste esta cuenta, por favor ignora este correo o <a href="mailto:soporte@mision3d.cl" style="color: #0ea5e9;">contáctanos</a>.
            </p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Misión 3D</strong> - Impresión 3D Profesional</p>
          <p>Este es un correo automático, por favor no responder.</p>
          <p>¿Necesitas ayuda? Contáctanos en <a href="mailto:soporte@mision3d.cl" style="color: #0ea5e9;">soporte@mision3d.cl</a></p>
        </div>
      </body>
      </html>
    `;

    const text = `
Bienvenido a Misión 3D

Hola ${userName},

Tu cuenta ha sido creada exitosamente en Misión3D.cl

Email confirmado: ${email}

Ya puedes iniciar sesión en: https://mision3d.cl/login.html

Beneficios de tu cuenta:
- Proceso de compra más rápido
- Seguimiento de tus pedidos
- Lista de productos favoritos
- Múltiples direcciones de envío
- Ofertas y promociones exclusivas

Si no creaste esta cuenta, por favor ignora este correo.

---
Misión 3D - Impresión 3D Profesional
Soporte: soporte@mision3d.cl
    `;

    const sendResult = await sendEmail({
      to: email,
      subject: "¡Bienvenido a Misión 3D! - Cuenta creada exitosamente",
      html,
      text
    });

    console.log(`✅ Correo de registro enviado a: ${email}`);
    res.json({ success: true, message: "Correo de confirmación enviado", provider: global.__EMAIL_PROVIDER_ACTIVE__ });

  } catch (error) {
    console.error("❌ Error enviando correo de registro:", error?.message || error);
    // Devolver detalle de error para debug seguro
    res.status(500).json({ success: false, error: "Error al enviar correo", detail: error?.message || String(error) });
  }
});

// ===== Endpoint: Enviar correo de recuperación de contraseña =====
app.post("/api/send-password-recovery", passwordRecoveryLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email requerido" });
    }

    // Generar token de recuperación (válido por 1 hora)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hora

    // En producción, guardarías este token en base de datos
    // Por ahora lo guardamos en memoria (se pierde al reiniciar servidor)
    if (!global.passwordResetTokens) {
      global.passwordResetTokens = new Map();
    }
    
    global.passwordResetTokens.set(resetToken, {
      email,
      expiry: resetTokenExpiry
    });

    // Limpiar tokens expirados cada vez (simple cleanup)
    const now = Date.now();
    for (const [token, data] of global.passwordResetTokens.entries()) {
      if (data.expiry < now) {
        global.passwordResetTokens.delete(token);
      }
    }

    // URL de recuperación
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const baseUrl = isDevelopment ? 'http://localhost:5500' : 'https://mision3d.cl';
    const resetUrl = `${baseUrl}/restablecer-password.html?token=${resetToken}`;

    // HTML del correo de recuperación
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .message-box { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin: 20px 0; }
          .button { display: inline-block; padding: 14px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { background: #0284c7; }
          .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔒 Recuperación de Contraseña</h1>
        </div>
        <div class="content">
          <div class="message-box">
            <h2>Restablecer tu contraseña</h2>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>Misión3D.cl</strong></p>
            
            <p>Email: <strong>${email}</strong></p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">RESTABLECER CONTRASEÑA</a>
            </div>
            
            <div class="warning-box">
              <p style="margin: 0;"><strong>⏰ Este enlace expira en 1 hora</strong></p>
              <p style="margin: 10px 0 0 0;">Por razones de seguridad, este enlace solo es válido por 60 minutos.</p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
              <a href="${resetUrl}" style="color: #0ea5e9; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <strong>⚠️ ¿No solicitaste este cambio?</strong><br>
              Si no fuiste tú quien solicitó restablecer la contraseña, ignora este correo. Tu contraseña permanecerá sin cambios.
            </p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Misión 3D</strong> - Impresión 3D Profesional</p>
          <p>Este es un correo automático, por favor no responder.</p>
          <p>¿Necesitas ayuda? Contáctanos en <a href="mailto:soporte@mision3d.cl" style="color: #0ea5e9;">soporte@mision3d.cl</a></p>
        </div>
      </body>
      </html>
    `;

    const text = `
Recuperación de Contraseña - Misión 3D

Hola,

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.

Email: ${email}

Para restablecer tu contraseña, haz click en el siguiente enlace:
${resetUrl}

⏰ Este enlace expira en 1 hora por razones de seguridad.

Si no solicitaste este cambio, ignora este correo. Tu contraseña permanecerá sin cambios.

---
Misión 3D - Impresión 3D Profesional
Soporte: soporte@mision3d.cl
    `;

    // Enviar correo de recuperación
    try {
      const sendResult = await sendEmail({
        to: email,
        subject: "🔒 Recuperación de Contraseña - Misión 3D",
        html,
        text
      });

      console.log(`✅ Correo de recuperación enviado a: ${email}`, sendResult);
      
      res.json({ 
        success: true, 
        message: "Correo de recuperación enviado",
        provider: global.__EMAIL_PROVIDER_ACTIVE__,
        // En desarrollo, devolver el token para testing
        ...(isDevelopment && { token: resetToken, resetUrl })
      });
    } catch (emailError) {
      console.error("❌ Error enviando correo de recuperación:", emailError);
      // Si el correo falla, aún devolvemos success para no revelar si el email existe
      // pero log el error
      res.json({ 
        success: true, 
        message: "Si el correo existe, recibirás instrucciones de recuperación",
        warning: "Email delivery failed",
        detail: emailError?.message || String(emailError),
        provider: global.__EMAIL_PROVIDER_ACTIVE__
      });
    }

  } catch (error) {
    console.error("❌ Error en endpoint de recuperación:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error al procesar solicitud", 
      detail: error?.message || String(error) 
    });
  }
});

// ===== Endpoint: Verificar token y restablecer contraseña =====
app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: "Token y contraseña requeridos" });
    }

    // Verificar token
    if (!global.passwordResetTokens || !global.passwordResetTokens.has(token)) {
      return res.status(400).json({ success: false, error: "Token inválido o expirado" });
    }

    const tokenData = global.passwordResetTokens.get(token);
    
    // Verificar expiración
    if (Date.now() > tokenData.expiry) {
      global.passwordResetTokens.delete(token);
      return res.status(400).json({ success: false, error: "Token expirado" });
    }

    // Aquí en producción actualizarías la contraseña en la base de datos
    // Por ahora solo retornamos éxito con el email
    const email = tokenData.email;

    // Eliminar token usado
    global.passwordResetTokens.delete(token);

    console.log(`✅ Contraseña restablecida para: ${email}`);
    res.json({ 
      success: true, 
      message: "Contraseña restablecida exitosamente",
      email 
    });

  } catch (error) {
    console.error("❌ Error restableciendo contraseña:", error);
    res.status(500).json({ success: false, error: "Error al restablecer contraseña" });
  }
});

// ===== Start server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Backend escuchando en puerto " + PORT);
});
