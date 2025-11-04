// Página para mostrar los pedidos del usuario autenticado desde Supabase
import { supabase, getCurrentUser } from './supabase-orders.js';

async function mostrarPedidosUsuario() {
  const user = await getCurrentUser();
  if (!user) {
    document.getElementById('pedidosList').innerHTML = '<p>Debes iniciar sesión para ver tus pedidos.</p>';
    return;
  }
  // Buscar por user_id O por email (para pedidos hechos sin login)
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .order('created_at', { ascending: false });
  if (error) {
    document.getElementById('pedidosList').innerHTML = '<p>Error cargando pedidos.</p>';
    console.error('Error cargando pedidos:', error);
    return;
  }
  if (!data || data.length === 0) {
    document.getElementById('pedidosList').innerHTML = '<p>No tienes pedidos registrados.</p>';
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