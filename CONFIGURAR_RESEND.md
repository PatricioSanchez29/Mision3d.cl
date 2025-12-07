# 🚀 Configurar Correos con Resend - Guía Completa

## ✨ Por qué Resend es mejor:

- ✅ **3,000 correos gratis al mes** (vs 100/día de SendGrid)
- ✅ **Más rápido** - Entrega en segundos
- ✅ **Más fácil** - Solo necesitas un API Key
- ✅ **Sin verificación en 2 pasos** como Gmail
- ✅ **Dashboard moderno** con estadísticas
- ✅ **Mejor deliverability** - Menos spam

---

## 🎯 Paso 1: Crear cuenta en Resend (2 minutos)

### 1. Regístrate en Resend
Ve a: https://resend.com/signup

- Usa tu email de trabajo o personal
- Verifica tu email
- Es **GRATIS** (hasta 3,000 emails/mes)

### 2. Verifica tu dominio (Opcional pero recomendado)

**Si tienes dominio propio:**
1. Ve a "Domains" en Resend
2. Click "Add Domain"
3. Ingresa tu dominio: `mision3d.cl`
4. Agrega los registros DNS que te muestra
5. Espera verificación (5-30 minutos)

**Si NO tienes dominio:**
- Puedes usar el dominio de prueba de Resend
- Funcionará igual pero irá más a spam
- Email será tipo: `noreply@resend.dev`

---

## 🔑 Paso 2: Obtener API Key (1 minuto)

### 1. Ve a "API Keys"
https://resend.com/api-keys

### 2. Click en "Create API Key"

### 3. Configura el API Key:
- **Name:** `Mision3D Website`
- **Permission:** `Sending access` (Full access no es necesario)
- **Domain:** Selecciona tu dominio o usa el de prueba

### 4. Click "Create"

### 5. Copia el API Key
- Se verá tipo: `re_123abc456def789ghi`
- **⚠️ GUÁRDALO AHORA** - Solo se muestra una vez
- Si lo pierdes, genera uno nuevo

---

## ⚙️ Paso 3: Configurar en Render (2 minutos)

### 1. Ve a tu backend en Render
https://dashboard.render.com/

### 2. Selecciona tu servicio backend

### 3. Ve a "Environment"

### 4. Agrega estas 2 variables:

**Variable 1:**
```
Key: RESEND_API_KEY
Value: re_123abc456def789ghi
```
(⚠️ Pega tu API Key real de Resend)

**Variable 2:**
```
Key: EMAIL_FROM
Value: noreply@mision3d.cl
```

**Opciones para EMAIL_FROM:**

Si verificaste tu dominio:
```
EMAIL_FROM: noreply@mision3d.cl
EMAIL_FROM: soporte@mision3d.cl
EMAIL_FROM: contacto@mision3d.cl
```

Si NO verificaste dominio:
```
EMAIL_FROM: onboarding@resend.dev
```

### 5. IMPORTANTE: Elimina variables de Gmail/SendGrid
Si tienes estas variables, **elimínalas**:
- ❌ `EMAIL_SERVICE`
- ❌ `EMAIL_USER`
- ❌ `EMAIL_PASS`
- ❌ `SENDGRID_API_KEY`

Solo deja:
- ✅ `RESEND_API_KEY`
- ✅ `EMAIL_FROM`

### 6. Click "Save Changes"
- El servicio se reiniciará automáticamente

---

## 🧪 Paso 4: Probar (3 minutos)

### 1. Espera que Render termine de deployar
- Verás "Live" cuando esté listo (~2 min)

### 2. Ve a tu sitio web
```
https://tudominio.com/login.html
```

### 3. Crea una cuenta de prueba
- Click en "CREAR CUENTA"
- Usa **tu email real**
- Completa el formulario
- Click en "CONFIRMAR"

### 4. Revisa tu email
- ✅ Debería llegar en **menos de 30 segundos**
- ⚠️ Si no llega, revisa SPAM
- 📊 Ve estadísticas en Resend Dashboard

---

## 📊 Verificar que funcionó

### En Resend Dashboard:

1. Ve a "Emails" en https://resend.com/emails
2. Deberías ver tu correo enviado
3. Estado: ✅ "Delivered"
4. Click en el email para ver detalles

### En tu email:

Recibirás:
```
De: Misión 3D <noreply@mision3d.cl>
Asunto: ¡Bienvenido a Misión 3D! - Cuenta creada exitosamente

¡Hola [Tu Nombre]!

Tu cuenta ha sido creada exitosamente...
```

---

## 🐛 Solución de Problemas

### El correo no llega

**1. Verifica el Dashboard de Resend:**
- Ve a https://resend.com/emails
- Si el email aparece con estado "Delivered" → Revisa SPAM
- Si aparece "Failed" → Ve a "Details" para ver el error

**2. Revisa los logs del backend:**
- En Render → Logs
- Busca: `✅ Correo de registro enviado`
- O errores tipo: `❌ Error enviando correo`

**3. Verifica las variables:**
- En Render → Environment
- `RESEND_API_KEY` debe empezar con `re_`
- `EMAIL_FROM` debe coincidir con tu dominio verificado

### Error: "API key is invalid"

✅ Genera un nuevo API Key en Resend
✅ Cópialo completo (empieza con `re_`)
✅ Actualiza en Render → Environment

### El correo va a SPAM

**Si usas `onboarding@resend.dev`:**
- Es normal, es un dominio compartido
- Solución: Verifica tu propio dominio

**Si usas tu dominio:**
- Verifica que los registros DNS estén correctos
- En Resend → Domains → Verifica estado

---

## 🎨 Personalizar el Correo

Para cambiar el contenido del email:

1. Edita `backend/server.js`
2. Busca `/api/send-registration-email`
3. Modifica el HTML y texto

Ejemplo:
```javascript
const html = `
  <!DOCTYPE html>
  <html>
    <body>
      <h1>¡Bienvenido ${userName}!</h1>
      <p>Tu cuenta en Misión 3D está lista.</p>
      <!-- Tu diseño personalizado -->
    </body>
  </html>
`;
```

---

## 📈 Límites y Precios

### Plan Gratuito (Perfecto para comenzar):
- ✅ **3,000 emails/mes**
- ✅ **100 emails/día**
- ✅ **Todos los features**
- ✅ **Sin tarjeta de crédito**

### Si necesitas más:
- **$20/mes** → 50,000 emails
- **$80/mes** → 100,000 emails
- Cobro adicional: **$0.0001 por email**

Para comparar:
- Gmail: Gratis pero limitado y poco profesional
- SendGrid: 100 emails/día gratis, luego $20/mes
- Resend: **3,000 emails/mes gratis** 🎉

---

## ✅ Checklist Final

Antes de probar:

- [ ] ✅ Cuenta creada en Resend
- [ ] ✅ API Key generado y copiado
- [ ] ✅ Variables configuradas en Render:
  - [ ] `RESEND_API_KEY`
  - [ ] `EMAIL_FROM`
- [ ] ✅ Variables de Gmail/SendGrid eliminadas
- [ ] ✅ Backend redesplegado (estado "Live")
- [ ] ✅ `shouldSendEmail = true` en login.html
- [ ] ✅ Frontend actualizado

---

## 🚀 Ventajas de Resend vs otros

| Feature | Resend | SendGrid | Gmail |
|---------|--------|----------|-------|
| Correos gratis/mes | **3,000** | 100/día | ~500/día |
| Configuración | ⚡ 5 min | 15 min | 10 min |
| Dashboard | ✨ Moderno | ✅ Completo | ❌ No |
| Deliverability | 🎯 Excelente | ✅ Bueno | ⚠️ Regular |
| Dominio propio | ✅ Fácil | ✅ Medio | ❌ No |
| Precio siguiente tier | $20 | $20 | Gratis |

---

## 🎯 Resumen Rápido

**Solo necesitas 3 cosas:**

1. **API Key de Resend** → https://resend.com/api-keys
2. **Configurar en Render:**
   - `RESEND_API_KEY = re_abc123...`
   - `EMAIL_FROM = noreply@mision3d.cl`
3. **Probar** → Crear cuenta en tu sitio

**¡Eso es todo!** En 10 minutos tendrás correos profesionales funcionando. 🎉

---

## 📞 Soporte

¿Problemas?
- Resend Docs: https://resend.com/docs
- Resend Discord: https://resend.com/discord
- Email: support@resend.com

---

**Último paso:** Crea una cuenta de prueba en tu sitio y revisa tu email. ✨
