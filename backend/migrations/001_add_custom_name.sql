-- Migration: Add custom_name column to pedidos
-- Run this in your Postgres / Supabase SQL editor

ALTER TABLE IF EXISTS pedidos
ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255);

-- Optional: index to speed up queries filtering by custom_name
CREATE INDEX IF NOT EXISTS idx_pedidos_custom_name ON pedidos (custom_name);
