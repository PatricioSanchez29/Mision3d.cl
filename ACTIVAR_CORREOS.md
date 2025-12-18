# 🚀 Activar Envío de Correos - Guía Rápida

## ✅ Estado Actual

- ✅ Frontend: Formulario de registro funcional
- ✅ Backend: Endpoint de correos implementado
- ⚠️ Correos: **DESACTIVADOS** (por defecto)

## 📧 Para Activar el Envío de Correos

### Paso 1: Configurar Variables de Entorno en Render

Ve a tu backend en Render → Environment y agrega **UNA** de estas opciones:

#### Opción A: Gmail (Más Rápido)
```
EMAIL_SERVICE=gmail
EMAIL_USER=tu-correo@gmail.com
EMAIL_PASS=xxxx-xxxx-xxxx-xxxx
```

**Cómo obtener el password:**
1. Ve a Google Account → Seguridad
2. Activa verificación en 2 pasos
3. Ve a "Contraseñas de aplicaciones"
4. Genera una para "Correo" → copia los 16 caracteres

#### Opción B: SendGrid (Recomendado)
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@tudominio.com
```

### Paso 2: Actualizar login.html

Busca la línea 508 en `login.html`:

```javascript
const shouldSendEmail = false; // ⬅️ CAMBIAR A true
```

Cámbiala a:
```javascript
const shouldSendEmail = true; // ✅ Activado
```

### Paso 3: Reiniciar Backend

1. En Render → Manual Deploy → Deploy latest commit
2. Espera que termine el deploy

### Paso 4: Probar

1. Ve a tu sitio: `https://tudominio.com/login.html`
2. Haz clic en "CREAR CUENTA"
3. Llena el formulario con tu email real
4. Haz clic en "CONFIRMAR"
5. Revisa tu email (y carpeta spam)

## 🧪 Probar Localmente (Antes de Activar en Producción)

Si quieres probar localmente:

1. **Inicia el backend local:**
   ```bash
   cd backend
   npm start
   ```

2. **Configura las variables en archivo `.env`:**
   ```
   EMAIL_SERVICE=gmail
   EMAIL_USER=tu@gmail.com
   EMAIL_PASS=xxxx-xxxx-xxxx-xxxx
   ```

3. **En login.html, cambia `shouldSendEmail` a `true`**

4. **Abre login.html en el navegador** (usa LiveServer o similar)

5. **Crea una cuenta de prueba**

## ⚙️ Configuración Opcional: CORS en Producción

Si tu frontend está en un dominio diferente al backend, agrega en Render:

```
CORS_ORIGIN=https://tudominio.com,https://www.tudominio.com
```

## 🐛 Solución de Problemas

### Error: "Failed to fetch"
- ✅ Verifica que el backend esté corriendo
- ✅ Verifica que `shouldSendEmail = true`
- ✅ Revisa la consola del navegador

### Error: "CORS blocked"
- ✅ Asegúrate que CORS_ORIGIN incluya tu dominio
- ✅ O déjalo vacío para permitir todos

### No llega el correo
- ✅ Revisa spam
- ✅ Verifica EMAIL_USER y EMAIL_PASS en Render
- ✅ Revisa logs del backend en Render

## 📝 Resumen Rápido

**Para activar los correos solo necesitas:**

1. Configurar Gmail (5 minutos)
2. Cambiar `shouldSendEmail = false` a `true`
3. Subir cambios a GitHub
4. Esperar que Render despliegue

**¡Eso es todo!** 🎉

---

**Nota:** Por ahora está desactivado para que no tengas errores en consola mientras no esté configurado.
