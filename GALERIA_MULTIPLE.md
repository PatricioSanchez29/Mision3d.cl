# 📸 Guía: Sistema de Galería Múltiple de Productos

## ✅ Implementación Completada

Se ha agregado un sistema de galería dinámica que permite agregar múltiples imágenes a cada producto.

## 🚀 Pasos para Activar

### 1. Actualizar la Base de Datos en Supabase

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Abre el **SQL Editor**
3. Copia y pega el contenido del archivo `add-gallery-column.sql`
4. Ejecuta el script
5. Verifica que aparezca el mensaje de éxito

### 2. Usar el Sistema de Galería

#### Para Agregar Imágenes:
1. En el panel de administración (`admin.html`), crea o edita un producto
2. Verás una sección **"📸 Galería de Imágenes Adicionales"**
3. Haz clic en el botón **"+ Agregar imagen"**
4. Se creará un nuevo campo donde puedes pegar la URL de la imagen
5. Puedes agregar tantas imágenes como necesites

#### Para Eliminar Imágenes:
- Haz clic en el botón **"🗑️ Eliminar"** junto a la imagen que quieres quitar

#### Para Editar URLs:
- Simplemente escribe o pega la nueva URL en el campo de texto
- La vista previa se actualizará automáticamente

## 📝 Formato de las URLs

Puedes usar dos tipos de URLs:

1. **Rutas locales**: `img/producto1.jpg`
2. **URLs externas**: `https://ejemplo.com/imagen.jpg`

## 🔧 Características del Sistema

- ✅ **Agregar ilimitadas imágenes** por producto
- ✅ **Vista previa en miniatura** de cada imagen
- ✅ **Eliminar individualmente** cada imagen
- ✅ **Editar URLs** en tiempo real
- ✅ **Compatible con la imagen principal** (el campo "Imagen Principal" sigue funcionando igual)
- ✅ **Se guarda automáticamente** al hacer clic en "Guardar"

## 📊 Estructura de Datos

Las imágenes adicionales se guardan en Supabase como un array JSON:

```json
{
  "name": "Producto Ejemplo",
  "img": "img/principal.jpg",
  "gallery": [
    "img/foto1.jpg",
    "img/foto2.jpg",
    "img/foto3.jpg"
  ]
}
```

## 🎨 Próximos Pasos (Opcional)

Para mostrar la galería en las páginas de productos (`producto.html`, `catalogo.html`), necesitarás:

1. Leer el campo `gallery` desde la base de datos
2. Crear un carrusel o grid de imágenes
3. Agregar funcionalidad de zoom o lightbox

¿Necesitas ayuda para implementar la visualización de la galería en el frontend?

## ⚠️ Notas Importantes

- La **imagen principal** (`img`) sigue siendo obligatoria
- Las **imágenes de galería** son opcionales
- Las URLs vacías se filtran automáticamente al guardar
- El sistema es compatible con productos existentes (no les afecta)

## 🐛 Solución de Problemas

**Problema**: No puedo agregar imágenes
- Verifica que ejecutaste el script SQL en Supabase

**Problema**: Las imágenes no se ven
- Verifica que las URLs sean correctas
- Asegúrate de que las imágenes estén en la carpeta `img/` o sean URLs públicas

**Problema**: Error al guardar
- Revisa la consola del navegador (F12) para ver detalles del error
- Verifica que el campo `gallery` exista en Supabase
