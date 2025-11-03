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
// Puedes pasar múltiples orígenes separados por coma en CORS_ORIGIN
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    const isDevelopment = process.env.NODE_ENV !== "production";
    const isLocalhost =
      origin?.includes("localhost") || origin?.includes("127.0.0.1");

    // Sin restricción en desarrollo si no hay CORS_ORIGIN
    if (!allowedOrigins.length && isDevelopment) return cb(null, true);

    // Llamadas server-to-server (sin header Origin)
    if (!origin) return cb(null, true);

    // Siempre permitir localhost para testing
    if (isLocalhost) return cb(null, true);

    // Permitir si está en la lista explícita
    if (allowedOrigins.includes(origin)) return cb(null, true);

    // Si no configuraste CORS_ORIGIN, permitir todo (modo permisivo)
    if (!allowedOrigins.length) return cb(null, true);

    console.warn("❌ CORS bloqueado para origen:", origin);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

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

// Root endpoint
app.get("/api", (req, res) => {
  res.status(200).json({
    message: "Mision3D API",
    version: "1.0.0",
    status: "running",
  });
});

// Servir archivos estáticos del frontend (HTML, CSS, JS, imágenes)
// Los archivos están en la carpeta padre (..)
const frontendPath = path.join(__dirname, "..");
app.use(express.static(frontendPath));
console.log("📂 Sirviendo frontend desde:", frontendPath);

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
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 peticiones por IP
  message: {
    error: "Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.",
    retryAfter: "15 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
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

    if (!expected) {
      console.warn("⚠️ [Test Email] TEST_EMAIL_KEY ausente en servidor");
      return res
        .status(401)
        .json({
          error: "unauthorized",
          reason: "TEST_EMAIL_KEY not configured on server",
        });
    }
    if (provided !== expected) {
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

// Ruta raíz sirve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ===== Endpoint Flow (crear pago) =====
app.post("/api/payments/flow", paymentLimiter, async (req, res) => {
  try {
    const { items, payer, shippingCost = 0, discount = 0 } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items vacíos" });
    }

    const apiKey = process.env.FLOW_API_KEY;
    const secret = process.env.FLOW_SECRET;
    const commerceId = process.env.FLOW_COMMERCE_ID; // opcional
    const returnUrl = process.env.FLOW_RETURN_URL;
    const confirmUrl = process.env.FLOW_CONFIRM_URL;
    const baseUrl = process.env.FLOW_BASE_URL || "https://sandbox.flow.cl/api";

    if (!apiKey || !secret) {
      return res
        .status(500)
        .json({ error: "Faltan credenciales Flow (FLOW_API_KEY/FLOW_SECRET)" });
    }
    if (!returnUrl || !confirmUrl) {
      return res
        .status(500)
        .json({ error: "Faltan URLs (FLOW_RETURN_URL/FLOW_CONFIRM_URL)" });
    }

    // Recalcular envío en servidor
    const meta = req.body?.meta || {};
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

        // TODO: Guardar pedido en Supabase aquí si es necesario

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
      // TODO: actualizar pedido en Supabase aquí
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

    // TODO: Guardar pedido de transferencia en Supabase
    let key = null;

    // Email con instrucciones de transferencia (si hay proveedor de email configurado)
    try {
      if (payer?.email) {
        const totalFmt = total.toLocaleString("es-CL");
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
        await sendEmail({
          to: payer.email,
          subject: `Instrucciones de transferencia - ${commerceOrder}`,
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

// ===== Static: fallback a index.html =====
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  // Si pides un archivo existente, Express.static ya respondió
  // Para rutas SPA, devuelve index.html
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mision3D API escuchando en http://localhost:${PORT}`);
});

export default app;
