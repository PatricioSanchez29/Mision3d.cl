// Agente analista de ventas (backend)
// Este módulo ofrece funciones para resolver preguntas comunes usando consultas reales a Supabase.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials missing');
  return createClient(url, key);
}

async function fetchSummary(fromIso, toIso) {
  const supabase = getSupabaseClient();
  const { data: pedidosRaw, error: pedidosErr } = await supabase
    .from('pedidos')
    .select('id, items, total_clp, total, created_at, estado, status')
    .gte('created_at', fromIso)
    .lt('created_at', toIso);
  if (pedidosErr) throw pedidosErr;
  const { data: productsList } = await supabase.from('productos').select('id, name, price, stock');
  return { pedidosRaw, productsList };
}

function aggregateFromRaw(pedidosRaw, productsList) {
  const productsMap = new Map((productsList || []).map(p => [String(p.id), p]));
  const productStats = new Map();
  let totalSales = 0;
  let ordersCount = 0;

  for (const p of (pedidosRaw || [])) {
    if (!(String(p.estado).toLowerCase() === 'pagado' || String(p.status).toLowerCase() === 'pagado')) continue;
    ordersCount += 1;
    const totalVal = Number(p.total_clp ?? p.total ?? 0) || 0;
    totalSales += totalVal;
    let items = p.items || [];
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch { items = []; }
    }
    if (!Array.isArray(items)) items = [];
    for (const it of items) {
      const id = String(it.id ?? it.productId ?? it.product_id ?? '');
      const qty = Number(it.qty ?? it.quantity ?? 1) || 0;
      const price = Number(it.price ?? 0) || 0;
      const rev = qty * price;
      if (!productStats.has(id)) productStats.set(id, { qty: 0, revenue: 0 });
      const cur = productStats.get(id);
      cur.qty += qty;
      cur.revenue += rev;
    }
  }

  const topProducts = Array.from(productStats.entries()).map(([id, v]) => ({
    id,
    name: productsMap.get(id)?.name || null,
    qty: v.qty,
    revenue: Math.round(v.revenue || 0),
    stock: productsMap.get(id)?.stock ?? null
  })).sort((a,b) => b.revenue - a.revenue);

  const lowSellers = (productsList || []).map(p => {
    const id = String(p.id);
    const stats = productStats.get(id) || { qty: 0, revenue: 0 };
    return { id, name: p.name, qty: stats.qty, revenue: Math.round(stats.revenue || 0), stock: p.stock ?? null };
  }).sort((a,b) => a.qty - b.qty);

  return {
    totalSales: Math.round(totalSales),
    ordersCount,
    avgTicket: ordersCount > 0 ? Math.round(totalSales / ordersCount) : 0,
    topProducts,
    lowSellers
  };
}

// Mapea preguntas frecuentes a respuestas basadas en datos
export async function answerQuestion(question, opts = {}) {
  // opts: { fromIso, toIso }
  const now = new Date();
  const fromIso = opts.fromIso || new Date(new Date().setHours(0,0,0,0)).toISOString();
  const toIso = opts.toIso || new Date(new Date().setHours(23,59,59,999)).toISOString();

  const q = String(question || '').toLowerCase();
  const { pedidosRaw, productsList } = await fetchSummary(fromIso, toIso);
  const agg = aggregateFromRaw(pedidosRaw, productsList);

  // Respuestas para intents conocidos
  if (q.includes('cuánto vend') && q.includes('hoy')) {
    return { intent: 'ventas_hoy', value: agg.totalSales, currency: 'CLP', meta: { from: fromIso, to: toIso } };
  }
  if (q.includes('cuánto vend') && q.includes('semana')) {
    return { intent: 'ventas_semana', value: agg.totalSales, currency: 'CLP', meta: { from: fromIso, to: toIso } };
  }
  if (q.includes('cuánto vend') && q.includes('mes')) {
    return { intent: 'ventas_mes', value: agg.totalSales, currency: 'CLP', meta: { from: fromIso, to: toIso } };
  }
  if (q.includes('cuántos pedidos') || q.includes('cuantos pedidos')) {
    return { intent: 'pedidos_count', value: agg.ordersCount, meta: { from: fromIso, to: toIso } };
  }
  if (q.includes('producto más vendido') || q.includes('producto mas vendido') || q.includes('más vendido')) {
    const top = agg.topProducts[0] || null;
    return { intent: 'top_product', top };
  }
  if (q.includes('productos que generaron más ingresos') || q.includes('qué productos generaron más ingresos')) {
    return { intent: 'productos_top_revenue', items: agg.topProducts.slice(0,10) };
  }
  if (q.includes('ticket promedio') || q.includes('ticket medio') || q.includes('promedio')) {
    return { intent: 'avg_ticket', value: agg.avgTicket, currency: 'CLP' };
  }
  if (q.includes('venden menos') || q.includes('vendiendo menos') || q.includes('productos están vendiendo menos')) {
    // Retornar low sellers con qty asc y stock>0 si disponible
    const list = agg.lowSellers.filter(i => i.qty <= 5).slice(0,10);
    return { intent: 'low_sellers', items: list };
  }
  if (q.includes('compar') && q.includes('período')) {
    // Comparativa simple: necesitaríamos otro periodo; indicar falta de parámetros
    return { intent: 'compare_periods', message: 'Se requiere período anterior para comparar. Envia from/to y prev_from/prev_to.' };
  }

  // Fallback: devolver resumen general
  return { intent: 'summary', summary: agg };
}

export default { answerQuestion };
