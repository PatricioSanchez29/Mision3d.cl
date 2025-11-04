// Página para mostrar los pedidos del usuario (solo lectura)
import { getCurrentUser } from './supabase-orders.js';

// Colores por estado
const ESTADO_COLORS = {
  pagado: { bg: '#d4edda', text: '#155724', icon: '✅' },
  enviado: { bg: '#cce5ff', text: '#004085', icon: '📦' },
  pendiente: { bg: '#fff3cd', text: '#856404', icon: '⏳' },
  cancelado: { bg: '#f8d7da', text: '#721c24', icon: '❌' }
};

async function mostrarPedidosUsuario() {
  const user = await getCurrentUser();
  if (!user) {
    document.getElementById('pedidosList').innerHTML = '<p>Debes iniciar sesión para ver tus pedidos.</p>';
    return;
  }

  const email = user.email?.trim();
  if (!email) {
    document.getElementById('pedidosList').innerHTML = '<p>No se pudo obtener tu email.</p>';
    return;
  }

  console.log('[mis-pedidos] Consultando pedidos para:', email);
  
  try {
    // Consultar al backend en lugar de Supabase directo (evita problemas de RLS)
    const response = await fetch(`/api/pedidos/by-email/${encodeURIComponent(email)}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      document.getElementById('pedidosList').innerHTML = '<p>Error cargando pedidos.</p>';
      console.error('Error:', data);
      return;
    }

    const pedidos = data.pedidos || [];
    console.log('[mis-pedidos] Pedidos encontrados:', pedidos.length);

    if (pedidos.length === 0) {
      document.getElementById('pedidosList').innerHTML = `
        <p>No tienes pedidos registrados.</p>
        <p style="font-size:0.9rem;color:#666;margin-top:12px;">
          Email: <b>${email}</b>
        </p>
      `;
      return;
    }

    // Renderizar pedidos con diseño limpio
    let html = '<div style="display:flex;flex-direction:column;gap:16px">';
    for (const pedido of pedidos) {
      const estado = (pedido.estado || 'pendiente').toLowerCase();
      const colors = ESTADO_COLORS[estado] || ESTADO_COLORS.pendiente;
      const total = Number(pedido.total || 0);
      const fecha = pedido.fecha ? new Date(pedido.fecha).toLocaleString('es-CL', { 
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'N/A';
      
      const items = pedido.items || [];
      const itemsHtml = items.map(it => {
        const name = it.name || it.title || 'Producto';
        const qty = it.qty || 1;
        const price = Number(it.price || 0);
        return `<li style="margin:4px 0">${name} <span style="color:#666">(x${qty} - $${price.toLocaleString('es-CL')})</span></li>`;
      }).join('');

      html += `
        <div style="background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div>
              <h3 style="margin:0;font-size:1.1rem;color:#333">Pedido #${pedido.orden || pedido.id}</h3>
              <p style="margin:4px 0 0 0;font-size:0.9rem;color:#666">${fecha}</p>
            </div>
            <div style="background:${colors.bg};color:${colors.text};padding:6px 14px;border-radius:20px;font-weight:600;font-size:0.9rem">
              ${colors.icon} ${estado.charAt(0).toUpperCase() + estado.slice(1)}
            </div>
          </div>
          <div style="border-top:1px solid #f0f0f0;padding-top:12px">
            <p style="margin:0 0 8px 0;font-weight:600;color:#555">Productos:</p>
            <ul style="margin:0;padding-left:20px;color:#444">
              ${itemsHtml || '<li style="color:#888">Sin detalles</li>'}
            </ul>
          </div>
          <div style="border-top:1px solid #f0f0f0;padding-top:12px;margin-top:12px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:0.95rem;color:#666">Total:</span>
            <span style="font-size:1.3rem;font-weight:700;color:#e6462f">$${total.toLocaleString('es-CL')}</span>
          </div>
        </div>
      `;
    }
    html += '</div>';
    document.getElementById('pedidosList').innerHTML = html;
  } catch (err) {
    console.error('[mis-pedidos] Error:', err);
    document.getElementById('pedidosList').innerHTML = '<p>Error de conexión. Intenta más tarde.</p>';
  }
}

document.addEventListener('DOMContentLoaded', mostrarPedidosUsuario);