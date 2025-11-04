// Página para mostrar los pedidos del usuario autenticado desde Supabase
import { supabase, getCurrentUser } from './supabase-orders.js';

async function mostrarPedidosUsuario() {
  const user = await getCurrentUser();
  if (!user) {
    document.getElementById('pedidosList').innerHTML = '<p>Debes iniciar sesión para ver tus pedidos.</p>';
    return;
  }
  
  console.log('[mis-pedidos] Usuario actual:', { id: user.id, email: user.email });
  
  // Buscar por user_id O por email (para pedidos hechos sin login)
  // Primero intentar con filter más flexible
  let query = supabase
    .from('pedidos')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Aplicar filtro: buscar por user_id O email que matchee (case-insensitive)
  const { data, error } = await query.or(`user_id.eq.${user.id},email.ilike.${user.email}`);
  
  console.log('[mis-pedidos] Resultados:', { count: data?.length || 0, error });
  
  if (error) {
    document.getElementById('pedidosList').innerHTML = '<p>Error cargando pedidos.</p>';
    console.error('Error cargando pedidos:', error);
    return;
  }
  if (!data || data.length === 0) {
    document.getElementById('pedidosList').innerHTML = `
      <p>No tienes pedidos registrados.</p>
      <p style="font-size:0.9rem;color:#666;margin-top:12px;">
        Buscando pedidos para: <b>${user.email}</b><br>
        Si realizaste un pedido y no aparece aquí, verifica que usaste este email.
      </p>
    `;
    return;
  }
  let html = '<ul>';
  for (const pedido of data) {
    const total = pedido.total_clp || pedido.total || pedido.totalCLP || 0;
    const fecha = pedido.created_at || pedido.createdat || pedido.createdAt || 'N/A';
    const items = pedido.items || [];
    const itemsText = items.map(it => `${it.name || it.title || 'Producto'} (x${it.qty || 1})`).join(', ') || 'Sin items';
    
    html += `<li>
      <b>ID:</b> ${pedido.id} | 
      <b>Estado:</b> ${pedido.estado} | 
      <b>Items:</b> ${itemsText} | 
      <b>Total:</b> $${total.toLocaleString('es-CL')} | 
      <b>Fecha:</b> ${new Date(fecha).toLocaleString('es-CL')}
    </li>`;
  }
  html += '</ul>';
  document.getElementById('pedidosList').innerHTML = html;
}

document.addEventListener('DOMContentLoaded', mostrarPedidosUsuario);