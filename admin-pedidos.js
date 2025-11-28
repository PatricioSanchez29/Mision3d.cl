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
    .order('created_at', { ascending: false });
  if (error) {
    document.getElementById('adminPedidosList').innerHTML = '<p>Error cargando pedidos.</p>';
    console.error('Error cargando pedidos:', error);
    return;
  }
  if (!data || data.length === 0) {
    document.getElementById('adminPedidosList').innerHTML = '<p>No hay pedidos registrados.</p>';
    return;
  }
  let html = '<ul>';
  for (const pedido of data) {
    const total = pedido.total_clp || pedido.total || 0;
    const email = pedido.email || pedido.user_id || pedido.user_email || 'N/A';
    const fecha = pedido.created_at || pedido.createdat || pedido.createdAt || 'N/A';

    // Parse meta safely (some registros guardan meta como string)
    let meta = {};
    try {
      if (pedido.meta) meta = typeof pedido.meta === 'string' ? JSON.parse(pedido.meta) : pedido.meta;
    } catch (e) {
      meta = {};
    }

    // Parse items safely
    let items = pedido.items || [];
    try {
      if (items && typeof items === 'string') items = JSON.parse(items);
    } catch (e) {
      // keep original
    }

    const itemsText = Array.isArray(items) ? items.map(it => `${it.name || it.title || it.productName || 'Producto'} (x${it.qty || it.quantity || 1})`).join(', ') : (items || 'Sin items');

    // Fallbacks for buyer info
    const nombre = pedido.nombre || pedido.buyer_name || meta.nombre || meta.name || (Array.isArray(items) && items[0] && (items[0].customName || items[0].name)) || '';
    const apellidos = pedido.apellidos || meta.apellidos || '';
    const rut = pedido.rut || meta.rut || meta.rut_cliente || '';
    const telefono = pedido.telefono || meta.telefono || meta.phone || '';
    const direccion = meta.direccion || meta.address || '';

    html += `<li>
      <b>ID:</b> ${pedido.id} | <b>Email:</b> ${email} | <b>Nombre:</b> ${nombre || 'N/A'} ${apellidos || ''} | <b>RUT:</b> ${rut || 'N/A'} | <b>Estado:</b>
      <select data-id="${pedido.id}" class="estado-select">
        <option value="pendiente"${pedido.estado === 'pendiente' ? ' selected' : ''}>pendiente</option>
        <option value="pagado"${pedido.estado === 'pagado' ? ' selected' : ''}>pagado</option>
        <option value="enviado"${pedido.estado === 'enviado' ? ' selected' : ''}>enviado</option>
        <option value="cancelado"${pedido.estado === 'cancelado' ? ' selected' : ''}>cancelado</option>
      </select>
      | <b>Total:</b> $${total.toLocaleString('es-CL')} | <b>Items:</b> ${itemsText} | <b>Tel:</b> ${telefono || 'N/A'} | <b>Dirección:</b> ${direccion || 'N/A'} | <b>Fecha:</b> ${new Date(fecha).toLocaleString('es-CL')}
      <button data-id="${pedido.id}" class="mark-paid-btn" style="margin-left:10px;color:#fff;background:#16a34a;border:none;padding:4px 8px;border-radius:4px;">Marcar pagado + email</button>
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
      const { error } = await supabase.from('pedidos').update({ estado: nuevoEstado, status: nuevoEstado }).eq('id', pedidoId);
      if (error) {
        alert('Error actualizando estado: ' + error.message);
      } else {
        alert('Estado actualizado');
      }
    });
  });

  // Botón: marcar pagado + enviar correo
  document.querySelectorAll('.mark-paid-btn').forEach(btn => {
    btn.addEventListener('click', async function () {
      const id = this.getAttribute('data-id');
      if (!confirm('¿Marcar como PAGADO y enviar correo de confirmación al cliente?')) return;
      let adminKey = sessionStorage.getItem('ADMIN_KEY');
      if (!adminKey) {
        adminKey = prompt('Ingresa la ADMIN_KEY');
        if (!adminKey) return;
        sessionStorage.setItem('ADMIN_KEY', adminKey);
      }
      try {
        const base = window.location.origin;
        const resp = await fetch(base + '/api/admin/pedidos/' + encodeURIComponent(id) + '/marcar-pagado', {
          method: 'POST',
          headers: { 'x-admin-key': adminKey }
        });
        const data = await resp.json().catch(()=>({}));
        if (!resp.ok) {
          alert('Error: ' + (data?.detail || data?.error || resp.status));
          return;
        }
        alert('Pedido marcado como pagado y correo enviado.');
        mostrarPedidosAdmin();
      } catch (e) {
        alert('Error realizando la acción: ' + (e?.message || e));
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