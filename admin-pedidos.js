// Panel de administración para ver todos los pedidos (solo admins)
import { getCurrentUser } from './supabase-orders.js';

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
  // Obtener ADMIN_KEY (guardado en sessionStorage) para autenticar contra el backend
  let adminKey = sessionStorage.getItem('ADMIN_KEY');
  if (!adminKey) {
    adminKey = prompt('Ingresa la ADMIN_KEY para acceder al panel de pedidos');
    if (!adminKey) {
      document.getElementById('adminPedidosList').innerHTML = '<p>ADMIN_KEY requerida para ver pedidos.</p>';
      return;
    }
    sessionStorage.setItem('ADMIN_KEY', adminKey);
  }

  // Llamar al endpoint backend protegido para obtener los pedidos
  const listResp = await fetch('/api/admin/pedidos', { headers: { 'x-admin-key': adminKey } });
  if (!listResp.ok) {
    const errBody = await listResp.json().catch(()=>({}));
    document.getElementById('adminPedidosList').innerHTML = '<p>Error cargando pedidos: '+(errBody.detail||errBody.error||listResp.status)+'</p>';
    console.error('Error cargando pedidos:', errBody);
    return;
  }
  const payload = await listResp.json().catch(()=>({}));
  // Soportar varios formatos de respuesta: array directo, { data: [...] }, { rows: [...] }, etc.
  let data = [];
  if (Array.isArray(payload)) {
    data = payload;
  } else if (Array.isArray(payload?.data)) {
    data = payload.data;
  } else if (Array.isArray(payload?.rows)) {
    data = payload.rows;
  } else if (Array.isArray(payload?.results)) {
    data = payload.results;
  } else if (payload && typeof payload === 'object') {
    // Buscar la primera propiedad que sea un array
    for (const k of Object.keys(payload)) {
      if (Array.isArray(payload[k])) { data = payload[k]; break; }
    }
  }
  console.debug('admin-pedidos: payload', payload, '=> items:', data.length);
  if (!data || data.length === 0) {
    const debugPre = `<pre style="white-space:pre-wrap;word-break:break-word;max-height:240px;overflow:auto;background:#f7f7f7;border:1px solid #eee;padding:8px;border-radius:4px">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
    document.getElementById('adminPedidosList').innerHTML = `<p>No hay pedidos registrados.</p><div style="margin-top:8px"><strong>Debug payload:</strong>${debugPre}</div>`;
    return;
  }

  // Helper: escapar HTML en debug
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  let html = '';
  // Construir tabla con columnas: ID, Usuario, Estado, Total, Items, Fecha, Pago, Dirección, Tel, Nota, Cupón, Acciones
  html += `<table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="text-align:left;border-bottom:2px solid #eee">
        <th style="padding:8px">ID</th>
        <th style="padding:8px">Usuario</th>
        <th style="padding:8px">Estado</th>
        <th style="padding:8px">Total</th>
        <th style="padding:8px">Items</th>
        <th style="padding:8px">Fecha</th>
        <th style="padding:8px">Pago</th>
        <th style="padding:8px">Dirección</th>
        <th style="padding:8px">Tel</th>
        <th style="padding:8px">Nota</th>
        <th style="padding:8px">Cupón</th>
        <th style="padding:8px">Acciones</th>
      </tr>
    </thead>
    <tbody>`;
  for (const pedido of data) {
    const total = pedido.total_clp || pedido.total || 0;
    // Nombre del comprador: buscar en varios campos posibles
    const name = pedido.name || pedido.buyer_name || pedido.customer_name || (pedido.meta && (pedido.meta.name || pedido.meta.nombre)) || 'N/A';
    const email = pedido.email || pedido.user_id || (pedido.meta && (pedido.meta.email || pedido.meta.payer_email)) || 'N/A';
    const fecha = pedido.created_at || pedido.createdat || pedido.createdAt || 'N/A';
    const items = pedido.items || [];
    const itemsText = items.map(it => `${it.name || it.title || 'Producto'} (x${it.qty || 1})`).join(', ') || 'Sin items';

    // Datos de envío/checkout (si están disponibles en la fila o en meta)
    const meta = pedido.meta || {};
    const shippingMethod = pedido.shipping || pedido.shipping_cost || meta.envio || meta.shipping_method || '';
    const shippingCost = pedido.shipping || pedido.shipping_cost || pedido.shippingCost || meta.shippingCost || null;
    const phone = pedido.phone || pedido.telefono || meta.phone || meta.telefono || meta.contact_phone || '';
    const address = meta.address || meta.direccion || meta.calle || meta.direccion_completa || meta.addressLine || '';
    const region = meta.region || meta.comuna || '';

    // Extraer datos del checkout/pago en varias posibles ubicaciones
    const checkout = pedido.checkout || pedido.checkout_data || pedido.checkoutInfo || pedido.payment || pedido.pago || pedido.payment_intent || pedido.paymentIntent || {};
    const paymentMethod = checkout.payment_method || checkout.method || pedido.payment_method || meta.payment_method || '';
    const paymentStatus = checkout.status || pedido.payment_status || pedido.status_pago || meta.payment_status || '';
    const billing = checkout.billing || checkout.billing_address || meta.billing || {};
    const billingAddress = billing.address || billing.line1 || billing.addressLine || meta.billing_address || '';
    const shippingAddress = checkout.shipping_address || address || checkout.shipping || '';
    const note = pedido.note || pedido.notes || meta.note || meta.nota || checkout.note || '';
    const coupon = pedido.coupon || pedido.discount || meta.coupon || checkout.coupon || '';

    let shippingHtml = '';
    if (shippingMethod || phone || address || region || paymentMethod || paymentStatus || billingAddress || note || coupon) {
      shippingHtml = `<div style="margin-top:6px;font-size:0.95em;color:#333;border-top:1px solid #eee;padding-top:8px">`;
      // Envío
      shippingHtml += `<div><strong>Envío:</strong> ${shippingMethod || '—'} ${shippingCost ? `| $${Number(shippingCost).toLocaleString('es-CL')}` : ''}`;
      if (shippingAddress) shippingHtml += ` | Dirección envío: ${shippingAddress}`;
      if (region) shippingHtml += ` | Región / Comuna: ${region}`;
      shippingHtml += `</div>`;
      // Facturación / pago
      if (paymentMethod || paymentStatus || billingAddress) {
        shippingHtml += `<div><strong>Pago:</strong> ${paymentMethod || '—'} ${paymentStatus ? `| Estado: ${paymentStatus}` : ''}`;
        if (billingAddress) shippingHtml += ` | Dirección factura: ${billingAddress}`;
        shippingHtml += `</div>`;
      }
      if (phone) shippingHtml += `<div><strong>Teléfono:</strong> ${phone}</div>`;
      if (note) shippingHtml += `<div><strong>Nota:</strong> ${note}</div>`;
      if (coupon) shippingHtml += `<div><strong>Cupón / descuento:</strong> ${coupon}</div>`;
      shippingHtml += `</div>`;
    }

    html += `<tr style="border-bottom:1px solid #f1f1f1">
      <td style="padding:8px;vertical-align:top">${pedido.id}</td>
      <td style="padding:8px;vertical-align:top">${name}<br><small style="color:#666">${email}</small></td>
      <td style="padding:8px;vertical-align:top">
        <select data-id="${pedido.id}" class="estado-select">
          <option value="pendiente"${pedido.estado === 'pendiente' ? ' selected' : ''}>pendiente</option>
          <option value="pagado"${pedido.estado === 'pagado' ? ' selected' : ''}>pagado</option>
          <option value="enviado"${pedido.estado === 'enviado' ? ' selected' : ''}>enviado</option>
          <option value="cancelado"${pedido.estado === 'cancelado' ? ' selected' : ''}>cancelado</option>
        </select>
      </td>
      <td style="padding:8px;vertical-align:top">$${total.toLocaleString('es-CL')}</td>
      <td style="padding:8px;vertical-align:top">${itemsText}</td>
      <td style="padding:8px;vertical-align:top">${new Date(fecha).toLocaleString('es-CL')}</td>
      <td style="padding:8px;vertical-align:top">${paymentMethod || '—'}${paymentStatus ? ` | ${paymentStatus}` : ''}${billingAddress ? `<div style="color:#666;font-size:0.95em">${billingAddress}</div>` : ''}</td>
      <td style="padding:8px;vertical-align:top">${shippingAddress || address || '—'}${region ? `<div style="color:#666;font-size:0.95em">${region}</div>` : ''}</td>
      <td style="padding:8px;vertical-align:top">${phone || '—'}</td>
      <td style="padding:8px;vertical-align:top">${note || '—'}</td>
      <td style="padding:8px;vertical-align:top">${coupon || '—'}</td>
      <td style="padding:8px;vertical-align:top">
        <div style="display:flex;flex-direction:column;gap:6px">
          <button data-id="${pedido.id}" class="mark-paid-btn" style="color:#fff;background:#16a34a;border:none;padding:6px 8px;border-radius:4px;">Marcar pagado + email</button>
          <button data-id="${pedido.id}" class="eliminar-btn" style="color:#fff;background:#e11d48;border:none;padding:6px 8px;border-radius:4px;">Eliminar</button>
          <button data-payload="${encodeURIComponent(JSON.stringify(pedido))}" class="view-details-btn" style="color:#111;background:#f3f4f6;border:1px solid #ccc;padding:6px 8px;border-radius:4px;">Ver detalles</button>
        </div>
      </td>
    </tr>`;
  }
  html += '</tbody></table>';
  document.getElementById('adminPedidosList').innerHTML = html;

  // Evento para cambio de estado -> usar endpoint PATCH admin
  document.querySelectorAll('.estado-select').forEach(sel => {
    sel.addEventListener('change', async function() {
      const pedidoId = this.getAttribute('data-id');
      const nuevoEstado = this.value;
      let adminKey = sessionStorage.getItem('ADMIN_KEY');
      try {
        const resp = await fetch('/api/admin/pedidos/' + encodeURIComponent(pedidoId), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
          body: JSON.stringify({ estado: nuevoEstado, status: nuevoEstado })
        });
        if (!resp.ok) {
          const b = await resp.json().catch(()=>({}));
          alert('Error actualizando estado: ' + (b.detail || b.error || resp.status));
        } else {
          alert('Estado actualizado');
        }
      } catch (e) {
        alert('Error actualizando estado: ' + (e?.message || e));
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

  // Evento para eliminar pedido -> usar endpoint DELETE admin
  document.querySelectorAll('.eliminar-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!confirm('¿Seguro que deseas eliminar este pedido?')) return;
      const pedidoId = this.getAttribute('data-id');
      const adminKey = sessionStorage.getItem('ADMIN_KEY');
      try {
        const resp = await fetch('/api/admin/pedidos/' + encodeURIComponent(pedidoId), { method: 'DELETE', headers: { 'x-admin-key': adminKey } });
        if (!resp.ok) {
          const b = await resp.json().catch(()=>({}));
          alert('Error eliminando pedido: ' + (b.detail || b.error || resp.status));
        } else {
          alert('Pedido eliminado');
          mostrarPedidosAdmin();
        }
      } catch (e) {
        alert('Error eliminando pedido: ' + (e?.message || e));
      }
    });
  });

  // Botón: Ver JSON completo del pedido en modal (debug)
  document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const payload = this.getAttribute('data-payload') || '';
      let obj = null;
      try {
        obj = JSON.parse(decodeURIComponent(payload));
      } catch (e) {
        obj = { error: 'invalid JSON', raw: payload };
      }
      showPedidoModal(obj);
    });
  });

  // Modal helper: crea/actualiza modal con JSON formateado
  function showPedidoModal(obj) {
    const existing = document.getElementById('pedido-details-modal');
    const pretty = JSON.stringify(obj, null, 2);
    if (existing) {
      existing.querySelector('pre').textContent = pretty;
      existing.style.display = 'block';
      return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'pedido-details-modal';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';

    overlay.innerHTML = `
      <div style="background:#fff;max-width:900px;width:92%;max-height:90%;overflow:auto;border-radius:8px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong>Detalle del pedido (JSON)</strong>
          <button id="pedido-details-close" style="background:#ef4444;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer">Cerrar</button>
        </div>
        <pre style="white-space:pre-wrap;word-break:break-word;max-height:calc(90vh - 120px);overflow:auto;background:#111;color:#e6e6e6;padding:12px;border-radius:6px">${pretty}</pre>
      </div>
    `;

    document.body.appendChild(overlay);

    // Cerrar modal
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) overlay.style.display = 'none';
    });
    document.getElementById('pedido-details-close').addEventListener('click', () => {
      overlay.style.display = 'none';
    });
  }
}

document.addEventListener('DOMContentLoaded', mostrarPedidosAdmin);