# 📧 Configurar Email Automático (SMTP, SendGrid o Resend)

## 🎯 Objetivo
Enviar emails automáticos cuando se confirme un pago de Flow. Ahora puedes elegir proveedor: `SMTP` (Gmail u otro), `SendGrid` o `Resend`.

---

## � Elige tu proveedor (recomendado)

- Si quieres rapidez sin configurar puertos: Resend
- Si ya usas SendGrid en otros proyectos: SendGrid
- Si prefieres tu correo Gmail/empresa: SMTP

Selecciona con la variable de entorno:

```
EMAIL_PROVIDER = smtp | sendgrid | resend
```

Variables por proveedor:

- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
- SendGrid: `SENDGRID_API_KEY`, `MAIL_FROM`
- Resend: `RESEND_API_KEY`, `MAIL_FROM`

---

## Opción A — SMTP (Gmail) – App Password

### 1. Ir a Seguridad de Google
https://myaccount.google.com/security

### 2. Activar Verificación en 2 Pasos
- Busca "Verificación en 2 pasos"
- Click "Activar"
- Sigue los pasos (pedirá tu teléfono)

### 3. Crear App Password
- Una vez activada la verificación en 2 pasos
- Busca "Contraseñas de aplicaciones"
- Click en "Contraseñas de aplicaciones"
- Selecciona:
  - **App:** Correo
  - **Dispositivo:** Otro (personalizado)
  - **Nombre:** "Mision3D Backend"
- Click "Generar"
- **Copia la contraseña de 16 caracteres** (tiene espacios)
  - Ejemplo: `abcd efgh ijkl mnop`

---

## Configurar en Render (variables de entorno)

### 1. Ir a Render Dashboard
https://dashboard.render.com

### 2. Seleccionar tu servicio "mision3d"

### 3. Ir a Settings → Environment

### 4. Agregar variables según el proveedor elegido

#### A) SMTP (Gmail u otro)

```
Variable: SMTP_HOST
Value: smtp.gmail.com

Variable: SMTP_PORT
Value: 587

Variable: SMTP_SECURE
Value: false

Variable: SMTP_USER
Value: mision3d.cl@gmail.com

Variable: SMTP_PASS
Value: abcd efgh ijkl mnop
(← pega aquí la app password que copiaste, CON espacios)

Variable: MAIL_FROM
Value: Misión 3D <mision3d.cl@gmail.com>
```

#### B) SendGrid

```
Variable: EMAIL_PROVIDER
Value: sendgrid

Variable: SENDGRID_API_KEY
Value: <tu_api_key_de_sendgrid>

Variable: MAIL_FROM
Value: Misión 3D <notificaciones@tudominio.cl>
```

Para conseguir tu API Key: https://app.sendgrid.com/settings/api_keys → Create API Key → Full Access o acceso a "Mail Send".

#### C) Resend

```
Variable: EMAIL_PROVIDER
Value: resend

Variable: RESEND_API_KEY
Value: <tu_api_key_de_resend>

Variable: MAIL_FROM
Value: Misión 3D <onboarding@resend.dev>  (o tu dominio verificado)
```

Para conseguir tu API Key: https://resend.com/api-keys. Si usas un remitente propio, verifica el dominio en Resend.

### 5. Guarda cambios

Render hará auto-deploy (espera 2-3 minutos)

---

## 🧪 Paso 3: Probar que Funciona

### Hacer una compra de prueba:

1. Ir a https://mision3d.onrender.com
2. Agregar un producto al carrito
3. Finalizar compra con Flow
4. Completar el pago (usa tarjeta de prueba si Flow lo permite)
5. **Verificar que llegó email** a mision3d.cl@gmail.com

### Email que recibirás:

**Asunto:** Confirmación de pago - ORD-123456789

**Contenido:**
```
¡Gracias por tu compra en Misión 3D!

Hemos confirmado tu pago correctamente.

• Orden comercio: ORD-123456789
• Orden Flow: 12345
• Monto: $15.990
• Estado: Pagado

Pronto te contactaremos con el estado del envío.
```

---

## 📊 Ver Logs (Si hay problemas)

### En Render:
1. Dashboard → tu servicio
2. Click en pestaña "Logs"
3. Buscar líneas:
   - `📧 SMTP listo para enviar correos` ✅ (configurado OK)
   - `📧 Email de confirmación enviado` ✅ (email enviado)
   - `⚠️ No se pudo enviar el email` ❌ (revisar app password)

---

## 🔧 Troubleshooting

### Error: "Invalid login" o "Username and Password not accepted"
**Causa:** App Password incorrecta o verificación en 2 pasos no activada  
**Solución:**
1. Verificar que la verificación en 2 pasos esté activa
2. Generar nueva App Password
3. Actualizar SMTP_PASS en Render
4. Redeploy

### No llega el email
**Causa:** Variables mal configuradas  
**Solución:**
1. Verificar que TODAS las variables estén en Render
2. Revisar logs de Render
3. Verificar bandeja de spam

### Email va a spam
**Normal:** Los primeros emails pueden ir a spam  
**Solución:**
1. Marcar como "No es spam"
2. Agregar mision3d.cl@gmail.com a contactos
3. Los siguientes llegarán a Entrada

---

## ✅ Checklist

- [ ] Verificación en 2 pasos activada en Gmail
- [ ] App Password generada
- [ ] Variables SMTP agregadas en Render:
  - [ ] SMTP_HOST
  - [ ] SMTP_PORT
  - [ ] SMTP_SECURE
  - [ ] SMTP_USER
  - [ ] SMTP_PASS
  - [ ] MAIL_FROM
- [ ] Render redeployado
- [ ] Compra de prueba realizada
- [ ] Email recibido ✅

---

## 📧 Emails que se Envían Automáticamente

1. **Pago confirmado (Flow):**
   - Se envía cuando Flow confirma el pago
   - Incluye número de orden y monto
   
2. **Orden por transferencia:**
   - Se envía con instrucciones de transferencia
   - Datos bancarios incluidos

---

## 🎨 Personalizar Email (Opcional)

Edita `backend/server.js` línea ~655:

```javascript
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
```

Puedes agregar:
- Logo de Misión 3D
- Links a redes sociales
- Mensaje personalizado
- Número de seguimiento

---

**¡Ya está todo listo en el código! Solo falta configurar Gmail + Render.**
