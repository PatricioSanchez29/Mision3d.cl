-- Script para agregar columna 'gallery' a la tabla productos
-- Ejecuta este script en el SQL Editor de Supabase

-- Agregar columna gallery como JSONB (permite almacenar arrays de URLs)
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb;

-- Comentario descriptivo
COMMENT ON COLUMN productos.gallery IS 'Array de URLs de imágenes adicionales para la galería del producto';

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'productos' AND column_name = 'gallery';
