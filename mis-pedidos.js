// Página para mostrar los pedidos del usuario autenticado desde Supabase
import { supabase, getCurrentUser } from './supabase-orders.js';

async function mostrarPedidosUsuario() {
  const user = await getCurrentUser();
  if (!user) {
    document.getElementById('pedidosList').innerHTML = '<p>Debes iniciar sesión para ver tus pedidos.</p>';
    return;
  }
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('user_id', user.id)
    .order('createdAt', { ascending: false });
  if (error) {
    document.getElementById('pedidosList').innerHTML = '<p>Error cargando pedidos.</p>';
    return;
  }
  if (!data || data.length === 0) {
    document.getElementById('pedidosList').innerHTML = '<p>No tienes pedidos registrados.</p>';
    return;
  }
  let html = '<ul>';
  for (const pedido of data) {
    html += `<li><b>ID:</b> ${pedido.id} | <b>Estado:</b> ${pedido.estado} | <b>Total:</b> $${pedido.totalCLP} | <b>Fecha:</b> ${pedido.createdAt}</li>`;
  }
  html += '</ul>';
  document.getElementById('pedidosList').innerHTML = html;
}

document.addEventListener('DOMContentLoaded', mostrarPedidosUsuario);