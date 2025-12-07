# 🚀 Checklist para Producción - Mision3D

## ✅ Completado

- [x] **Dockerización** del frontend y backend
- [x] **SSL y Nginx** con certificados Let's Encrypt
- [x] **Webhook Flow** con validación HMAC, anti-replay, y reconciliación de montos
- [x] **Rate Limiting** en API, webhooks y pagos
- [x] **Envío incluido** en Flow (recalculado server-side)
- [x] **Checkout guest/registro** con redirección a Home
- [x] **GA4 + Consent Mode** con eventos (add_to_cart, begin_checkout, purchase)
- [x] **JSON-LD** para Organization y Product
- [x] **CSP y headers de seguridad** en Nginx
- [x] **Páginas legales**: privacidad.html, terminos.html
- [x] **404.html** para errores de navegación
- [x] **Base URL dinámica** en frontend (localhost en dev, same-origin en prod)
- [x] **Links en footer** a políticas y términos

---

## 🔧 Pendiente ANTES de subir

### 1️⃣ **Variables de entorno de producción** ⚠️ CRÍTICO

Renombra `.env.production` → `.env` en el servidor y completa:

```bash
# Flow real (quita sandbox)
FLOW_API_KEY=TU_API_KEY_REAL
FLOW_SECRET=TU_SECRET_REAL
FLOW_BASE_URL=https://www.flow.cl/api
FLOW_COMMERCE_ID=TU_COMMERCE_ID_REAL
FLOW_RETURN_URL=https://tu-dominio.cl/flow/retorno
FLOW_CONFIRM_URL=https://tu-dominio.cl/flow/confirm

# SMTP para emails de confirmación (recomendado)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password  # Usa App Password de Gmail
EMAIL_FROM=Mision3D <tu-email@gmail.com>

# CORS
ALLOWED_ORIGINS=https://tu-dominio.cl,https://www.tu-dominio.cl

# Producción
NODE_ENV=production
PORT=3000
```

---

### 2️⃣ **Google Analytics 4** ⚠️ IMPORTANTE

Reemplaza `G-XXXXXXXXXX` por tu **Measurement ID real** en estos archivos:

- `index.html` (línea 8)
- `catalogo.html`
- `checkout.html`
- `producto.html`
- `login.html`
- `privacidad.html`
- `terminos.html`

**Cómo obtenerlo:**
1. Ve a https://analytics.google.com
2. Crea una propiedad GA4 para tu sitio
3. Copia el ID que empieza con `G-`

---

### 3️⃣ **DNS y SSL** ⚠️ CRÍTICO

1. **Apuntar dominio al servidor:**
   - Registros A/AAAA → IP de tu VPS/servidor
   - Esperar propagación DNS (hasta 48h)

2. **Obtener certificados SSL:**
   ```bash
   sudo certbot --nginx -d tu-dominio.cl -d www.tu-dominio.cl
   ```

3. **Validar:**
   ```bash
   curl https://tu-dominio.cl/api/health
   # Debe responder: {"status":"ok"}
   ```

---

### 4️⃣ **Prueba de checkout completa** ⚠️ CRÍTICO

Antes de lanzar:

1. **Checkout de prueba en Flow:**
   - Compra con monto bajo ($1.000)
   - Selecciona envío a Santiago
   - Verifica que el total incluya $2.990 de envío
   - Completa pago en Flow (sandbox primero, luego real)

2. **Validar:**
   - ✅ Email de confirmación recibido
   - ✅ Evento de compra (purchase) en GA4
   - ✅ Pedido guardado en Firebase (si lo configuraste)
   - ✅ Webhook ejecutado sin errores (revisar logs)

---

## 🎯 Opcional pero recomendado

### 5️⃣ **Monitoreo Uptime**

- **UptimeRobot** (gratis): https://uptimerobot.com
- Configura alertas cada 5 min para `https://tu-dominio.cl/api/health`
- Notificaciones a tu email/Telegram/Slack si cae el sitio

---

### 6️⃣ **PWA Básico** (mejora SEO y UX)

Crea `manifest.json`:

```json
{
  "name": "Mision3D - Tienda",
  "short_name": "Mision3D",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "img/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "img/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Agrega en `<head>`:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#2563eb">
```

---

### 7️⃣ **Backups automáticos**

- Pedidos en Firebase → Exportar JSON semanalmente
- Base de datos → Snapshot diario (si usas PostgreSQL/MySQL)
- Código → Git push a GitHub/GitLab (requiere instalar Git)

---

### 8️⃣ **Server-side GA4 Purchase** (anti-adblock)

Si quieres enviar el evento de compra desde el servidor (más confiable):

1. Obtén tu **API Secret** de GA4:
   - Admin → Data Streams → Measurement Protocol API secrets

2. Agrega al backend `server.js` en `/flow/confirm`:
   ```javascript
   // Enviar purchase a GA4 server-side
   if (process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET) {
     await axios.post(
       `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`,
       {
         client_id: order.meta.email || 'guest',
         events: [{
           name: 'purchase',
           params: {
             transaction_id: flowToken,
             value: order.totalCLP,
             currency: 'CLP',
             items: order.items.map(i => ({
               item_id: i.id,
               item_name: i.name,
               price: i.price,
               quantity: i.qty
             }))
           }
         }]
       }
     ).catch(err => console.error('[GA4 Server] Error:', err));
   }
   ```

---

## 📋 Resumen final

| Tarea | Estado | Prioridad |
|-------|--------|-----------|
| Variables .env producción | ⚠️ Pendiente | 🔴 CRÍTICO |
| GA4 Measurement ID | ⚠️ Pendiente | 🔴 CRÍTICO |
| DNS + SSL | ⚠️ Pendiente | 🔴 CRÍTICO |
| Prueba de checkout | ⚠️ Pendiente | 🔴 CRÍTICO |
| Monitoreo uptime | ⏸️ Opcional | 🟡 Recomendado |
| PWA básico | ⏸️ Opcional | 🟢 Nice-to-have |
| Backups | ⏸️ Opcional | 🟡 Recomendado |
| GA4 server-side | ⏸️ Opcional | 🟢 Nice-to-have |

---

## 🎉 ¿Listo para lanzar?

Una vez completados los 4 puntos **CRÍTICOS**, tu sitio estará listo para producción.

**Comandos finales:**

```bash
# En el servidor (via SSH)
cd /ruta/a/tu/proyecto
docker-compose -f docker-compose-ssl.yml --profile production up -d

# Verificar logs
docker-compose -f docker-compose-ssl.yml logs -f backend
```

**URLs de validación:**
- Frontend: `https://tu-dominio.cl`
- API Health: `https://tu-dominio.cl/api/health`
- Checkout Flow: Compra de prueba completa

---

¡Éxito con el lanzamiento! 🚀
