# Configuración de Correos de Confirmación de Registro

## ✅ Implementado

Se ha agregado la funcionalidad para enviar correos automáticos de confirmación cuando un usuario crea una cuenta.

## 📧 Características del Correo

El correo de confirmación incluye:
- ✨ Diseño profesional con colores de la marca
- 🎨 Mensaje de bienvenida personalizado
- 📧 Confirmación del email registrado
- 🔗 Botón para iniciar sesión
- 📋 Lista de beneficios de la cuenta
- 📱 Responsive (se ve bien en móvil)

## 🔧 Configuración Necesaria

### 1. Variables de Entorno en Render.com

Necesitas configurar **UNA** de estas opciones en tu backend de Render:

#### Opción A: Gmail (Más fácil)
```
EMAIL_SERVICE=gmail
EMAIL_USER=tu-correo@gmail.com
EMAIL_PASS=tu-app-password
```

**Cómo obtener App Password de Gmail:**
1. Ve a tu cuenta de Google
2. Seguridad → Verificación en dos pasos (actívala)
3. Seguridad → Contraseñas de aplicaciones
4. Genera una nueva para "Correo" / "Otro"
5. Usa esa contraseña de 16 caracteres en `EMAIL_PASS`

#### Opción B: SendGrid (Recomendado para producción)
```
SENDGRID_API_KEY=tu-api-key-de-sendgrid
EMAIL_FROM=noreply@tudominio.com
```

**Cómo obtener API Key de SendGrid:**
1. Regístrate en https://sendgrid.com (gratis hasta 100 correos/día)
2. Ve a Settings → API Keys
3. Create API Key → Full Access
4. Copia el API Key

#### Opción C: Resend (Alternativa moderna)
```
RESEND_API_KEY=tu-api-key-de-resend
EMAIL_FROM=noreply@tudominio.com
```

**Cómo obtener API Key de Resend:**
1. Regístrate en https://resend.com (gratis hasta 3000 correos/mes)
2. Ve a API Keys
3. Create API Key
4. Copia el API Key

### 2. Actualizar URL del Backend en login.html

En el archivo `login.html`, busca esta línea (aprox. línea 510):

```javascript
const backendUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://tu-backend.onrender.com'; // ⚠️ REEMPLAZAR AQUÍ
```

**Reemplaza con la URL de tu backend en Render**, por ejemplo:
```javascript
const backendUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://mision3d-backend.onrender.com';
```

### 3. Reiniciar el Backend

Después de agregar las variables de entorno en Render:
1. Ve a tu servicio en Render
2. Click en "Manual Deploy" → "Deploy latest commit"
3. O espera a que se redeploy automáticamente

## 🧪 Probar el Envío de Correos

### Prueba Local (Desarrollo)

1. Asegúrate de que el backend esté corriendo:
   ```bash
   cd backend
   npm start
   ```

2. En `login.html`, verifica que use `http://localhost:3000`

3. Crea una cuenta de prueba con tu email real

4. Revisa la consola del backend para ver si se envió:
   ```
   ✅ Correo de registro enviado a: tu@email.com
   ```

5. Revisa tu bandeja de entrada (y spam)

### Prueba en Producción

1. Sube los cambios a GitHub
2. Render desplegará automáticamente
3. Ve a tu sitio: `https://tudominio.com/login.html`
4. Crea una cuenta con tu email
5. Deberías recibir el correo en minutos

## 🐛 Solución de Problemas

### No llega el correo

1. **Verifica la consola del backend en Render:**
   - Ve a Logs en tu servicio
   - Busca mensajes de error del correo
   
2. **Revisa spam/promociones** en tu email

3. **Verifica variables de entorno:**
   - En Render → Environment
   - Asegúrate que estén bien escritas

4. **Gmail bloqueando acceso:**
   - Usa "Contraseña de aplicación" (App Password)
   - NO uses tu contraseña normal

5. **SendGrid/Resend:**
   - Verifica que el API Key sea válido
   - Verifica que `EMAIL_FROM` esté verificado

### El backend no arranca

```bash
# Error común: módulo no encontrado
npm install nodemailer @sendgrid/mail resend

# Reinicia el servidor
npm start
```

## 📝 Personalización del Correo

Para cambiar el contenido del correo, edita el archivo:
`backend/server.js` → busca `/api/send-registration-email`

Puedes modificar:
- El HTML del correo
- El asunto (subject)
- Los colores y estilos
- El texto y los beneficios listados

## 🔒 Seguridad

- ✅ El correo NO bloquea el registro (se envía de forma asíncrona)
- ✅ Si falla el envío, la cuenta se crea igual
- ✅ Los errores se loguean pero no se muestran al usuario
- ✅ Las credenciales están en variables de entorno (nunca en el código)

## 📊 Límites Gratuitos

| Servicio | Correos/mes | Costo extra |
|----------|-------------|-------------|
| Gmail | ~500/día | Gratis |
| SendGrid | 100/día | $0.0008/email |
| Resend | 3,000/mes | $0.0001/email |

## ✨ Próximos Pasos (Opcional)

Para mejorar aún más:

1. **Verificación de email real:**
   - Agregar un token de verificación
   - Requiere clic en enlace para activar cuenta

2. **Templates más avanzados:**
   - Usar servicios como Mailchimp o Customer.io
   - Templates con editor visual

3. **Correos transaccionales:**
   - Confirmación de pedido
   - Seguimiento de envío
   - Recuperación de contraseña

---

¿Necesitas ayuda? Revisa los logs del backend o contacta soporte.
