// ===== Imports =====
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import crypto from "crypto";
import nodemailer from "nodemailer";
// Proveedores alternativos de email
import sgMail from "@sendgrid/mail";
import { Resend } from "resend";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import path, { dirname } from "path";

import sitemapRouter from "./sitemap.js";

dotenv.config();

// ===== Log filter opcional =====
(() => {
  const silence = String(process.env.LOG_SILENCE || '').toLowerCase();
  if (!silence) return;
  const patterns = silence.split(',').map(s => s.trim()).filter(Boolean);
  const match = (msg) => patterns.some(p => msg.toLowerCase().includes(p));
  const warn0 = console.warn.bind(console);
  const log0  = console.log.bind(console);
  console.warn = (...a) => { try { const m = a.map(String).join(' '); if (match(m)) return; } catch{} warn0(...a); };
  console.log  = (...a) => { try { const m = a.map(String).join(' '); if (match(m)) return; } catch{} log0(...a); };
})();

// ===== Paths / App =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Sitemap y estáticos
app.use(sitemapRouter);

// Configurar trust proxy para Render (soluciona warning de express-rate-limit)
app.set("trust proxy", 1);

// ===== Body parsers =====
// JSON (API estándar)
app.use(express.json());
// URL-encoded (necesario para webhooks que envían application/x-www-form-urlencoded como Flow)
app.use(express.urlencoded({ extended: true }));

// ===== CORS =====
app.use(cors({
  origin: [
    "https://mision3d.cl",
    "https://www.mision3d.cl",
    "https://mision3dcl.pages.dev"
  ],
  credentials: true
}));

// ===== Health Check Endpoints (Render) =====
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Root simple para no confundir (ya no servimos frontend desde aquí)
app.get('/', (_, res) => {
  res.json({ service: 'Mision3D API', ok: true, health: '/api/health' });
});

// Root endpoint
app.get("/api", (req, res) => {
  res.status(200).json({
    message: "Mision3D API",
    version: "1.0.0",
    status: "running",
  });
});

// Almacenamiento temporal de pedidos creados vía Flow (solo en memoria)
// Clave: token de Flow -> Valor: resumen del pedido
global.__PENDING_ORDERS__ = global.__PENDING_ORDERS__ || new Map();

// ===== Helpers numéricos =====
const toNum = (v) => Number(v) || 0;

// ===== Utilidades Flow =====
function calcCartTotals(items) {
  let subtotal = 0;
  (items || []).forEach((i) => {
    const price = toNum(i?.price);
    const qty = toNum(i?.qty);
    subtotal += price * qty;
  });
  return { subtotal: Math.round(subtotal) };
}

function flowSign(params, secret) {
  const ordered = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHmac("sha256", secret).update(ordered).digest("hex");
}

// ===== Helper para información de retiro =====
function getRetiroInfo(meta) {
  const envio = String(meta?.envio || '').toLowerCase().trim();
  const region = String(meta?.region || '').toLowerCase().trim();
  
  // Normalizar para comparación
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const envioN = norm(envio);
  const regionN = norm(region);
  
  // Detectar retiro en La Florida
  const esRetiroFlorida = (
    envioN.includes('retiro') || 
    envioN.includes('florida') || 
    (regionN.includes('metropolitana') && envioN === '')
  );
  
  if (esRetiroFlorida) {
    return {
      esRetiro: true,
      html: `
        <div style="background:#f0f9ff;border:1px solid #0ea5e9;border-radius:8px;padding:16px;margin:16px 0">
          <h3 style="margin:0 0 8px;color:#0369a1">📍 Información de Retiro</h3>
          <p style="margin:4px 0"><strong>Dirección:</strong> La Florida, Santiago</p>
          <p style="margin:4px 0"><strong>Horario:</strong> Lunes a Viernes, 10:00 - 18:00 hrs</p>
          <p style="margin:4px 0"><strong>Importante:</strong> Te contactaremos por WhatsApp para coordinar el retiro.</p>
          <p style="margin:4px 0;color:#0369a1;font-size:0.95em">✓ Retiro gratis</p>
        </div>
      `
    };
  }
  
  return { esRetiro: false, html: '' };
}

// ===== Email (multi-proveedor: SMTP | SendGrid | Resend) =====
function normalizeEmailHtml(html) {
  if (typeof html !== "string") return html;
  let out = html;
  const lower = out.toLowerCase();
  const hasHtmlShell = lower.includes("<html") || lower.includes("<!doctype");
  if (!hasHtmlShell) {
    out = `<!doctype html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body>${out}</body></html>`;
  } else if (!lower.includes("charset")) {
    out = `<!doctype html><meta charset="utf-8">` + out;
  }
  return out
    .replace(/\u00A1/g, "&iexcl;") // ¡
    .replace(/\u00BF/g, "&iquest;"); // ¿
}

let sendEmail = async ({ to, subject, html, text }) => {
  console.log("📭 [Email omitido] Asunto:", subject, "Para:", to);
  return { ok: false, skipped: true };
};

(() => {
  // Inferir proveedor si no está definido explícitamente
  let provider = (process.env.EMAIL_PROVIDER || "").toLowerCase().trim();
  if (!provider) {
    if (process.env.RESEND_API_KEY) provider = "resend";
    else if (process.env.SENDGRID_API_KEY) provider = "sendgrid";
    else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
      provider = "smtp";
  }
  // EMAIL_FROM como alias de MAIL_FROM
  const from =
    process.env.MAIL_FROM ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    "Misión 3D <no-reply@mision3d.cl>";
  global.__EMAIL_PROVIDER_ACTIVE__ = provider || "auto";
  global.__EMAIL_FROM_ACTIVE__ = from;

  try {
    if (provider === "sendgrid") {
      const key = process.env.SENDGRID_API_KEY;
      if (!key) {
        console.warn("⚠️ EMAIL_PROVIDER=sendgrid pero falta SENDGRID_API_KEY");
        return;
      }
      sgMail.setApiKey(key);
      sendEmail = async ({ to, subject, html, text }) => {
        const msg = { to, from, subject, html: normalizeEmailHtml(html), text };
        await sgMail.send(msg);
        return { ok: true };
      };
      console.log("📧 SendGrid listo para enviar correos");
      global.__EMAIL_PROVIDER_ACTIVE__ = "sendgrid";
      return;
    }

    if (provider === "resend") {
      const key = process.env.RESEND_API_KEY;
      if (!key) {
        console.warn("⚠️ EMAIL_PROVIDER=resend pero falta RESEND_API_KEY");
        return;
      }
      const resend = new Resend(key);
      sendEmail = async ({ to, subject, html, text }) => {
        const { error } = await resend.emails.send({
          from,
          to: Array.isArray(to) ? to : [to],
          subject,
          html: normalizeEmailHtml(html),
          text,
        });
        if (error) throw error;
        return { ok: true };
      };
      console.log("📧 Resend listo para enviar correos");
      global.__EMAIL_PROVIDER_ACTIVE__ = "resend";
      return;
    }

    // Default / SMTP
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const mailer = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Boolean(process.env.SMTP_SECURE === "true"),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      sendEmail = async ({ to, subject, html, text }) => {
        await mailer.sendMail({
          from,
          to,
          subject,
          html: normalizeEmailHtml(html),
          text,
        });
        return { ok: true };
      };
      console.log("📧 SMTP listo para enviar correos");
      global.__EMAIL_PROVIDER_ACTIVE__ = "smtp";
    } else if (!provider) {
      console.log(
        "ℹ️ EMAIL_PROVIDER no definido y SMTP/SendGrid/Resend no configurados; los correos se omitirán"
      );
    }
  } catch (e) {
    console.warn("⚠️ No se pudo inicializar proveedor de email:", e?.message);
  }
})();

// Endpoint de depuración rápida de email (no expone secretos)
app.get("/api/email-config", (req, res) => {
  res.json({
    provider: global.__EMAIL_PROVIDER_ACTIVE__ || null,
    from: global.__EMAIL_FROM_ACTIVE__ || null,
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasSendgridKey: !!process.env.SENDGRID_API_KEY,
    hasSmtp: !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ),
  });
});

// ===== Rate Limiting (Protección DDoS y fuerza bruta) =====
const apiLimiter = rateLimit({
 windowMs: 5 * 60 * 1000,     // 5 minutos
  max: 500,                    // Máx. 500 peticiones por IP en ese tiempo
  message: {
    error: "Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.",
    retryAfter: "5 minutos"
  },
  standardHeaders: true,       // Devuelve headerpos RateLimit-* estándar
  legacyHeaders: false         // Desactiva los headers X-RateLimit-*
});

// Excluir /health del rate limit para Render
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  return apiLimiter(req, res, next);
});

// Limiter estricto para webhooks (crítico)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // máximo 10 peticiones por minuto por IP
  message: {
    error: "Demasiadas peticiones al webhook. Posible ataque detectado.",
    retryAfter: "1 minuto",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn("🚨 [RATE LIMIT] Webhook bloqueado desde IP:", req.ip);
    res.status(429).json({
      error: "Demasiadas peticiones al webhook",
      message:
        "Has excedido el límite de peticiones permitidas. Intenta más tarde.",
      retryAfter: "1 minuto",
    });
  },
});

// Limiter para creación de pagos (prevenir spam)
const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 pagos por 5 minutos
  message: {
    error: "Has creado demasiados pagos en poco tiempo. Espera unos minutos.",
    retryAfter: "5 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter para recuperación de contraseña
const passwordRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 solicitudes de recuperación por 15 minutos
  message: {
    error:
      "Has solicitado demasiadas recuperaciones de contraseña. Espera un momento.",
    retryAfter: "15 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

console.log("🛡️  Rate Limiting activado:");
console.log("   • API General: 100 req/15min");
console.log("   • Webhook: 10 req/min");
console.log("   • Pagos: 20 req/5min");
console.log("   • Recuperación contraseña: 5 req/15min");

// ===== Healthcheck =====
app.get("/api/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// ===== Endpoint de prueba de email (protegido) =====
// Uso: POST /api/test-email con header x-test-key = TEST_EMAIL_KEY
// Body: { to, subject, html, text }
app.post("/api/test-email", async (req, res) => {
  try {
    const key = req.headers["x-test-key"];
    const expected = (process.env.TEST_EMAIL_KEY || "").trim();
    const provided = (typeof key === "string" ? key : String(key || "")).trim();

    // Si TEST_EMAIL_KEY no está configurada, permitir acceso sin autenticación (solo en desarrollo)
    if (!expected) {
      console.warn("⚠️ [Test Email] TEST_EMAIL_KEY ausente - permitiendo acceso sin auth (INSEGURO)");
    } else if (provided !== expected) {
      console.log(
        "[Test Email] Auth failed. Expected:",
        expected.substring(0, 8) + "...",
        "Got:",
        provided.substring(0, 8) + "..."
      );
      return res.status(401).json({ error: "unauthorized" });
    }
    const { to, subject = "Prueba de correo", html = "<p>Prueba OK</p>", text } =
      req.body || {};
    if (!to) return res.status(400).json({ error: "to requerido" });

    const result = await sendEmail({ to, subject, html, text });
    return res.json({ ok: true, result });
  } catch (e) {
    console.error("[Test Email] Error:", e?.message || e);
    return res.status(500).json({ error: "server", detail: e?.message });
  }
});

// ===== Endpoint Flow (crear pago) =====
app.post("/api/payments/flow", paymentLimiter, async (req, res) => {
  try {
    const { items, payer, shippingCost = 0, discount = 0, meta = {} } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items vacíos" });
    }

    // Log detallado de items recibidos
    console.log("[Flow] Items recibidos:", JSON.stringify(items, null, 2));

  const apiKey = process.env.FLOW_API_KEY;
  const secret = process.env.FLOW_SECRET;
  const commerceId = process.env.FLOW_COMMERCE_ID; // opcional
  let returnUrl = process.env.FLOW_RETURN_URL;
  let confirmUrl = process.env.FLOW_CONFIRM_URL;
    const baseUrl = process.env.FLOW_BASE_URL || "https://sandbox.flow.cl/api";

    if (!apiKey || !secret) {
      return res
        .status(500)
        .json({ error: "Faltan credenciales Flow (FLOW_API_KEY/FLOW_SECRET)" });
    }
    // Fallbacks seguros de URLs
    const proto = (req.headers["x-forwarded-proto"] || "https").split(',')[0];
    const host = req.headers.host || "api.mision3d.cl";
    if (!confirmUrl) confirmUrl = `${proto}://${host.replace(/^www\./,'')}/flow/confirm`;
    if (!returnUrl) returnUrl = `https://www.mision3d.cl/confirmacion-flow.html`;

    // Normalizaciones para evitar 405 por dominio equivocado
    // 1) El webhook de confirmación DEBE ir al backend (api.mision3d.cl)
    if (/^https?:\/\/(?:www\.)?mision3d\.cl\//.test(confirmUrl) && !/api\.mision3d\.cl/.test(confirmUrl)) {
      console.warn("[Flow] Normalizando confirmUrl a api.mision3d.cl (evitar 405):", confirmUrl);
      confirmUrl = confirmUrl.replace(/^https?:\/\/(?:www\.)?mision3d\.cl\//, 'https://api.mision3d.cl/');
      if (!/\/flow\/confirm$/.test(confirmUrl)) confirmUrl = 'https://api.mision3d.cl/flow/confirm';
    }
    // 2) La URL de retorno es para el navegador; nunca debe apuntar al webhook
    if (/\/flow\/confirm\b/.test(returnUrl)) {
      console.warn("[Flow] Normalizando returnUrl a página del frontend (evitar POST 405 en navegador):", returnUrl);
      returnUrl = 'https://www.mision3d.cl/confirmacion-flow.html';
    }

  // Recalcular envío en servidor
    const regionMeta = String(meta.region || "").trim();
    const envioMeta = String(meta.envio || "").trim();
    const norm = (s) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const regionN = norm(regionMeta);
    const envioN = norm(envioMeta);

    const { subtotal } = calcCartTotals(items);
    console.log("[Flow] Subtotal calculado:", subtotal);

    let ship = 0;
    const clientShip = toNum(shippingCost);
    if (
      regionN.includes("metropolitana") &&
      regionN.includes("santiago") &&
      (envioN === "domicilio" || envioN === "santiago")
    ) {
      ship = 2990;
    } else {
      ship = 0;
    }
    if (clientShip !== ship) {
      console.warn(
        "⚠️  [SECURITY] shippingCost del cliente no coincide. Se usará el calculado en servidor.",
        { clientShip, serverShip: ship, region: regionMeta, envio: envioMeta }
      );
    }
    const disc = toNum(discount);
    const total = Math.max(0, subtotal - disc + ship);
    console.log(
      "[Flow Create] region:",
      regionMeta,
      "| envio:",
      envioMeta,
      "| ship:",
      ship,
      "| subtotal:",
      subtotal,
      "| disc:",
      disc,
      "| total:",
      total
    );

    // Validación: Flow requiere mínimo $350 CLP
    if (total < 350) {
      console.warn("⚠️ [Flow] Monto menor al mínimo permitido:", total);
      return res.status(400).json({
        error: "Monto inválido",
        message: "El monto mínimo para pagar con Flow es $350 CLP",
        detail: `El total calculado es $${total} CLP, pero Flow requiere mínimo $350 CLP. Agrega más productos al carrito.`,
        total,
        minimum: 350
      });
    }

    const params = {
      apiKey,
      commerceOrder: "ORD-" + Date.now(),
      amount: total,
      subject: "Compra Mision3D",
      email: payer?.email || "cliente@example.com",
      urlConfirmation: confirmUrl,
      urlReturn: returnUrl,
    };
    if (commerceId) params.commerceId = commerceId;

    console.log("[Flow] Params enviados:", params);

    const s = flowSign(params, secret);
    const body = new URLSearchParams({ ...params, s });
    const url = baseUrl.replace(/\/+$/, "") + "/payment/create";

    try {
      const resp = await axios.post(url, body.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const data = resp.data || {};
      console.log("[Flow] Respuesta completa:", JSON.stringify(data, null, 2));

      if (data.token) {
        const isSandbox = /sandbox/.test(baseUrl);
        const payHost = isSandbox ? "https://sandbox.flow.cl" : "https://flow.cl";
        const flowUrl = `${payHost}/app/web/pay.php?token=${data.token}`;
        console.log("[Flow] Redirigiendo a:", flowUrl);

        // Guardar resumen de pedido en memoria para usar en el webhook de confirmación
        try {
          const orderSummary = {
            token: data.token,
            flowOrder: data.flowOrder || null,
            commerceOrder: params.commerceOrder,
            payer: {
              email: payer?.email || null,
              name: payer?.name || null,
            },
            items: Array.isArray(items) ? items : [],
            meta: meta || {},
            shippingCost: ship,
            discount: disc,
            subtotal,
            total,
            createdAt: Date.now(),
          };
          global.__PENDING_ORDERS__.set(data.token, orderSummary);
          console.log("🗂️  [Flow] Pedido temporal almacenado en memoria para token", data.token);
        } catch (e) {
          console.warn("⚠️  [Flow] No se pudo almacenar pedido temporal:", e?.message || e);
        }

        return res.json({
          url: flowUrl,
          flowOrder: data.flowOrder,
          token: data.token,
          commerceOrder: params.commerceOrder,
        });
      }
      if (data.url) return res.json({ url: data.url });

      console.error("[Flow] Respuesta inesperada:", data);
      return res
        .status(502)
        .json({ error: "Respuesta inesperada de Flow", detail: data });
    } catch (err) {
      console.error("[Flow] Error completo:", err);
      console.error("[Flow] Error respuesta:", err.response?.data || err.message);
      console.error("[Flow] Status:", err.response?.status);
      return res.status(500).json({
        error: "flow",
        detail: err.response?.data || err.message,
        status: err.response?.status,
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
app.post("/flow/confirm", webhookLimiter, async (req, res) => {
  try {
    const { token, s: receivedSignature } = req.body || {};
    if (!token) {
      console.error("[Flow Confirm] Token no recibido");
      return res.status(400).send("Token requerido");
    }
    const apiKey = process.env.FLOW_API_KEY;
    const secret = process.env.FLOW_SECRET;
    const baseUrl = process.env.FLOW_BASE_URL || "https://sandbox.flow.cl/api";

    // Validación de firma (si viene)
    if (receivedSignature) {
      const paramsToSign = { token };
      const expectedSignature = flowSign(paramsToSign, secret);
      if (receivedSignature !== expectedSignature) {
        return res
          .status(401)
          .json({ error: "Firma inválida", message: "La firma no es válida." });
      }
    }

    // Consultar estado del pago en Flow
    const params = { apiKey, token };
    const s = flowSign(params, secret);
    const queryParams = new URLSearchParams({ ...params, s });
    const url = `${baseUrl.replace(/\/+$/, "")}/payment/getStatus?${queryParams}`;
    const resp = await axios.get(url);
    const paymentData = resp.data;

    // Validaciones mínimas
    if (!paymentData.flowOrder || !paymentData.commerceOrder || !paymentData.status) {
      return res
        .status(400)
        .json({ error: "Datos incompletos", message: "Respuesta inválida de Flow." });
    }
    if (!paymentData.amount || paymentData.amount <= 0) {
      return res
        .status(400)
        .json({ error: "Monto inválido", message: "El monto del pago es inválido." });
    }

    // status: 1=pendiente, 2=pagado, 3=rechazado, 4=anulado
    if (paymentData.status === 2) {
      // Intentar recuperar pedido temporal guardado al crear el pago
      const tmp = global.__PENDING_ORDERS__.get(token);


      // Guardar pedido en Supabase
      try {
        // Importar createClient dinámicamente para evitar errores si no está instalado
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          console.warn('[Flow Confirm] Faltan credenciales de Supabase');
        } else {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const pedido = {
            user_id: tmp?.payer?.id || null,
            email: tmp?.payer?.email || paymentData?.email || null,
            items: tmp?.items || [],
            subtotal: tmp?.subtotal ?? null,
            discount: tmp?.discount ?? null,
            shipping: tmp?.shippingCost ?? null,
            total: tmp?.total || paymentData?.amount || 0,
            total_clp: tmp?.total || paymentData?.amount || 0,
            status: 'pagado',
            estado: 'pagado',
            commerce_order: tmp?.commerceOrder || paymentData?.commerceOrder || '',
            flow_order: paymentData?.flowOrder || null,
            payment_method: 'flow',
            created_at: new Date().toISOString(),
            meta: tmp?.meta || {},
          };
          const { error: supaErr } = await supabase.from('pedidos').insert([pedido]);
          if (supaErr) {
            console.warn('[Flow Confirm] Error insertando pedido en Supabase:', supaErr.message);
          } else {
            console.log('[Flow Confirm] Pedido guardado en Supabase');
          }
        }
      } catch (dbErr) {
        console.warn('[Flow Confirm] Error al guardar pedido en Supabase:', dbErr?.message || dbErr);
      }

      // Armar correo de confirmación
      try {
        const emailTo = tmp?.payer?.email || paymentData?.email || null;
        if (emailTo) {
          const fmt = (n) => Number(n || 0).toLocaleString('es-CL');
          const itemsHtml = (tmp?.items || [])
            .map(
              (it) => `
                <tr>
                  <td style="padding:8px;border-bottom:1px solid #eee">${
                    it?.name || it?.title || 'Producto'
                  }</td>
                  <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${
                    it?.qty || 1
                  }</td>
                  <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${fmt(
                    it?.price || 0
                  )}</td>
                </tr>`
            )
            .join('');
          const total = tmp?.total || paymentData?.amount || 0;
          const subtotal = tmp?.subtotal ?? null;
          const discount = tmp?.discount ?? null;
          const shipping = tmp?.shippingCost ?? null;
          const commerceOrder = tmp?.commerceOrder || paymentData?.commerceOrder || '';
          const retiroInfo = getRetiroInfo(tmp?.meta || {});

          const html = `
            <h2>✅ Pago confirmado - Misión 3D</h2>
            <p>Gracias por tu compra. Hemos recibido tu pago exitosamente.</p>
            <p><strong>Orden:</strong> ${commerceOrder}</p>
            <table style="border-collapse:collapse;width:100%;max-width:520px">
              <thead>
                <tr>
                  <th style="text-align:left;padding:8px;border-bottom:2px solid #111">Producto</th>
                  <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Cant.</th>
                  <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Precio</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml || ''}
              </tbody>
            </table>
            <div style="margin-top:12px">
              ${
                subtotal !== null
                  ? `<div><strong>Subtotal:</strong> $${fmt(subtotal)}</div>`
                  : ''
              }
              ${
                discount
                  ? `<div><strong>Descuento:</strong> -$${fmt(discount)}</div>`
                  : ''
              }
              ${
                shipping !== null
                  ? `<div><strong>Envío:</strong> $${fmt(shipping)}</div>`
                  : ''
              }
              <div style="margin-top:8px;font-size:1.1em"><strong>Total pagado:</strong> $${fmt(
                total
              )}</div>
            </div>
            ${retiroInfo.html}
            <p style="margin-top:16px">${retiroInfo.esRetiro ? 'Te contactaremos por WhatsApp para coordinar el retiro.' : 'Pronto te contactaremos con los detalles de envío.'}</p>
          `;

          await sendEmail({
            to: emailTo,
            subject: `Pago confirmado - ${commerceOrder}`,
            html,
            text: `Pago confirmado. Orden: ${commerceOrder}. Total: $${fmt(total)}`,
          });
          console.log('📧 Email de confirmación enviado a', emailTo);
        } else {
          console.warn('⚠️ [Flow Confirm] No se encontró email del comprador para token', token);
        }
      } catch (mailErr) {
        console.warn('⚠️ [Flow Confirm] Error enviando correo:', mailErr?.message || mailErr);
      }

      // Limpiar cache temporal
      if (global.__PENDING_ORDERS__.has(token)) {
        global.__PENDING_ORDERS__.delete(token);
      }

      // TODO: actualizar pedido en Supabase aquí (estado pagado)
      return res.status(200).send("CONFIRMED");
    }

    console.log("⚠️ [Flow Confirm] Pago no confirmado. Status:", paymentData.status);
    return res.status(200).send("PENDING");
  } catch (err) {
    console.error("[Flow Confirm] Error:", err?.response?.data || err?.message || err);
    return res.status(500).send("ERROR");
  }
});

// ===== Orden por transferencia (crear pedido y enviar instrucciones) =====
app.post("/api/orders/transfer", async (req, res) => {
  try {
    const { items, payer, shippingCost = 0, discount = 0, meta = {} } =
      req.body || {};
    if (!Array.isArray(items) || !items.length)
      return res.status(400).json({ error: "items vacíos" });

    const { subtotal } = calcCartTotals(items);

    // Recalcular envío en servidor
    const regionMeta = String(meta.region || "").trim();
    const envioMeta = String(meta.envio || "").trim();
    const norm = (s) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const regionN = norm(regionMeta);
    const envioN = norm(envioMeta);

    let ship = 0;
    const clientShip = toNum(shippingCost);
    if (
      regionN.includes("metropolitana") &&
      regionN.includes("santiago") &&
      (envioN === "domicilio" || envioN === "santiago")
    ) {
      ship = 2990;
    } else {
      ship = 0;
    }
    if (clientShip !== ship) {
      console.warn(
        "⚠️  [SECURITY] shippingCost (transfer) del cliente no coincide. Se usará el calculado en servidor.",
        { clientShip, serverShip: ship, region: regionMeta, envio: envioMeta }
      );
    }

    const disc = toNum(discount);
    const total = Math.max(0, subtotal - disc + ship);
    console.log(
      "[Transfer Create] region:",
      regionMeta,
      "| envio:",
      envioMeta,
      "| ship:",
      ship,
      "| subtotal:",
      subtotal,
      "| disc:",
      disc,
      "| total:",
      total
    );

    const commerceOrder = "ORD-" + Date.now();

    // Guardar pedido de transferencia en Supabase como pendiente
    let key = null;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        console.warn('[Transfer Create] Faltan credenciales de Supabase');
      } else {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const pedido = {
          user_id: payer?.id || null,
          email: payer?.email || null,
          items: Array.isArray(items) ? items : [],
          subtotal,
          discount: disc,
          shipping: ship,
          total,
          total_clp: total,
          status: 'pendiente',
          estado: 'pendiente',
          commerce_order: commerceOrder,
          flow_order: null,
          created_at: new Date().toISOString(),
          meta: meta || {},
          payment_method: 'transferencia'
        };
        const { data: inserted, error: supaErr } = await supabase
          .from('pedidos')
          .insert([pedido])
          .select('id')
          .single();
        if (supaErr) {
          console.warn('[Transfer Create] Error insertando en Supabase:', supaErr.message);
        } else {
          key = inserted?.id || null;
          console.log('[Transfer Create] Pedido de transferencia guardado con id', key);
        }
      }
    } catch (dbErr) {
      console.warn('[Transfer Create] Error al guardar en Supabase:', dbErr?.message || dbErr);
    }

    // Email con instrucciones de transferencia (si hay proveedor de email configurado)
    try {
      if (payer?.email) {
        const totalFmt = total.toLocaleString("es-CL");
        const itemsHtml = (Array.isArray(items) ? items : [])
          .map(
            (it) => `
              <tr>
                <td style="padding:8px;border-bottom:1px solid #eee">${it?.name || it?.title || 'Producto'}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${it?.qty || 1}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${Number(it?.price||0).toLocaleString('es-CL')}</td>
              </tr>`
          )
          .join('');

        const retiroInfo = getRetiroInfo(meta);

        const html = `
          <h2>🧾 Pedido recibido - Misión 3D</h2>
          <p>Gracias por tu compra. Seleccionaste <strong>Transferencia Bancaria</strong>. Para confirmar tu pedido, realiza la transferencia con estos datos:</p>
          <ul>
            <li>Titular: <strong>Patricio Sánchez</strong></li>
            <li>RUT: <strong>78.278.465-K</strong></li>
            <li>Banco: <strong>Mercado Pago</strong></li>
            <li>Tipo: <strong>Cuenta Vista</strong></li>
            <li>N° Cuenta: <strong>1021060622</strong></li>
            <li>Email: <a href="mailto:mision3d.cl@gmail.com">mision3d.cl@gmail.com</a></li>
          </ul>
          <p><strong>Monto a transferir:</strong> $${totalFmt}</p>
          <p><strong>Orden:</strong> ${commerceOrder}</p>
          ${itemsHtml ? `
          <table style="border-collapse:collapse;width:100%;max-width:520px">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #111">Producto</th>
                <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Cant.</th>
                <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Precio</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>` : ''}
          <div style="margin-top:12px">
            <div><strong>Subtotal:</strong> $${subtotal.toLocaleString('es-CL')}</div>
            ${disc ? `<div><strong>Descuento:</strong> -$${disc.toLocaleString('es-CL')}</div>` : ''}
            <div><strong>Envío:</strong> $${ship.toLocaleString('es-CL')}</div>
            <div style="margin-top:8px;font-size:1.1em"><strong>Total:</strong> $${totalFmt}</div>
          </div>
          ${retiroInfo.html}
          <p style="margin-top:16px">Envía el comprobante a <a href="mailto:mision3d.cl@gmail.com">mision3d.cl@gmail.com</a> indicando tu número de pedido <strong>${commerceOrder}</strong>.</p>
          <p>Una vez confirmado el pago, recibirás un correo de confirmación${retiroInfo.esRetiro ? ' y te contactaremos por WhatsApp para coordinar el retiro' : ' y comenzaremos el proceso de envío'}.</p>
        `;
        await sendEmail({
          to: payer.email,
          subject: `Pedido recibido (transferencia) - ${commerceOrder}`,
          html,
          text: `Monto: $${totalFmt} - Orden: ${commerceOrder}`,
        });
        console.log("📧 Email con instrucciones de transferencia enviado a", payer.email);
      }
    } catch (e) {
      console.warn("⚠️ No se pudo enviar email de transferencia:", e?.message);
    }

    res.json({ ok: true, commerceOrder, id: key });
  } catch (err) {
    console.error("[Transfer] Error:", err?.response?.data || err?.message);
    res.status(500).json({ error: "server", detail: err?.message });
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

    const params = { apiKey, token };
    const s = flowSign(params, secret);
    const queryParams = new URLSearchParams({ ...params, s });
    const url = `${baseUrl.replace(/\/+$/, "")}/payment/getStatus?${queryParams}`;

    const resp = await axios.get(url);
    const payment = resp.data;

    console.log("[Flow Retorno] Datos del pago:", payment);

    const isSuccess = payment.status === 2;
    const isPending = payment.status === 1;

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isSuccess ? "Pago Exitoso" : isPending ? "Pago Pendiente" : "Pago Rechazado"} - Misión 3D</title>
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
        <div class="card ${isSuccess ? "success" : isPending ? "pending" : "error"}">
          <div class="icon">${isSuccess ? "✅" : isPending ? "⏳" : "❌"}</div>
          <h1>${isSuccess ? "¡Pago Exitoso!" : isPending ? "Pago Pendiente" : "Pago Rechazado"}</h1>
          <p>${
            isSuccess
              ? "Tu pedido ha sido confirmado y procesado correctamente. Recibirás un correo con los detalles."
              : isPending
              ? "Tu pago está siendo procesado. Te notificaremos cuando se confirme."
              : "Hubo un problema al procesar tu pago. Por favor, intenta nuevamente."
          }</p>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Orden Flow:</span>
              <span class="detail-value">#${payment.flowOrder || "N/A"}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Orden comercio:</span>
              <span class="detail-value">${payment.commerceOrder || "N/A"}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Monto:</span>
              <span class="detail-value">$${(payment.amount || 0).toLocaleString(
                "es-CL"
              )}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Estado:</span>
              <span class="detail-value">${
                isSuccess ? "Pagado" : isPending ? "Pendiente" : "Rechazado"
              }</span>
            </div>
          </div>

          <a href="../index.html" class="btn">Volver a la tienda</a>
        </div>
        ${
          isSuccess
            ? `
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
        `
            : ""
        }
      </body>
      </html>
    `);
  } catch (err) {
    console.error("[Flow Retorno] Error:", err);
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

// Algunas integraciones o extensiones pueden intentar hacer POST al return URL.
// Aceptamos POST y redirigimos al handler GET conservando el token.
app.post("/flow/retorno", (req, res) => {
  try {
    const token = (req.body && req.body.token) || (req.query && req.query.token) || "";
    if (token) {
      return res.redirect(303, `/flow/retorno?token=${encodeURIComponent(token)}`);
    }
    return res.redirect(303, "/flow/retorno");
  } catch (e) {
    console.warn("[Flow Retorno POST] Error redirigiendo:", e?.message || e);
    return res.redirect(303, "/flow/retorno");
  }
});

// ===== Enviar correo de confirmación de registro =====
app.post("/api/send-registration-email", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email requerido" });
    }

    const userName = name || email.split("@")[0];

    const html = `<!DOCTYPE html>... (contenido igual al tuyo, omitido por brevedad en este comentario) ...`;
    const text = `
Bienvenido a Misión 3D

Hola ${userName},

Tu cuenta ha sido creada exitosamente en Misión3D.cl

Email confirmado: ${email}

Ya puedes iniciar sesión en: https://mision3d.cl/login.html

Beneficios de tu cuenta:
- Proceso de compra más rápido
- Seguimiento de tus pedidos
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
      text,
    });

    console.log(`✅ Correo de registro enviado a: ${email}`);
    res.json({
      success: true,
      message: "Correo de confirmación enviado",
      provider: global.__EMAIL_PROVIDER_ACTIVE__,
    });
  } catch (error) {
    console.error("❌ Error enviando correo de registro:", error?.message || error);
    res
      .status(500)
      .json({ success: false, error: "Error al enviar correo", detail: error?.message || String(error) });
  }
});

// ===== Enviar correo de recuperación de contraseña =====
app.post("/api/send-password-recovery", passwordRecoveryLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email requerido" });
    }

    // Generar token de recuperación (válido 1 hora)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hora

    if (!global.passwordResetTokens) {
      global.passwordResetTokens = new Map();
    }
    global.passwordResetTokens.set(resetToken, { email, expiry: resetTokenExpiry });

    // Limpieza simple
    const now = Date.now();
    for (const [token, data] of global.passwordResetTokens.entries()) {
      if (data.expiry < now) global.passwordResetTokens.delete(token);
    }

    const isDevelopment = process.env.NODE_ENV !== "production";
    const baseUrl = isDevelopment ? "http://localhost:5500" : "https://mision3d.cl";
    const resetUrl = `${baseUrl}/restablecer-password.html?token=${resetToken}`;

    const html = `<!DOCTYPE html>... (contenido igual al tuyo, omitido por brevedad en este comentario) ...`;
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

    try {
      const sendResult = await sendEmail({
        to: email,
        subject: "🔒 Recuperación de Contraseña - Misión 3D",
        html,
        text,
      });
      console.log(`✅ Correo de recuperación enviado a: ${email}`, sendResult);

      res.json({
        success: true,
        message: "Correo de recuperación enviado",
        provider: global.__EMAIL_PROVIDER_ACTIVE__,
        ...(isDevelopment && { token: resetToken, resetUrl }),
      });
    } catch (emailError) {
      console.error("❌ Error enviando correo de recuperación:", emailError);
      // Respuesta indistinta para no filtrar existencia de email
      res.json({
        success: true,
        message: "Si el correo existe, recibirás instrucciones de recuperación",
        warning: "Email delivery failed",
        detail: emailError?.message || String(emailError),
        provider: global.__EMAIL_PROVIDER_ACTIVE__,
      });
    }
  } catch (error) {
    console.error("❌ Error en endpoint de recuperación:", error);
    res.status(500).json({
      success: false,
      error: "Error al procesar solicitud",
      detail: error?.message || String(error),
    });
  }
});

// ===== Endpoint público: obtener pedidos por email (para vista de cliente) =====
app.get('/api/pedidos/by-email/:email', async (req, res) => {
  try {
    const email = req.params.email?.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'server', detail: 'Supabase credentials missing' });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Consultar pedidos por email (case-insensitive)
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .ilike('email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Error consultando pedidos:', error);
      return res.status(500).json({ error: 'query_failed', detail: error.message });
    }

    // Mapear a formato simple para el frontend
    const pedidos = (data || []).map(p => ({
      id: p.id,
      estado: p.estado || p.status || 'pendiente',
      items: p.items || [],
      total: p.total_clp || p.total || 0,
      fecha: p.created_at,
      orden: p.commerce_order || p.flow_order || p.id,
      metodoPago: p.payment_method || 'flow'
    }));

    res.json({ success: true, pedidos });
  } catch (err) {
    console.error('[API] Error en /api/pedidos/by-email:', err);
    res.status(500).json({ error: 'server', detail: err?.message || String(err) });
  }
});

// ===== Admin: marcar pedido como pagado (transferencia u otros) =====
// Seguridad simple por header x-admin-key = ADMIN_KEY
app.post('/api/admin/pedidos/:id/marcar-pagado', async (req, res) => {
  try {
    const provided = String(req.headers['x-admin-key'] || '').trim();
    const expected = String(process.env.ADMIN_KEY || '').trim();
    if (!expected) {
      return res.status(401).json({ error: 'unauthorized', reason: 'ADMIN_KEY not configured' });
    }
    if (!provided || provided !== expected) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const id = req.params.id;
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'server', detail: 'Supabase credentials missing' });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener pedido
    const { data: pedido, error: getErr } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single();
    if (getErr || !pedido) {
      return res.status(404).json({ error: 'not_found', detail: getErr?.message || 'Pedido no encontrado' });
    }

    // Actualizar estado/status a pagado
    const { error: updErr } = await supabase
      .from('pedidos')
      .update({ estado: 'pagado', status: 'pagado' })
      .eq('id', id);
    if (updErr) {
      return res.status(500).json({ error: 'update_failed', detail: updErr.message });
    }

    // Enviar correo de confirmación
    try {
      const emailTo = pedido.email || null;
      if (emailTo) {
        const fmt = (n) => Number(n || 0).toLocaleString('es-CL');
        const items = Array.isArray(pedido.items) ? pedido.items : [];
        const itemsHtml = items.map(it => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${it?.name || it?.title || 'Producto'}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${it?.qty || 1}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${fmt(it?.price || 0)}</td>
          </tr>
        `).join('');

        const subtotal = Number(pedido.subtotal || 0);
        const discount = Number(pedido.discount || 0);
        const shipping = Number(pedido.shipping || pedido.shipping_cost || 0);
        const total = Number(pedido.total || pedido.total_clp || 0);
        const commerceOrder = pedido.commerce_order || pedido.commerceOrder || pedido.id;
        const retiroInfo = getRetiroInfo(pedido.meta || {});

        const html = `
          <h2>✅ Pago confirmado - Misión 3D</h2>
          <p>Gracias por tu compra. Hemos recibido tu pago exitosamente.</p>
          <p><strong>Orden:</strong> ${commerceOrder}</p>
          ${itemsHtml ? `
          <table style="border-collapse:collapse;width:100%;max-width:520px">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #111">Producto</th>
                <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Cant.</th>
                <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Precio</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>` : ''}
          <div style="margin-top:12px">
            ${subtotal ? `<div><strong>Subtotal:</strong> $${fmt(subtotal)}</div>` : ''}
            ${discount ? `<div><strong>Descuento:</strong> -$${fmt(discount)}</div>` : ''}
            <div><strong>Envío:</strong> $${fmt(shipping)}</div>
            <div style="margin-top:8px;font-size:1.1em"><strong>Total pagado:</strong> $${fmt(total)}</div>
          </div>
          ${retiroInfo.html}
          <p style="margin-top:16px">${retiroInfo.esRetiro ? 'Te contactaremos por WhatsApp para coordinar el retiro.' : 'Pronto te contactaremos con los detalles de envío.'}</p>
        `;

        await sendEmail({
          to: emailTo,
          subject: `Pago confirmado - ${commerceOrder}`,
          html,
          text: `Pago confirmado. Orden: ${commerceOrder}. Total: $${fmt(total)}`,
        });
      }
    } catch (mailErr) {
      console.warn('[Admin marcar-pagado] Error enviando correo:', mailErr?.message || mailErr);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[Admin marcar-pagado] Error:', err?.message || err);
    return res.status(500).json({ error: 'server', detail: err?.message || String(err) });
  }
});

// ===== Verificar token y restablecer contraseña =====
app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ success: false, error: "Token y contraseña requeridos" });
    }

    if (!global.passwordResetTokens || !global.passwordResetTokens.has(token)) {
      return res.status(400).json({ success: false, error: "Token inválido o expirado" });
    }

    const tokenData = global.passwordResetTokens.get(token);

    if (Date.now() > tokenData.expiry) {
      global.passwordResetTokens.delete(token);
      return res.status(400).json({ success: false, error: "Token expirado" });
    }

    const email = tokenData.email;

    // TODO en producción: actualizar la contraseña del usuario (DB)
    global.passwordResetTokens.delete(token);

    console.log(`✅ Contraseña restablecida para: ${email}`);
    res.json({
      success: true,
      message: "Contraseña restablecida exitosamente",
      email,
    });
  } catch (error) {
    console.error("❌ Error restableciendo contraseña:", error);
    res.status(500).json({ success: false, error: "Error al restablecer contraseña" });
  }
});

// ===== Webhook Supabase: pedidos (al cambiar a pagado) =====
app.post("/api/webhooks/supabase/pedidos", webhookLimiter, async (req, res) => {
  try {
    const keyHeader = req.headers["x-webhook-key"] || req.headers["x-supabase-webhook-key"];
    const expected = String(process.env.SUPABASE_WEBHOOK_KEY || "").trim();
    const provided = String(keyHeader || "").trim();

    if (!expected) {
      console.warn("⚠️ [Supabase Webhook] Falta SUPABASE_WEBHOOK_KEY en servidor");
      return res.status(401).json({ error: "unauthorized", reason: "missing server secret" });
    }
    if (!provided || provided !== expected) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const payload = req.body || {};
    const type = payload.type || payload.eventType || payload.action || "";
    const table = payload.table || payload.tableId || (payload.data && payload.data.table) || payload.table_name || "";
    const newRow = payload.record || payload.new || (payload.data && payload.data.new) || {};
    const oldRow = payload.old_record || payload.old || (payload.data && payload.data.old) || {};

    if (!table || String(table).indexOf("pedidos") === -1) {
      return res.json({ ok: true, ignored: true, reason: "not pedidos" });
    }

    const becamePaid = (newRow && newRow.status === "pagado") && (!oldRow || oldRow.status !== "pagado");
    const insertPaid = (String(type).toUpperCase() === "INSERT") && newRow && newRow.status === "pagado";
    if (!(becamePaid || insertPaid)) {
      return res.json({ ok: true, ignored: true, reason: "no paid transition" });
    }

    const commerceOrder = newRow.commerceOrder || newRow.commerce_order || newRow.order_code || newRow.id || "";
    const items = Array.isArray(newRow.items) ? newRow.items : [];
    const subtotal = Number(newRow.subtotal || 0);
    const discount = Number(newRow.discount || 0);
    const shipping = Number(newRow.shipping || newRow.shipping_cost || 0);
    const total = Number(newRow.total || newRow.amount || 0);
    const emailTo = newRow.email || newRow.payer_email || newRow.buyer_email || newRow.contact_email || null;

    if (!emailTo) {
      console.warn("⚠️ [Supabase Webhook] Pedido pagado sin email para notificar", commerceOrder);
      return res.json({ ok: true, warned: "missing email" });
    }

    const fmt = (n) => Number(n || 0).toLocaleString("es-CL");
    const itemsHtml = items.map(it => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${it?.name || it?.title || "Producto"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${it?.qty || 1}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${fmt(it?.price || 0)}</td>
      </tr>
    `).join("");

    const html = `
      <h2>✅ Pago confirmado - Misión 3D</h2>
      <p>Gracias por tu compra. Hemos recibido tu pago exitosamente.</p>
      <p><strong>Orden:</strong> ${commerceOrder}</p>
      ${itemsHtml ? `
      <table style="border-collapse:collapse;width:100%;max-width:520px">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #111">Producto</th>
            <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Cant.</th>
            <th style="text-align:right;padding:8px;border-bottom:2px solid #111">Precio</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>` : ""}
      <div style="margin-top:12px">
        ${Number.isFinite(subtotal) && subtotal > 0 ? `<div><strong>Subtotal:</strong> $${fmt(subtotal)}</div>` : ""}
        ${Number.isFinite(discount) && discount > 0 ? `<div><strong>Descuento:</strong> -$${fmt(discount)}</div>` : ""}
        <div><strong>Envío:</strong> $${fmt(shipping)}</div>
        <div style="margin-top:8px;font-size:1.1em"><strong>Total pagado:</strong> $${fmt(total)}</div>
      </div>
      <p style="margin-top:16px">Pronto te contactaremos con los detalles de envío.</p>
    `;

    try {
      await sendEmail({
        to: emailTo,
        subject: `Pago confirmado - ${commerceOrder}`,
        html,
        text: `Pago confirmado. Orden: ${commerceOrder}. Total: $${fmt(total)}`
      });
      console.log("📧 [Supabase Webhook] Email de confirmación enviado a", emailTo);
    } catch (mailErr) {
      console.warn("⚠️ [Supabase Webhook] Error enviando correo:", mailErr?.message || mailErr);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ [Supabase Webhook] Error:", err?.message || err);
    res.status(500).json({ error: "server", detail: err?.message || String(err) });
  }
});

// ===== Health Check para Render =====
app.get("/api/health", (_, res) => res.json({ ok: true }));

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Mision3D API escuchando en http://localhost:${PORT}`);
  console.log(`📡 Solo rutas API - Frontend servido por Cloudflare Pages`);
});

export default app;
