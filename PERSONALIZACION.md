# 🎨 Guía de Personalización - Misión 3D

## 📱 WhatsApp Business

### Configurar tu número
Edita `whatsapp.js`, línea 5:

```javascript
phoneNumber: '56912345678', // ← Cambiar por tu número real
```

**Formato:** Código país + número sin espacios ni símbolos  
**Ejemplo Chile:** `56912345678` (56 = Chile, 912345678 = tu celular)

### Uso en el código
```javascript
// Abrir WhatsApp con mensaje general
openWhatsApp('general');

// Con producto específico
openWhatsApp('product', 'Calendario F1');

// Con carrito
const items = [{name: 'Producto', qty: 1}];
openWhatsApp('cart', {items, total: 15990});

// Personalizado
openWhatsApp('custom');
```

---

## 📱 Redes Sociales

### Activar y configurar
Edita `social-media.js`:

```javascript
const SOCIAL_CONFIG = {
  instagram: {
    url: 'https://www.instagram.com/TU_USUARIO',  // ← Cambiar
    username: '@TU_USUARIO',  // ← Cambiar
    enabled: true  // true = visible, false = oculto
  },
  facebook: {
    url: 'https://www.facebook.com/TU_PAGINA',
    enabled: false  // ← Cambiar a true cuando tengas página
  },
  tiktok: {
    url: 'https://www.tiktok.com/@TU_USUARIO',
    enabled: false  // ← Activar si usas TikTok
  }
};
```

---

## ⭐ Testimonios

### Agregar nuevo testimonio
Edita `testimonials.js`:

```javascript
const TESTIMONIALS = [
  // ... testimonios existentes
  {
    id: 4,  // incrementar el ID
    name: 'Nuevo Cliente',
    rating: 5,  // de 1 a 5 estrellas
    date: '2025-10-27',  // formato YYYY-MM-DD
    comment: 'Excelente producto, muy recomendado!',
    product: 'Nombre del producto comprado',
    verified: true  // true = compra verificada
  }
];
```

### Modificar testimonios existentes
Puedes editar directamente el array `TESTIMONIALS` en el archivo.

---

## 📧 Email de Confirmación Automático

Ya está implementado en `backend/server.js`. Para activarlo:

### 1. Configurar Gmail (App Password)

1. Ve a https://myaccount.google.com/security
2. Activa "Verificación en 2 pasos"
3. Luego ve a "Contraseñas de aplicaciones"
4. Genera una contraseña para "Mail"
5. Copia la contraseña de 16 caracteres

### 2. Variables de entorno en Render

Agregar en Render → Environment:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mision3d.cl@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # ← Tu app password
MAIL_FROM=Misión 3D <mision3d.cl@gmail.com>
```

### 3. En local (backend/.env)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mision3d.cl@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
MAIL_FROM=Misión 3D <mision3d.cl@gmail.com>
```

**El email se enviará automáticamente cuando:**
- Un pago se confirme por Flow (estado = pagado)
- Una orden por transferencia se cree

---

## 🛍️ Agregar Más Productos

### Opción 1: Editar en Firebase (Recomendado)

1. Ve a https://console.firebase.google.com
2. Tu proyecto → Realtime Database
3. Navega a `productos/`
4. Click "+" para agregar nuevo producto
5. Estructura:

```json
{
  "id": "producto5",
  "name": "Nombre del Producto",
  "price": 15990,
  "img": "img/foto-producto.png",
  "stars": 5,
  "reviews": 0,
  "stock": "disponible",
  "category": "Categoría",
  "dateAdded": "2025-10-27",
  "discount": 0
}
```

### Opción 2: Editar script.js (Temporal)

En `script.js`, busca `window.PRODUCTS` (línea ~230) y agrega:

```javascript
window.PRODUCTS = [
  // ... productos existentes
  {
    id: 'nuevo1',
    name: 'Nuevo Producto',
    price: 19990,
    img: 'img/nuevo-producto.png',
    stars: 5,
    reviews: 0,
    stock: 'disponible',
    category: 'Figuras',
    dateAdded: '2025-10-27',
    discount: 0
  }
];
```

**Importante:** Sube la imagen a la carpeta `img/` antes.

---

## 🎨 Cambiar Colores del Sitio

### Colores principales
Edita `style.css`:

```css
:root {
  --primary-color: #0052cc;  /* Azul principal */
  --secondary-color: #06b6d4; /* Cyan/turquesa */
  --accent-color: #0891b2;   /* Cyan oscuro */
}
```

### Gradientes
Busca en `style.css`:

```css
.gradient-text {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%);
}
```

---

## 📱 Configurar Número de Teléfono en Contacto

En `whatsapp.js` y footer de páginas HTML, actualizar:

```html
<p>📱 +56 9 1234 5678</p>
```

---

## 🔧 Panel Admin (Próximamente)

Si quieres un panel para gestionar productos sin tocar Firebase:

1. Avísame y creo `admin.html`
2. Login simple con password
3. CRUD completo de productos
4. Ver pedidos de Firebase

---

## 🚀 Cómo Aplicar Cambios

### En local:
```bash
# Ver cambios
git status

# Agregar todo
git add .

# Commit
git commit -m "Descripción de cambios"

# Subir a GitHub (auto-deploy en Render)
git push origin main
```

### Esperar deploy:
- Render detecta el push automáticamente
- Demora ~2-3 minutos
- Verificar en: https://mision3d.onrender.com

---

## ✅ Checklist de Personalización

- [ ] Cambiar número de WhatsApp en `whatsapp.js`
- [ ] Activar redes sociales en `social-media.js`
- [ ] Agregar testimonios reales en `testimonials.js`
- [ ] Configurar SMTP para emails automáticos
- [ ] Subir fotos de productos a `img/`
- [ ] Agregar productos en Firebase o `script.js`
- [ ] Actualizar teléfono en footer
- [ ] Probar WhatsApp flotante
- [ ] Verificar emails de confirmación

---

## 🆘 Soporte

Si algo no funciona:
1. Revisar consola del navegador (F12)
2. Ver logs en Render Dashboard
3. Verificar que todos los archivos estén subidos
4. Hacer hard refresh (Ctrl+F5)

---

**Última actualización:** 27 de octubre de 2025
