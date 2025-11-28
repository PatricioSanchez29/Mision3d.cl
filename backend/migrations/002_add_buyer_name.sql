-- Migration: Add buyer_name column to pedidos (if desired)
-- Run this in your Postgres / Supabase SQL editor if you want the explicit column

ALTER TABLE IF EXISTS pedidos
ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(255);

-- Optional index
CREATE INDEX IF NOT EXISTS idx_pedidos_buyer_name ON pedidos (buyer_name);
