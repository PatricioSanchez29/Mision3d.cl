# Sistema de Variantes / Subproductos

## ¿Qué son las variantes?

Las variantes permiten ofrecer **diferentes versiones del mismo producto** con nombres y precios distintos.

### Ejemplos de uso:

**Producto: Calendario F1 2026**
- Variante 1: "Tamaño Grande" → $15,990
- Variante 2: "Tamaño Mediano" → $12,990
- Variante 3: "Tamaño Pequeño" → $9,990

**Producto: Figura Personalizada**
- Variante 1: "Con base iluminada" → $25,000
- Variante 2: "Sin base" → $18,000
- Variante 3: "Con caja premium" → $22,000

**Producto: Beyblade Personalizado**
- Variante 1: "Color Azul" → $8,990
- Variante 2: "Color Rojo" → $8,990
- Variante 3: "Edición Dorada" → $12,990

## Cómo configurar variantes

### 1. En el Panel de Administración (admin.html)

1. Ve a **Panel de Administración**
2. Edita un producto existente o crea uno nuevo
3. En la sección **"🔀 Variantes / Subproductos"** haz clic en **"+ Agregar variante"**
4. Ingresa:
   - **Nombre de la variante**: Ej: "Grande", "Con base", "Color Azul"
   - **Precio diferencial**: El precio específico de esta variante
5. Puedes agregar múltiples variantes
6. Haz clic en **"Guardar"**

### 2. Configurar Supabase

Ejecuta el siguiente SQL en Supabase:

```sql
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
```

Este comando se encuentra en el archivo `add-variants-column.sql`

## Estructura de datos

Las variantes se guardan en formato JSON:

```json
[
  {
    "name": "Grande",
    "price": 15990
  },
  {
    "name": "Mediano",
    "price": 12990
  },
  {
    "name": "Pequeño",
    "price": 9990
  }
]
```

## Cómo se muestran al cliente

Cuando un producto tiene variantes:
- Se mostrará un **selector dropdown** en la página del producto
- El cliente podrá elegir la variante deseada
- El precio se actualizará automáticamente según la variante seleccionada
- Al agregar al carrito, se guardará qué variante específica eligió

## Preguntas frecuentes

**¿Puedo tener un producto sin variantes?**
Sí, las variantes son opcionales. Si no agregas ninguna, el producto funciona normal con su precio base.

**¿Cuántas variantes puedo agregar?**
Tantas como necesites. Se recomienda máximo 5-7 para no confundir al cliente.

**¿Puedo cambiar las variantes después?**
Sí, puedes editar, agregar o eliminar variantes en cualquier momento desde el panel admin.

**¿Afecta al inventario?**
Por ahora, el stock es compartido entre todas las variantes. En el futuro se puede agregar stock independiente por variante.

## Próximas mejoras

- [ ] Stock independiente por variante
- [ ] Imágenes específicas por variante
- [ ] Variantes con múltiples atributos (Ej: Color + Tamaño)
- [ ] Descuentos por variante
