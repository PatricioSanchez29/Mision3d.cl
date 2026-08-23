// Simple dashboard frontend: consume /api/analytics/summary
async function fetchSummary(fromIso, toIso) {
  const params = new URLSearchParams();
  if (fromIso) params.set('from', fromIso);
  if (toIso) params.set('to', toIso);
  // Determinar base API: si la página no está en el mismo puerto que el backend
  const API_BASE = (function(){
    try {
      const p = location.port || '';
      if (p && p !== '3000') return 'http://localhost:3000';
    } catch(e){}
    return location.origin;
  })();

  // Añadir header x-admin-key desde sessionStorage (igual que admin UI)
  // Read admin key from sessionStorage only (do not prefill input to avoid exposing it)
  let adminKey = null;
  try { adminKey = sessionStorage.getItem('ADMIN_KEY') || null; } catch (e) { adminKey = null; }
  if (!adminKey) {
    // Prompt as fallback but do not prefill any input field with the key
    const p = prompt('Ingresa la ADMIN_KEY para acceder al dashboard');
    if (p) {
      try { sessionStorage.setItem('ADMIN_KEY', p); } catch (e) {}
      adminKey = p;
    }
  }
  const headers = {};
  if (adminKey) headers['x-admin-key'] = adminKey;
  const resp = await fetch(API_BASE + '/api/analytics/summary?' + params.toString(), { headers });
  if (!resp.ok) {
    const txt = await resp.text().catch(()=>'<no body>');
    showError(`Summary fetch failed: ${resp.status} ${resp.statusText} - ${txt}`);
    try { return JSON.parse(txt); } catch(e){ return { success:false, error: 'http', status: resp.status, detail: txt }; }
  }
  return resp.json();
}

function showError(msg){
  try{ const box = document.getElementById('errorBox'); if(box) box.textContent = String(msg); else alert(msg); }catch(e){ alert(msg); }
}

function fmtCLP(n){ return '$' + Number(n || 0).toLocaleString('es-CL'); }

function render(kpis){
  const kp = document.getElementById('kpis'); kp.innerHTML = '';
  const items = [
    {k:'Total ventas', v: fmtCLP(kpis.total_sales_clp)},
    {k:'Pedidos', v: kpis.orders_count},
    {k:'Ticket promedio', v: fmtCLP(kpis.avg_ticket_clp)}
  ];
  for (const it of items){
    const el = document.createElement('div'); el.className='kpi'; el.innerHTML = `<div style="font-size:0.9rem;color:#666">${it.k}</div><div style="font-size:1.4rem;font-weight:700;margin-top:6px">${it.v}</div>`; kp.appendChild(el);
  }
}

function renderList(containerId, arr){
  const el = document.getElementById(containerId);
  if(!arr || arr.length===0){ el.innerHTML = '<p style="color:#666">Sin datos</p>'; return; }
  el.innerHTML = `<ol>${arr.map(a=>`<li><b>${a.name||a.id}</b> — qty: ${a.qty} — ${fmtCLP(a.revenue)}</li>`).join('')}</ol>`;
}

function renderPayments(containerId, orders){
  const el = document.getElementById(containerId);
  if(!orders || orders.length===0){ el.innerHTML = '<p style="color:#666">Sin pagos en el periodo</p>'; return; }
  const html = orders.map(o => {
    let items = o.items || [];
    try{ if (typeof items === 'string') items = JSON.parse(items); } catch(e){ items = []; }
    const itemsHtml = (items||[]).map(it=>`<div style="font-size:0.9rem;margin-top:6px">• ${it.name||it.title||it.product_id||''} x ${it.qty||1} — ${fmtCLP((it.price||0) * (it.qty||1))}</div>`).join('');
    const ord = o.commerce_order || o.id || '';
    return `
      <div style="padding:10px;border:1px solid #eee;border-radius:6px;margin-bottom:8px">
        <div style="font-weight:700">${ord} — ${new Date(o.created_at).toLocaleString('es-CL')}</div>
        <div style="color:#444;margin-top:6px">Email: ${o.email || '—' } — Total: ${fmtCLP(o.total_clp || o.total || 0)}</div>
        ${itemsHtml}
      </div>`;
  }).join('');
  el.innerHTML = html;
}

document.getElementById('btnReload').addEventListener('click', async ()=>{
  const f = document.getElementById('from').value;
  const t = document.getElementById('to').value;
  const fromIso = f ? new Date(f).toISOString() : null;
  const toIso = t ? new Date(t).toISOString() : null;
  try{
    const data = await fetchSummary(fromIso, toIso);
    if(!data || !data.success) { alert('Error cargando resumen'); return; }
    render(data.summary);
    renderList('topProducts', data.summary.top_products || []);
    renderList('lowSellers', data.summary.low_sellers || []);
    // Cargar series para el rango y para el periodo anterior equivalente
    const API_BASE = (function(){ try{ const p = location.port || ''; if (p && p !== '3000') return 'http://localhost:3000'; }catch(e){} return location.origin; })();
    const adminKey = sessionStorage.getItem('ADMIN_KEY');
    const hdrs = adminKey ? { 'x-admin-key': adminKey } : {};
    const fromDate = fromIso ? new Date(fromIso) : new Date(new Date().setHours(0,0,0,0));
    const toDate = toIso ? new Date(toIso) : new Date(new Date().setHours(23,59,59,999));
    // compute previous period of same length
    const periodMs = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - periodMs);

    async function fetchSeries(fromISO, toISO){
      const q = new URLSearchParams({ from: fromISO, to: toISO });
      const resp = await fetch(API_BASE + '/api/analytics/series?' + q.toString(), { headers: hdrs });
      return resp.json();
    }

    const [curSerieResp, prevSerieResp] = await Promise.all([fetchSeries(fromDate.toISOString(), toDate.toISOString()), fetchSeries(prevFrom.toISOString(), prevTo.toISOString())]);
    if(!curSerieResp || !curSerieResp.success){ console.warn('No series current', curSerieResp); showError('Error cargando series: ' + JSON.stringify(curSerieResp)); }
    // Aggregate by day
    function aggregateDaily(pedidos){
      const map = new Map();
      for(const p of (pedidos||[])){
        if(!(String(p.estado).toLowerCase()==='pagado' || String(p.status).toLowerCase()==='pagado')) continue;
        const d = new Date(p.created_at);
        const key = d.toISOString().slice(0,10); // YYYY-MM-DD
        const val = Number(p.total_clp ?? p.total ?? 0) || 0;
        map.set(key, (map.get(key)||0) + val);
      }
      return map; // date->value
    }

    const curMap = aggregateDaily(curSerieResp.pedidos || []);
    const prevMap = aggregateDaily(prevSerieResp.pedidos || []);

    // Build labels for current period (each day)
    const labels = [];
    const valuesCur = [];
    const valuesPrev = [];
    const dt = new Date(fromDate.getTime());
    while(dt <= toDate){
      const key = dt.toISOString().slice(0,10);
      labels.push(key);
      valuesCur.push(Math.round(curMap.get(key) || 0));
      // map prev date: previous period aligns earlier; compute corresponding prev date
      const delta = dt.getTime() - fromDate.getTime();
      const prevDate = new Date(prevFrom.getTime() + delta);
      const pkey = prevDate.toISOString().slice(0,10);
      valuesPrev.push(Math.round(prevMap.get(pkey) || 0));
      dt.setDate(dt.getDate()+1);
    }

    // Render Chart.js
    try{
      const ctx = document.getElementById('salesChart').getContext('2d');
      if(window._salesChart) window._salesChart.destroy();
      window._salesChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Período actual', data: valuesCur, borderColor: '#1f77b4', backgroundColor: 'rgba(31,119,180,0.08)', tension:0.3 },
            { label: 'Período anterior', data: valuesPrev, borderColor: '#ff7f0e', backgroundColor: 'rgba(255,127,14,0.06)', tension:0.3 }
          ]
        },
        options: { responsive:true, plugins:{legend:{position:'top'}} }
      });
    }catch(e){ console.error('chart error', e); }

    // Summary comparison: total current vs previous
    const totalCur = valuesCur.reduce((s,x)=>s+x,0);
    const totalPrev = valuesPrev.reduce((s,x)=>s+x,0);
    const pct = totalPrev === 0 ? null : Math.round(((totalCur - totalPrev) / totalPrev) * 100);
    const compEl = document.getElementById('comparisonSummary');
    compEl.innerHTML = `<div style="font-weight:700">Período actual: ${fmtCLP(totalCur)}</div><div>Período anterior equivalente: ${fmtCLP(totalPrev)} ${pct===null? '(sin dato previo)': `(${pct>0?'+':''}${pct}% )`}</div>`;

    // Cargar pagos anteriores (detallados)
    try{
      const q2 = new URLSearchParams({ from: fromDate.toISOString(), to: toDate.toISOString() });
      const respOrders = await fetch(API_BASE + '/api/analytics/orders?' + q2.toString(), { headers: hdrs });
      if(!respOrders.ok){ const t = await respOrders.text().catch(()=>'<no body>'); showError(`Orders fetch failed: ${respOrders.status} ${respOrders.statusText} - ${t}`); document.getElementById('previousPayments').innerHTML = '<p style="color:#666">No se pudieron cargar los pagos.</p>'; }
      else {
        const ordersJson = await respOrders.json();
        if(ordersJson && ordersJson.success){ renderPayments('previousPayments', ordersJson.pedidos || []); }
        else { console.warn('No orders response', ordersJson); document.getElementById('previousPayments').innerHTML = '<p style="color:#666">No se pudieron cargar los pagos.</p>'; }
      }
    } catch(e){ console.warn('Error cargando pedidos', e); document.getElementById('previousPayments').innerHTML = '<p style="color:#666">Error cargando pagos</p>'; showError('Error cargando pedidos: ' + (e?.message || e)); }

  }catch(e){ console.error(e); alert('Error en la petición'); }
});

// Guardar admin key desde input
document.getElementById('saveAdminKey').addEventListener('click', ()=>{
  const v = document.getElementById('adminKeyInput').value || '';
  if(!v) return alert('Ingresa una ADMIN_KEY');
  try { sessionStorage.setItem('ADMIN_KEY', v); } catch(e){}
  // Clear input immediately to avoid showing the key
  try { document.getElementById('adminKeyInput').value = ''; } catch(e){}
  const status = document.getElementById('adminKeyStatus');
  status.textContent = 'guardada (oculta)';
  setTimeout(()=> status.textContent = '', 3000);
});

// Mostrar estado si ya había key
document.addEventListener('DOMContentLoaded', ()=>{
  const existing = sessionStorage.getItem('ADMIN_KEY');
  if(existing){
    const s = document.getElementById('adminKeyStatus');
    if(s) s.textContent = 'clave cargada desde sessionStorage (oculta)';
  }
});

// Auto-load today
document.addEventListener('DOMContentLoaded', ()=> document.getElementById('btnReload').click());
