-- Scripts sugeridos para crear RPCs/vistas de análisis en Supabase
-- Ejecutar en SQL Editor de Supabase (ajustar nombres/privilegios según RLS)

-- 1) Vista de ventas diarias (puede materializarse si es necesario)
CREATE OR REPLACE VIEW public.ventas_diarias AS
SELECT
  date_trunc('day', created_at) AS dia,
  COUNT(*) FILTER (WHERE (estado = 'pagado' OR status = 'pagado'))::int AS pedidos_count,
  COALESCE(SUM(COALESCE(total_clp, total)::numeric), 0) AS ingresos_clp
FROM public.pedidos
GROUP BY 1
ORDER BY 1 DESC;

-- 2) RPC: ventas por periodo
CREATE OR REPLACE FUNCTION public.ventas_por_periodo(start_ts timestamptz, end_ts timestamptz)
RETURNS TABLE(total_clp numeric, pedidos_count int) AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(COALESCE(total_clp, total)::numeric),0) AS total_clp,
         COUNT(*)::int AS pedidos_count
  FROM public.pedidos
  WHERE created_at >= start_ts AND created_at < end_ts
    AND (estado = 'pagado' OR status = 'pagado');
END;
$$ LANGUAGE plpgsql STABLE;

-- 3) RPC: top productos en un periodo (desempaqueta JSONB items)
CREATE OR REPLACE FUNCTION public.top_productos(start_ts timestamptz, end_ts timestamptz, limit_rows int DEFAULT 10)
RETURNS TABLE(product_id text, product_name text, qty bigint, revenue numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (item->>'id')::text AS product_id,
    p.name::text AS product_name,
    SUM((item->>'qty')::bigint) AS qty,
    SUM(((item->>'qty')::bigint) * ((item->>'price')::numeric)) AS revenue
  FROM public.pedidos,
       LATERAL jsonb_array_elements(coalesce(pedidos.items::jsonb, '[]'::jsonb)) AS item
  LEFT JOIN public.productos p ON (p.id::text = (item->>'id'))
  WHERE created_at >= start_ts AND created_at < end_ts
    AND (estado = 'pagado' OR status = 'pagado')
  GROUP BY 1,2
  ORDER BY revenue DESC
  LIMIT COALESCE(limit_rows, 10);
END;
$$ LANGUAGE plpgsql STABLE;

-- 4) RPC: ticket promedio
CREATE OR REPLACE FUNCTION public.ticket_promedio(start_ts timestamptz, end_ts timestamptz)
RETURNS numeric AS $$
DECLARE avgv numeric;
BEGIN
  SELECT AVG(COALESCE(total_clp, total)::numeric) INTO avgv
  FROM public.pedidos
  WHERE created_at >= start_ts AND created_at < end_ts
    AND (estado = 'pagado' OR status = 'pagado');
  RETURN COALESCE(avgv, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Nota: ejecutar estos scripts desde el SQL Editor de Supabase para crear las funciones.
