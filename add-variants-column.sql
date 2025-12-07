-- Script para agregar columna 'variants' a la tabla productos
-- Ejecutar en el SQL Editor de Supabase

-- Agregar columna variants como JSONB para almacenar array de variantes
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- Comentario explicativo
COMMENT ON COLUMN productos.variants IS 'Array de variantes del producto: [{"name": "Grande", "price": 15000}, {"name": "Pequeño", "price": 10000}]';

-- Verificar la estructura
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'productos' AND column_name = 'variants';
