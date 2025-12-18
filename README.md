# 🎨 Mision3D - E-commerce de productos 3D personalizados

> Tienda online de productos impresos en 3D con integración de pagos Flow (Chile), carrito persistente, checkout con envío a domicilio, y analytics GA4.

---

## 🚀 **Stack Tecnológico**

### Frontend
- **HTML/CSS/JS** puro (sin frameworks)
- Carrito en `localStorage`
- GA4 con Consent Mode v2
- Responsive design con dark mode

### Backend
- **Node.js + Express**
- Integración **Flow API** (pagos Chile)
- **Firebase Realtime DB** (pedidos)
- **Nodemailer** (emails confirmación)
- Rate limiting y webhook security (HMAC)

### Infraestructura
- **Docker + Docker Compose**
- **Nginx** con SSL/TLS (Let's Encrypt)
- Reverse proxy para API
- Headers de seguridad (CSP, HSTS, etc.)

---

## 📦 **Instalación Local**

### Prerrequisitos
- Node.js 18+ o Docker
- Puerto 3000 (backend) y 80/443 (Nginx)

### Opción 1: Con Docker (recomendado)

```bash
# Clonar repositorio
git clone <tu-repo-url>
cd mision3d_cart_v2

# Configurar variables de entorno
cp .env.example .env
cp backend/.env.example backend/.env
# Edita backend/.env con tus credenciales Flow

# Levantar servicios
docker-compose up -d

# Verificar
curl http://localhost:3000/api/health
```

### Opción 2: Sin Docker

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edita .env con tus credenciales
npm start

# Frontend (servidor estático, ej: Live Server en VSCode)
# O simplemente abre index.html en el navegador
```

---

## 🌐 **Deployment a Producción**

Sigue la guía completa en **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)**

**Pasos rápidos:**

1. **Variables de entorno:**
   ```bash
   cp .env.production backend/.env
   # Editar con credenciales reales
   ```

2. **DNS + SSL:**
   ```bash
   # Apuntar dominio a tu servidor
   # Ejecutar certbot
   sudo certbot --nginx -d tu-dominio.cl
   ```

3. **Deploy con Docker:**
   ```bash
   docker-compose -f docker-compose-ssl.yml --profile production up -d
   ```

4. **Validar:**
   - ✅ `https://tu-dominio.cl/api/health`
   - ✅ Checkout de prueba con Flow
   - ✅ Emails de confirmación

---

## 📁 **Estructura del Proyecto**

```
mision3d_cart_v2/
├── backend/               # API Node.js
│   ├── server.js          # Servidor Express
│   ├── flow.js            # Integración Flow (legacy)
│   ├── package.json
│   └── .env.example
├── img/                   # Imágenes productos
├── index.html             # Home
├── catalogo.html          # Catálogo completo
├── producto.html          # Detalle producto
├── checkout.html          # Checkout
├── login.html             # Login/Guest
├── privacidad.html        # Política privacidad
├── terminos.html          # Términos y condiciones
├── 404.html               # Error 404
├── script.js              # Lógica carrito/checkout
├── style.css              # Estilos
├── consent.js             # GA4 Consent Mode
├── docker-compose.yml     # Docker local
├── docker-compose-ssl.yml # Docker producción
└── nginx-ssl.conf         # Config Nginx SSL
```

---

## 🔑 **Variables de Entorno**

### Backend (`backend/.env`)

```env
# Flow (Chile)
FLOW_API_KEY=tu-api-key
FLOW_SECRET=tu-secret
FLOW_BASE_URL=https://sandbox.flow.cl/api  # o https://www.flow.cl/api en prod
FLOW_RETURN_URL=http://localhost:3000/flow/retorno
FLOW_CONFIRM_URL=http://localhost:3000/flow/confirm

# Firebase (opcional)
FIREBASE_DATABASE_URL=https://tu-proyecto.firebaseio.com

# SMTP (opcional, para emails)
SMTP_HOST=smtp.gmail.com
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password

# CORS
ALLOWED_ORIGINS=http://localhost:5500,https://tu-dominio.cl

# App
PORT=3000
NODE_ENV=development
```

---

## 🧪 **Testing**

### Prueba de webhook Flow

```bash
cd backend
node test-webhook-security.js
```

### Health check

```bash
curl http://localhost:3000/api/health
# Respuesta: {"status":"ok"}
```

---

## 🛡️ **Seguridad**

- ✅ **Webhook HMAC validation** (Flow)
- ✅ **Replay attack protection** (tokens de un solo uso)
- ✅ **Rate limiting** (API, webhooks, pagos)
- ✅ **CORS whitelist** configurable
- ✅ **CSP headers** estrictos
- ✅ **HTTPS forzado** en producción
- ✅ **Secrets en .env** (nunca en código)

Ver **[backend/SECURITY.md](./backend/SECURITY.md)** para detalles.

---

## 📊 **Analytics**

- **Google Analytics 4** con Consent Mode v2
- Eventos:
  - `add_to_cart` (agregar producto)
  - `begin_checkout` (iniciar checkout)
  - `purchase` (compra completada)
- Cookie banner para GDPR compliance

**Configuración:**
Reemplaza `G-XXXXXXXXXX` en todos los HTML por tu Measurement ID.

---

## 🤝 **Contribuir**

1. Fork el proyecto
2. Crea tu rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Agrega nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

---

## 📝 **Licencia**

© 2025 Mision3D. Todos los derechos reservados.

---

## 📞 **Soporte**

- Email: contacto@mision3d.cl
- WhatsApp: +56 9 XXXX XXXX

---

## 🗺️ **Roadmap**

- [x] Integración Flow
- [x] Webhook security
- [x] GA4 + Consent
- [x] Docker + SSL
- [ ] Admin panel (pedidos)
- [ ] PWA (offline support)
- [ ] Multi-moneda
- [ ] Integración MercadoPago

---

**¡Gracias por usar Mision3D!** 🚀
# Mision3d.cl
