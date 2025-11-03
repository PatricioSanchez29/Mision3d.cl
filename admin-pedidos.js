// Panel de administración para ver todos los pedidos (solo admins)
import { supabase, getCurrentUser } from './supabase-orders.js';

async function mostrarPedidosAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    document.getElementById('adminPedidosList').innerHTML = '<p>Debes iniciar sesión como administrador.</p>';
    return;
  }
  // Puedes filtrar por email de admin si lo deseas
  // const adminEmails = ['tucorreo@admin.com', 'otroadmin@dominio.com'];
  // if (!adminEmails.includes(user.email)) {
  //   document.getElementById('adminPedidosList').innerHTML = '<p>No tienes permisos de administrador.</p>';
  //   return;
  // }
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .order('createdAt', { ascending: false });
  if (error) {
    document.getElementById('adminPedidosList').innerHTML = '<p>Error cargando pedidos.</p>';
    return;
  }
  if (!data || data.length === 0) {
    document.getElementById('adminPedidosList').innerHTML = '<p>No hay pedidos registrados.</p>';
    return;
  }
  let html = '<ul>';
  for (const pedido of data) {
    html += `<li>
      <b>ID:</b> ${pedido.id} | <b>Usuario:</b> ${pedido.user_id} | <b>Estado:</b> 
      <select data-id="${pedido.id}" class="estado-select">
        <option value="pendiente"${pedido.estado === 'pendiente' ? ' selected' : ''}>pendiente</option>
        <option value="pagado"${pedido.estado === 'pagado' ? ' selected' : ''}>pagado</option>
        <option value="enviado"${pedido.estado === 'enviado' ? ' selected' : ''}>enviado</option>
        <option value="cancelado"${pedido.estado === 'cancelado' ? ' selected' : ''}>cancelado</option>
      </select>
      | <b>Total:</b> $${pedido.totalCLP} | <b>Fecha:</b> ${pedido.createdAt}
      <button data-id="${pedido.id}" class="eliminar-btn" style="margin-left:10px;color:#fff;background:#e11d48;border:none;padding:4px 8px;border-radius:4px;">Eliminar</button>
    </li>`;
  }
  html += '</ul>';
  document.getElementById('adminPedidosList').innerHTML = html;

  // Evento para cambio de estado
  document.querySelectorAll('.estado-select').forEach(sel => {
    sel.addEventListener('change', async function() {
      const pedidoId = this.getAttribute('data-id');
      const nuevoEstado = this.value;
      const { error } = await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', pedidoId);
      if (error) {
        alert('Error actualizando estado: ' + error.message);
      } else {
        alert('Estado actualizado');
      }
    });
  });

  // Evento para eliminar pedido
  document.querySelectorAll('.eliminar-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!confirm('¿Seguro que deseas eliminar este pedido?')) return;
      const pedidoId = this.getAttribute('data-id');
      const { error } = await supabase.from('pedidos').delete().eq('id', pedidoId);
      if (error) {
        alert('Error eliminando pedido: ' + error.message);
      } else {
        alert('Pedido eliminado');
        mostrarPedidosAdmin();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', mostrarPedidosAdmin);