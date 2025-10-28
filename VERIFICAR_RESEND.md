# ✅ Verificar Configuración de Resend - Paso a Paso

## 📋 Checklist de Verificación

### 1️⃣ Obtener API Key de Resend

**Panel que viste en la imagen:**

1. Ve a https://resend.com/api-keys
2. Click en "Add API Key"
3. Completa:
   - **Name:** `Mision3D Backend` (o el nombre que quieras)
   - **Permission:** `Full access` ✅ (ya está seleccionado)
   - **Domain:** `All Domains` ✅ (ya está seleccionado)
4. Click "Add" (Ctrl + ↵)
5. **COPIA LA API KEY** (solo se muestra una vez)
   - Formato: `re_xxxxxxxxxxxxxxxxxxxx`
   - Guárdala en un lugar seguro

---

### 2️⃣ Configurar Variables en Render

1. Ve a https://dashboard.render.com
2. Selecciona tu servicio **mision3d**
3. Ve a **Settings** → **Environment**
4. Click **"+ Add Environment Variable"** para cada una:

```
Variable: EMAIL_PROVIDER
Value: resend

Variable: RESEND_API_KEY
Value: re_xxxxxxxxxxxxxxxxxxxx
(← pega aquí la API key que copiaste)

Variable: MAIL_FROM
Value: Misión 3D <onboarding@resend.dev>

Variable: TEST_EMAIL_KEY
Value: mision3d_test_2025
(← puedes usar cualquier valor secreto)
```

5. Click **"Save Changes"**
6. Render hará **auto-deploy** (espera 2-3 minutos)

---

### 3️⃣ Verificar Logs de Render

1. En Render, ve a la pestaña **"Logs"**
2. Busca esta línea:
   ```
   📧 Resend listo para enviar correos
   ```
   ✅ Si ves esto = configuración OK

3. Si ves esto en cambio:
   ```
   ⚠️ EMAIL_PROVIDER=resend pero falta RESEND_API_KEY
   ```
   ❌ Revisa que pegaste bien la API key

4. O si ves:
   ```
   ℹ️ EMAIL_PROVIDER no definido y SMTP no configurado
   ```
   ❌ Falta la variable EMAIL_PROVIDER=resend

---

### 4️⃣ Probar Envío de Correo (Método seguro)

**Opción A: Usando Thunder Client / Postman / Insomnia**

1. Abre tu cliente HTTP favorito
2. Configura la petición:
   - **Método:** `POST`
   - **URL:** `https://mision3d.onrender.com/api/test-email`
   - **Headers:**
     ```
     Content-Type: application/json
     x-test-key: mision3d_test_2025
     ```
   - **Body (JSON):**
     ```json
     {
       "to": "mision3d.cl@gmail.com",
       "subject": "🚀 Prueba Resend Misión 3D",
       "html": "<h1>¡Funciona!</h1><p>Resend configurado correctamente.</p>"
     }
     ```

3. Click **Send**
4. **Respuesta esperada:**
   ```json
   {
     "ok": true,
     "result": { ... }
   }
   ```

5. **Revisa tu correo** (mision3d.cl@gmail.com)
   - Debería llegar en segundos
   - Remitente: `Misión 3D <onboarding@resend.dev>`


**Opción B: Usando PowerShell (Windows)**

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "x-test-key" = "mision3d_test_2025"
}

$body = @{
    to = "mision3d.cl@gmail.com"
    subject = "🚀 Prueba Resend Misión 3D"
    html = "<h1>¡Funciona!</h1><p>Resend configurado correctamente.</p>"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://mision3d-cl.onrender.com/api/test-email" -Method Post -Headers $headers -Body $body
```


**Opción C: Usando cURL (Git Bash / Linux / Mac)**

```bash
curl -X POST https://mision3d-cl.onrender.com/api/test-email \
  -H "Content-Type: application/json" \
  -H "x-test-key: mision3d_test_2025" \
  -d '{
    "to": "mision3d.cl@gmail.com",
    "subject": "🚀 Prueba Resend Misión 3D",
    "html": "<h1>¡Funciona!</h1><p>Resend configurado correctamente.</p>"
  }'
```

---

### 5️⃣ Verificar en Producción (Compra Real)

1. Ve a https://mision3d.onrender.com
2. Agrega un producto al carrito
3. Completa el checkout con Flow
4. Paga (usa tarjeta de prueba si es sandbox)
5. **Verifica que llegó email** con:
   - Asunto: `Confirmación de pago - ORD-123456789`
   - Remitente: `Misión 3D <onboarding@resend.dev>`
   - Contenido: datos de la orden, monto, etc.

---

## 🔧 Troubleshooting

### Error 401 (Unauthorized)
**Causa:** Header `x-test-key` incorrecto o faltante  
**Solución:** Verifica que el valor coincida con `TEST_EMAIL_KEY` en Render

### Error 500 o "RESEND_API_KEY inválida"
**Causa:** API key incorrecta  
**Solución:**
1. Ve a Resend → API Keys
2. Genera una nueva API key
3. Actualiza `RESEND_API_KEY` en Render
4. Espera el redeploy

### No llega el email
**Causa 1:** Variables mal configuradas  
**Solución:** Revisa logs de Render, debe decir "📧 Resend listo..."

**Causa 2:** Email en spam  
**Solución:**
1. Revisa carpeta spam/promociones
2. Marca como "No es spam"

**Causa 3:** Remitente bloqueado  
**Solución:** Usa `onboarding@resend.dev` para pruebas (es el oficial de Resend)

---

## 🎨 Personalizar Remitente (Opcional - Avanzado)

Si quieres que los emails salgan de `notificaciones@mision3d.cl`:

1. **Verifica tu dominio en Resend:**
   - Panel Resend → Domains → Add Domain
   - Dominio: `mision3d.cl`
   - Agrega los registros DNS que te pida (TXT, MX, CNAME)

2. **Actualiza MAIL_FROM en Render:**
   ```
   MAIL_FROM = Misión 3D <notificaciones@mision3d.cl>
   ```

3. Espera propagación DNS (5-60 minutos)

---

## ✅ Estado Final

- [x] API Key de Resend obtenida
- [x] Variables en Render configuradas
- [x] Logs muestran "📧 Resend listo..."
- [x] Endpoint de prueba responde 200 OK
- [x] Email de prueba recibido
- [x] Email de compra real funciona

**¡Listo! Resend está configurado y funcionando. 🎉**

---

## 📊 Monitoreo (Opcional)

Ver emails enviados en el panel de Resend:
- https://resend.com/emails

Aquí puedes ver:
- Emails enviados/entregados/rebotados
- Logs de cada envío
- Tasa de apertura (si activas tracking)

---

## 🔄 Próximos Pasos

1. Cuando pases a producción (dominio real):
   - Actualiza `MAIL_FROM` con tu dominio verificado
   - Actualiza `CORS_ORIGIN` y URLs de Flow
   
2. Para mejor entregabilidad:
   - Verifica dominio en Resend
   - Activa DKIM/SPF (se hace automático al verificar)

---

**¿Dudas?** Revisa los logs de Render o prueba el endpoint de test.
