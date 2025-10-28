# ⚡ CONFIGURAR CORREOS DE CONFIRMACIÓN - PASO A PASO

## 🎯 Paso 1: Obtener Contraseña de Aplicación de Gmail

### 1. Ve a tu cuenta de Google
https://myaccount.google.com/

### 2. Ve a "Seguridad"
- Busca "Seguridad" en el menú lateral

### 3. Activa la verificación en 2 pasos
- Si no la tienes activada, actívala primero
- Es requisito para generar contraseñas de aplicación

### 4. Ve a "Contraseñas de aplicaciones"
- En la sección de "Seguridad"
- Busca "Contraseñas de aplicaciones" o "App passwords"
- URL directa: https://myaccount.google.com/apppasswords

### 5. Genera una nueva contraseña
- Selecciona "Correo" como la aplicación
- Selecciona "Otro" como el dispositivo
- Escribe: "Mision3D Website"
- Click en "Generar"

### 6. Copia la contraseña
- Verás 16 caracteres tipo: `abcd efgh ijkl mnop`
- Copia esta contraseña (sin espacios funciona también)

---

## 🚀 Paso 2: Configurar en Render.com

### 1. Ve a tu backend en Render
https://dashboard.render.com/

### 2. Selecciona tu servicio backend
- Busca "mision3d-backend" o como lo hayas nombrado

### 3. Ve a "Environment"
- En el menú lateral izquierdo

### 4. Agrega estas 3 variables de entorno:

**Variable 1:**
```
Key: EMAIL_SERVICE
Value: gmail
```

**Variable 2:**
```
Key: EMAIL_USER
Value: tu-correo@gmail.com
```
(⚠️ Reemplaza con tu correo de Gmail real)

**Variable 3:**
```
Key: EMAIL_PASS
Value: abcdefghijklmnop
```
(⚠️ Pega la contraseña de 16 caracteres que copiaste)

### 5. Guarda los cambios
- Click en "Save Changes"
- El servicio se reiniciará automáticamente

---

## ✅ Paso 3: Subir cambios del frontend

El archivo `login.html` ya está actualizado con `shouldSendEmail = true`.

### Opción A: Si usas Git
```bash
git add login.html
git commit -m "Activar envío de correos de confirmación"
git push origin main
```

### Opción B: Si no usas Git
1. Sube el archivo `login.html` actualizado a tu hosting
2. O si usas Render para el frontend también, solo haz deploy

---

## 🧪 Paso 4: Probar

### 1. Espera que Render termine de deployar
- Verás "Live" en el dashboard cuando esté listo
- Toma ~2-3 minutos

### 2. Ve a tu sitio web
```
https://tudominio.com/login.html
```

### 3. Crea una cuenta de prueba
- Click en "CREAR CUENTA"
- Usa tu email real
- Completa el formulario
- Click en "CONFIRMAR"

### 4. Verifica el correo
- Revisa tu bandeja de entrada
- **⚠️ REVISA SPAM/PROMOCIONES**
- El correo viene de tu cuenta Gmail
- Asunto: "¡Bienvenido a Misión 3D! - Cuenta creada exitosamente"

---

## 🐛 Si no llega el correo

### Verifica en la consola del navegador
1. Presiona F12
2. Ve a la pestaña "Console"
3. Busca mensajes:
   - ✅ `Correo de confirmación enviado`
   - ❌ `Backend no disponible - correo no enviado`

### Revisa los logs del backend en Render
1. Ve a tu servicio en Render
2. Click en "Logs"
3. Busca:
   - ✅ `✅ Correo de registro enviado a: email@example.com`
   - ❌ Errores de autenticación

### Problemas comunes:

**Error: "Invalid login"**
- ✅ Verifica que EMAIL_USER sea tu correo completo
- ✅ Verifica que EMAIL_PASS sea la contraseña de aplicación (16 caracteres)
- ✅ NO uses tu contraseña normal de Gmail

**Error: "CORS blocked"**
- ✅ Ya está solucionado en el backend actualizado
- ✅ Si persiste, agrega variable: `CORS_ORIGIN=https://tudominio.com`

**No llega pero no hay error**
- ✅ Revisa carpeta SPAM
- ✅ Revisa carpeta PROMOCIONES
- ✅ Espera 5-10 minutos (a veces Gmail tarda)

---

## 📊 Verificación Rápida

### Checklist antes de probar:

- [ ] ✅ Variables en Render configuradas (EMAIL_SERVICE, EMAIL_USER, EMAIL_PASS)
- [ ] ✅ Backend redesplegado en Render (estado "Live")
- [ ] ✅ `shouldSendEmail = true` en login.html
- [ ] ✅ Frontend actualizado/desplegado
- [ ] ✅ Crear cuenta con email REAL
- [ ] ✅ Revisar bandeja de entrada Y spam

---

## 🎨 Ejemplo del Correo

Cuando funcione, recibirás un correo que dice:

```
¡Bienvenido a Misión 3D! 🎨

¡Hola [TU NOMBRE]!

Tu cuenta ha sido creada exitosamente en Misión3D.cl

Email confirmado: [tu@email.com]

✅ Tu cuenta está lista para usar

[INICIAR SESIÓN]

Beneficios de tu cuenta:
✨ Proceso de compra más rápido
📦 Seguimiento de tus pedidos
❤️ Lista de productos favoritos
📍 Múltiples direcciones de envío
🎁 Ofertas y promociones exclusivas
```

---

## 🔄 Alternativa: Probar Localmente Primero

Si quieres probar antes en local:

### 1. Crea archivo `.env` en carpeta `backend`:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=tu@gmail.com
EMAIL_PASS=abcdefghijklmnop
```

### 2. Inicia el backend:
```bash
cd backend
npm install
npm start
```

### 3. Abre `login.html` con LiveServer
- El código ya detecta localhost automáticamente

### 4. Crea una cuenta de prueba
- Deberías ver en consola del backend:
  ```
  ✅ Correo de registro enviado a: tu@email.com
  ```

---

**¿Listo?** Sigue los pasos y en 10 minutos tendrás los correos funcionando! 🚀
