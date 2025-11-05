(function ($, $$, money) {
  "use strict";

/* ==================== RUT utils ==================== */
function cleanRut(rut){ return String(rut||'').replace(/[^0-9kK]/g,'').toUpperCase(); }
function formatRUT(rut){
  rut = cleanRut(rut);
  if(rut.length < 2) return rut;
  let body = rut.slice(0,-1), dv = rut.slice(-1), out='';
  while(body.length > 3){ out='.'+body.slice(-3)+out; body=body.slice(0,-3); }
  out = body + out;
  return out + '-' + dv;
}
function computeDV(body){
  let sum=0, m=2;
  for(let i=body.length-1;i>=0;i--){ sum+=parseInt(body[i])*m; m = (m===7?2:m+1); }
  const r = 11-(sum%11);
  return r===11 ? '0' : r===10 ? 'K' : String(r);
}
function validateRUT(rut){
  rut = cleanRut(rut);
  if(rut.length<2) return false;
  const body = rut.slice(0,-1), dv = rut.slice(-1);
  return computeDV(body) === dv;
}

/* ==================== Carrito (localStorage) ==================== */
let cart = [];
try { cart = JSON.parse(localStorage.getItem('cart')||'[]'); } catch { cart = []; }
function save(){ localStorage.setItem('cart', JSON.stringify(cart)); }
function badge(){
  const el = $('#cartCount');
  if(!el) return;
  el.textContent = cart.reduce((a,i)=>a + (i.qty||0), 0);
}
function openCart(){
  $('#cartDrawer')?.classList.add('open');
  $('#overlay')?.classList.add('show');
  render();
}
function closeCart(){
  $('#cartDrawer')?.classList.remove('open');
  $('#overlay')?.classList.remove('show');
}
function add(id){
  // Validar que el ID existe
  if (!id) {
    console.error('ID de producto inválido');
    return;
  }
  
  // Verificar que el producto existe en PRODUCTS
  const prod = window.PRODUCTS?.find(x=>x.id===id);
  if (!prod) {
    console.error('Producto no encontrado:', id);
    if (typeof showToast === 'function') {
      showToast('Error: Producto no encontrado', 'error');
    }
    return;
  }
  
  let it = cart.find(x=>x.id===id);
  if(it) it.qty++;
  else cart.push({id, qty:1});
  save(); badge();
  
  // Animar botón del carrito
  if (typeof window.animateCartButton === 'function') {
    window.animateCartButton();
  }
  
  if (typeof showToast === 'function') {
    showToast(`¡${prod.name} agregado al carrito!`, 'success');
  }
  
  // GA4: add_to_cart
  try { if (window.gaEvent && prod) window.gaEvent('add_to_cart', { currency: 'CLP', value: prod.price || 0, items: [{ item_id: prod.id, item_name: prod.name, price: prod.price, quantity: 1 }] }); } catch {}
  openCart();
  render(id, prod?.name);
}
function qty(id,d){
  const i = cart.findIndex(x=>x.id===id);
  if(i<0) return;
  cart[i].qty += d;
  if(cart[i].qty<=0) cart.splice(i,1);
  save(); render(); badge();
}
function del(id){
  cart = cart.filter(x=>x.id!==id);
  save(); render(); badge();
}

/* ==================== Toast (ahora usa ui-components.js) ==================== */
// Esta función antigua queda como fallback si ui-components.js no se carga
/* function showToast(msg){
  const toast = $('#toast');
  if(!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'), 1800);
} */

/* ==================== Render carrito lateral ==================== */
function render(highlightId, addedName){
  const c = $('#cartItems');
  if(!c) return;
  c.innerHTML = '';
  let t = 0;

  const msgDiv = $('#cartAddedMsg');
  if(addedName && msgDiv){
    msgDiv.textContent = `Agregaste: ${addedName}`;
    msgDiv.classList.add('show');
    setTimeout(()=>msgDiv.classList.remove('show'), 1800);
  }

  if(cart.length===0){
    c.innerHTML = '<p style="text-align:center;color:#999;padding:40px 20px;font-size:1rem;">🛒 Tu carrito está vacío<br><span style="font-size:0.85rem;margin-top:8px;display:block;">Agrega productos desde el catálogo</span></p>';
  } else {
    cart.forEach(it=>{
      // Buscar producto por originalId si existe (productos con variantes), sino por id normal
      const productId = it.originalId || it.id;
      const p = window.PRODUCTS?.find(x=>x.id===productId);
      if(!p) return;
      
      // Usar precio de la variante si existe, sino el precio del producto
      const itemPrice = it.price || p.price;
      const sub = itemPrice * it.qty;
      t += sub;
      
      // Nombre con variante si existe
      const displayName = it.variant ? `${p.name} (${it.variant})` : p.name;
      
      const e = document.createElement('div');
      e.className = 'cart-item';
      if(highlightId && it.id===highlightId){
        e.classList.add('highlight');
        setTimeout(()=>e.classList.remove('highlight'),1200);
      }
      e.innerHTML = `
        <img src="${p.img}" alt="">
        <div>
          <div>${displayName}</div>
          ${it.customNote ? `<div style="font-size:.8rem;color:#555;margin-top:2px">Personalización: ${it.customNote.replace(/</g,'&lt;')}</div>` : ''}
          <div>${money(itemPrice)} c/u</div>
          <div class="qty">
            <button>-</button><input type="number" min="1" value="${it.qty}" style="width:45px;text-align:center;border:1px solid #ddd;border-radius:4px;padding:4px;margin:0 4px;"><button>+</button>
            <button style="margin-left:6px">🗑️</button>
          </div>
        </div>
        <strong>${money(sub)}</strong>`;
      // Botones: [0] menos, [1] más, [2] borrar
      const btns = e.querySelectorAll('.qty button');
      const qtyInput = e.querySelector('.qty input');
      const bm = btns[0];
      const bp = btns[1];
      const bd = btns[2];
      if (bm) bm.onclick = () => qty(it.id, -1);
      if (bp) bp.onclick = () => qty(it.id, 1);
      if (bd) bd.onclick = () => del(it.id);
      if (qtyInput) {
        qtyInput.onchange = () => {
          const newQty = parseInt(qtyInput.value);
          if (newQty > 0) {
            const cartItem = cart.find(x => x.id === it.id);
            if (cartItem) {
              cartItem.qty = newQty;
              save();
              render();
              badge();
            }
          } else {
            qtyInput.value = it.qty;
          }
        };
        qtyInput.onkeypress = (e) => {
          if (e.key === 'Enter') {
            qtyInput.blur();
          }
        };
      }
      c.appendChild(e);
    });
  }
  const totalEl = $('#cartTotal');
  if(totalEl) totalEl.textContent = money(t);
}

/* ==================== Búsqueda con sugerencias ==================== */
function showSearchSuggestions(text) {
  const sugDiv = document.getElementById('searchSuggestions');
  if (!sugDiv) return;
  
  if (!window.PRODUCTS || !Array.isArray(window.PRODUCTS)) return;
  
  const txt = (text||'').trim().toLowerCase();
  if (!txt) {
    sugDiv.innerHTML = '';
    sugDiv.style.display = 'none';
    return;
  }
  
  const matches = window.PRODUCTS.filter(p => p.name.toLowerCase().includes(txt));
  if (matches.length === 0) {
    sugDiv.innerHTML = '<div style="color:#888">No se encontraron productos</div>';
    sugDiv.style.display = 'block';
    return;
  }
  sugDiv.innerHTML = matches.map(p => `<div data-id="${p.id}">${p.name}</div>`).join('');
  sugDiv.style.display = 'block';
  Array.from(sugDiv.children).forEach(div => {
    div.onclick = () => {
      const productId = div.dataset.id;
      // Redirigir a la página del producto
      window.location.href = `producto.html?id=${productId}`;
      sugDiv.innerHTML = '';
      sugDiv.style.display = 'none';
    };
  });
}

/* ==================== Fallback de productos ==================== */
// Campos extra: category, dateAdded (YYYY-MM-DD), discount (% entero)
// Productos por defecto (se pueden sobreescribir por localStorage o Firebase)
// Productos por defecto (se pueden sobreescribir por localStorage)
// IMPORTANTE: Si existe una versión en localStorage, usarla temporalmente
window.PRODUCTS = window.PRODUCTS || [
  {id:'f1',  name:'Calendario Formula 1', price:12990, img:'img/calendario-f1.png', stars:5, reviews:3, stock:'disponible', category:'Calendarios',    dateAdded:'2025-08-25', discount:0},
  {id:'bey', name:'Caja Beyblade',        price:12990, img:'img/caja-beyblade.png',stars:5, reviews:5, stock:'disponible', category:'Cajas',          dateAdded:'2025-09-05', discount:0},
  {id:'pet', name:'Figura Mascota',       price:24990, img:'img/mascota.png',      stars:5, reviews:2, stock:'disponible', category:'Figuras',        dateAdded:'2025-09-10', discount:0},
  {id:'poke',name:'Pokebola',             price: 6990, img:'img/pokebola.png',     stars:5, reviews:2, stock:'bajo',        category:'Coleccionables', dateAdded:'2025-07-30', discount:0},
  {id:'key', name:'Llavero',              price: 4990, img:'img/llavero.png',      stars:5, reviews:1, stock:'disponible',  category:'Accesorios',     dateAdded:'2025-09-12', discount:15},
];

// IMPORTANTE: Si existe una versión en localStorage Y NO se ha cargado desde Firebase,
// usarla temporalmente (Firebase la sobrescribirá cuando cargue)
try {
  const ls = localStorage.getItem('PRODUCTS');
  if (ls) {
    const parsed = JSON.parse(ls);
    if (Array.isArray(parsed) && parsed.length) {
      // Normalizar campos mínimos para el catálogo
      window.PRODUCTS = parsed.map(p => ({
        id: p.id || ('p' + Date.now()),
        name: p.name || 'Producto',
        price: Number(p.price) || 0,
        img: p.img || 'img/placeholder.png',
        stars: Number(p.stars ?? 5),
        reviews: Number(p.reviews ?? 0),
        stock: p.stock || 'disponible',
        category: p.category || 'Otros',
        dateAdded: p.dateAdded || new Date().toISOString().slice(0,10),
          discount: Number(p.discount ?? 0),
          // Mantener galería si existe (array o string JSON)
          gallery: (typeof p.gallery !== 'undefined') ? p.gallery : undefined
      }));
    }
  }
} catch {}

/* ==================== Catálogo ==================== */
let currentCategory = 'all';
let currentSort = 'rating-desc';
let viewMode = 'grid';
let priceMin = null, priceMax = null, stockFilter = 'all';

// Devuelve [imgPrincipal, ...galeria] como array plano y limpio
function getGalleryImages(product){
  if(!product) return [];
  const base = product.img ? [String(product.img)] : [];
  let extras = [];
  if(product.gallery){
    if(Array.isArray(product.gallery)){
      extras = product.gallery;
    } else if(typeof product.gallery === 'string'){
      try { const parsed = JSON.parse(product.gallery); if(Array.isArray(parsed)) extras = parsed; } catch{}
    }
  }
  const all = base.concat(extras || []);
  // limpiar vacíos y duplicados conservando orden
  const seen = new Set();
  const cleaned = [];
  all.forEach(u=>{ const url=(u||'').trim(); if(url && !seen.has(url)){ seen.add(url); cleaned.push(url);} });
  return cleaned;
}

// Adjunta rotación de imágenes en hover
function attachHoverCarousel(imgEl, product){
  try{
    const imgs = getGalleryImages(product);
    if(!imgEl || !imgs || imgs.length <= 1) return; // nada que rotar
    let idx = 0; let timer = null; const original = imgEl.src;
    const start = ()=>{
      stop();
      timer = setInterval(()=>{
        idx = (idx + 1) % imgs.length;
        imgEl.src = imgs[idx];
      }, 1200);
    };
    const stop = ()=>{ if(timer){ clearInterval(timer); timer=null; imgEl.src = imgs[0] || original; idx = 0; } };
    imgEl.addEventListener('mouseenter', start);
    imgEl.addEventListener('mouseleave', stop);
    imgEl.addEventListener('touchstart', start, {passive:true});
    imgEl.addEventListener('touchend', stop, {passive:true});
  }catch(e){ /* silencioso */ }
}

function applySort(list){
  switch(currentSort){
    case 'price-asc':  return list.slice().sort((a,b)=>a.price-b.price);
    case 'price-desc': return list.slice().sort((a,b)=>b.price-a.price);
    case 'name-asc':   return list.slice().sort((a,b)=>a.name.localeCompare(b.name));
    case 'name-desc':  return list.slice().sort((a,b)=>b.name.localeCompare(a.name));
    case 'newest':     return list.slice().sort((a,b)=> new Date(b.dateAdded)-new Date(a.dateAdded));
    case 'rating-desc':
    default:           return list.slice().sort((a,b)=>b.stars-a.stars);
  }
}

// buildCategoryChips - YA NO SE USA, reemplazado por category-dropdown.js
// function buildCategoryChips(){
//   const cont = document.getElementById('categoryChips');
//   if(!cont) return;
//   if (!window.PRODUCTS || !Array.isArray(window.PRODUCTS)) {
//     console.warn('PRODUCTS no disponible para categorías');
//     return;
//   }
//   const cats = ['all', ...Array.from(new Set(window.PRODUCTS.map(p=>p.category)))];
//   cont.innerHTML = cats.map(c=>`<span class="chip" data-cat="${c}">${c==='all'?'Todos':c}</span>`).join('');
//   cont.querySelectorAll('.chip').forEach(ch=>{
//     ch.onclick=()=>{
//       currentCategory = ch.dataset.cat;
//       cont.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
//       ch.classList.add('active');
//       renderCatalog($('#searchInput')?.value||'');
//     };
//   });
//   cont.querySelector('.chip[data-cat="all"]')?.classList.add('active');
// }

function renderCatalog(filterText = ""){
  const grid = document.getElementById('catalogGrid') || document.querySelector('.catalog-grid') || document.querySelector('.grid.catalog-grid');
  if (!grid) return;
  
  // Verificar que PRODUCTS esté disponible
  if (!window.PRODUCTS || !Array.isArray(window.PRODUCTS) || window.PRODUCTS.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888">Cargando productos...</p>';
    return;
  }

  if(!renderCatalog._loading){
    // Usar skeleton loaders de ui-components.js si está disponible
    if(typeof showSkeletonLoaders === 'function') {
      showSkeletonLoaders('catalogGrid', 8);
    } else {
      // Fallback al código original
      grid.innerHTML = '';
      for(let i=0;i<5;i++){
        const sk=document.createElement('div');
        sk.className='skeleton-card';
        sk.innerHTML=`<div class="skeleton-img"></div><div class="skeleton-line long"></div><div class="skeleton-line med"></div><div class="skeleton-line short"></div>`;
        grid.appendChild(sk);
      }
    }
    renderCatalog._loading = true;
    setTimeout(()=>{renderCatalog(filterText)},250);
    return;
  }

  let productos = window.PRODUCTS.slice();

  if (filterText) {
    const txt = filterText.trim().toLowerCase();
    productos = productos.filter(p => p.name.toLowerCase().includes(txt));
  }
  
  // Filtrar por categoría (usar dropdown si existe, sino usar chips)
  let categoryToFilter = currentCategory;
  if (typeof window.getSelectedCategory === 'function') {
    categoryToFilter = window.getSelectedCategory();
  }
  
  if(categoryToFilter && categoryToFilter !== 'all') {
    productos = productos.filter(p => {
      if (!p.category) return false;
      const cats = p.category.split(',').map(c => c.trim());
      return cats.includes(categoryToFilter);
    });
  }
  
  productos = applySort(productos);
  
  if(stockFilter!=='all') productos = productos.filter(p=>p.stock===stockFilter);

  grid.innerHTML = "";
  const resultCount = document.getElementById('resultCount');
  if (productos.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888">No se encontraron productos</p>';
    if(resultCount) resultCount.textContent = '0 resultados';
    renderCatalog._loading = false;
    return;
  }
  if(resultCount) resultCount.textContent = productos.length + (productos.length===1?' producto':' productos');

  productos.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    const desc =
      p.name.includes('Calendario') ? 'Calendario 3D con circuitos' :
      p.name.includes('Beyblade')   ? 'Personalizable con tu nombre' :
      p.name.includes('Mascota')    ? 'Tu mascota en 3D' :
      p.name.includes('Pokebola')   ? 'Pokebola coleccionable' : 'Personalizado con tu logo';

    const energia = '<span class="label">Mision3D</span>';
    const stockTxt = p.stock === 'bajo' ? '<span class="stock">Stock bajo</span>' : '';

    const daysDiff = (Date.now() - new Date(p.dateAdded).getTime()) / (1000*60*60*24);
    let badges = '';
    if(daysDiff <= 21) badges += `<span class="badge new">Nuevo</span>`;
    if(p.discount && p.discount>0) badges += `<span class="badge discount">-${p.discount}%</span>`;

    const fullStars = Math.floor(p.stars);
    const halfStar = p.stars % 1 >= 0.5;
    let starsHtml = '<span class="stars">';
    for(let i=0;i<fullStars;i++) starsHtml += '★';
    if(halfStar) starsHtml += '☆';
    starsHtml += '</span>';
    const reviews = `<span class="reviews">${p.reviews} Reseña${p.reviews>1?'s':''}</span>`;

    const priceOriginal = p.discount? `<span style="text-decoration:line-through;color:#888;font-size:.8rem;margin-right:6px">${money(p.price)}</span>`:'';
    const finalPrice = p.discount? Math.round(p.price*(1-p.discount/100)) : p.price;

    // Verificar si hay galería
    let galleryCount = 0;
    if(p.gallery) {
      if(Array.isArray(p.gallery)) {
        galleryCount = p.gallery.filter(url => url && url.trim() !== '').length;
      } else if(typeof p.gallery === 'string') {
        try {
          const parsed = JSON.parse(p.gallery);
          galleryCount = Array.isArray(parsed) ? parsed.filter(url => url && url.trim() !== '').length : 0;
        } catch(e) {
          galleryCount = 0;
        }
      }
    }
    const galleryIndicator = galleryCount > 0 ? `<div class="gallery-indicator" title="${galleryCount + 1} fotos">📸 ${galleryCount + 1}</div>` : '';

    if(viewMode==='list'){
      card.innerHTML = `
        <img src="${p.img}" loading="lazy" data-link>
        <div class="badge-wrap">${badges}${galleryIndicator}</div>
        <div class="name" style="font-size:1.15rem;font-weight:600">${p.name}</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <div class="price" style="margin:0">${priceOriginal}${money(finalPrice)}</div>
          <div class="desc" style="margin:0">${desc}</div>
          ${energia} ${stockTxt}
          <div>${starsHtml} <span style="color:#555">(${p.stars})</span> ${reviews}</div>
        </div>
        <div class="btns" style="justify-content:flex-end">
          <button class="btn-options add" data-id="${p.id}">Agregar</button>
          <button class="btn-options" data-view id="view-${p.id}">Ver</button>
        </div>`;
    } else {
      card.innerHTML = `
        <img src="${p.img}" loading="lazy" data-link>
        <div class="badge-wrap">${badges}${galleryIndicator}</div>
        <div class="price">${priceOriginal}${money(finalPrice)}</div>
        <div class="name" data-link>${p.name}</div>
        <div class="desc">${desc}</div>
        ${energia}
        ${stockTxt}
        ${starsHtml} <span style="color:#555">(${p.stars})</span>
        ${reviews}
        <div class="btns">
          <button class="btn-quick" data-view>Ver</button>
          <button class="btn-options add" data-id="${p.id}">Elegir opciones</button>
        </div>`;
    }

    grid.appendChild(card);
    card.querySelectorAll('[data-link],[data-view]').forEach(el=>{
      el.style.cursor='pointer';
      el.addEventListener('click', ()=>{
        if(el.classList.contains('add')) return;
        window.location.href = `producto.html?id=${p.id}`;
      });
    });
    // Adjuntar carrusel en hover a la imagen principal de la card
    const imgEl = card.querySelector('img');
    attachHoverCarousel(imgEl, p);
  });

  $$('.add').forEach(b=>b.onclick=()=>add(b.dataset.id));
  renderCatalog._loading = false;
}

/* ==================== Regiones y comunas ==================== */
const REGIONES_COMUNAS = {
  "Arica y Parinacota": ["Arica","Camarones","Putre","General Lagos"],
  "Tarapacá": ["Iquique","Alto Hospicio","Pozo Almonte","Camiña","Colchane","Huara","Pica"],
  "Antofagasta": ["Antofagasta","Mejillones","Sierra Gorda","Taltal","Calama","Ollagüe","San Pedro de Atacama","Tocopilla","María Elena"],
  "Atacama": ["Copiapó","Caldera","Tierra Amarilla","Chañaral","Diego de Almagro","Vallenar","Alto del Carmen","Freirina","Huasco"],
  "Coquimbo": ["La Serena","Coquimbo","Andacollo","La Higuera","Paiguano","Vicuña","Illapel","Canela","Los Vilos","Salamanca","Ovalle","Combarbalá","Monte Patria","Punitaqui","Río Hurtado"],
  "Valparaíso": ["Valparaíso","Casablanca","Concón","Juan Fernández","Puchuncaví","Quintero","Viña del Mar","Isla de Pascua","Los Andes","Calle Larga","Rinconada","San Esteban","La Ligua","Cabildo","Papudo","Petorca","Zapallar","Quillota","La Calera","La Cruz","Nogales","San Antonio","Algarrobo","Cartagena","El Quisco","El Tabo","Santo Domingo","San Felipe","Catemu","Llaillay","Panquehue","Putaendo","Santa María"],
  "Metropolitana de Santiago": ["Cerrillos","Cerro Navia","Conchalí","El Bosque","Estación Central","Huechuraba","Independencia","La Cisterna","La Florida","La Granja","La Pintana","La Reina","Las Condes","Lo Barnechea","Lo Espejo","Lo Prado","Macul","Maipú","Ñuñoa","Pedro Aguirre Cerda","Peñalolén","Providencia","Pudahuel","Quilicura","Quinta Normal","Recoleta","Renca","San Joaquín","San Miguel","San Ramón","Vitacura","Puente Alto","Pirque","San José de Maipo","Colina","Lampa","Tiltil","San Bernardo","Buin","Calera de Tango","Paine","Melipilla","Alhué","Curacaví","María Pinto","San Pedro","Talagante","El Monte","Isla de Maipo","Padre Hurtado","Peñaflor"],
  "O'Higgins": ["Rancagua","Codegua","Coinco","Coltauco","Doñihue","Graneros","Las Cabras","Machalí","Malloa","Mostazal","Olivar","Peumo","Pichidegua","Quinta de Tilcoco","Rengo","Requínoa","San Vicente","Pichilemu","La Estrella","Litueche","Marchihue","Navidad","Paredones","San Fernando","Chépica","Chimbarongo","Lolol","Nancagua","Palmilla","Peralillo","Placilla","Pumanque","Santa Cruz"],
  "Maule": ["Talca","Constitución","Curepto","Empedrado","Maule","Pelarco","Pencahue","Río Claro","San Clemente","San Rafael","Cauquenes","Chanco","Pelluhue","Curicó","Hualañé","Licantén","Molina","Rauco","Romeral","Sagrada Familia","Teno","Vichuquén","Linares","Colbún","Longaví","Parral","Retiro","San Javier","Villa Alegre","Yerbas Buenas"],
  "Ñuble": ["Chillán","Bulnes","Cobquecura","Coelemu","Coihueco","El Carmen","Ninhue","Ñiquén","Pemuco","Pinto","Quillón","Quirihue","Ránquil","San Carlos","San Fabián","San Ignacio","San Nicolás","Treguaco","Yungay"],
  "Biobío": ["Concepción","Coronel","Chiguayante","Florida","Hualqui","Lota","Penco","San Pedro de la Paz","Santa Juana","Talcahuano","Tomé","Hualpén","Lebu","Arauco","Cañete","Contulmo","Curanilahue","Los Álamos","Tirúa","Los Ángeles","Antuco","Cabrero","Laja","Mulchén","Nacimiento","Negrete","Quilaco","Quilleco","San Rosendo","Santa Bárbara","Tucapel","Yumbel","Alto Biobío"],
  "La Araucanía": ["Temuco","Carahue","Cunco","Curarrehue","Freire","Galvarino","Gorbea","Lautaro","Loncoche","Melipeuco","Nueva Imperial","Padre Las Casas","Perquenco","Pitrufquén","Pucón","Saavedra","Teodoro Schmidt","Toltén","Vilcún","Villarrica","Cholchol","Angol","Collipulli","Ercilla","Lonquimay","Los Sauces","Purén","Renaico","Traiguén","Victoria"],
  "Los Ríos": ["Valdivia","Corral","Lanco","Los Lagos","Máfil","Mariquina","Paillaco","Panguipulli","La Unión","Futrono","Lago Ranco","Río Bueno"],
  "Los Lagos": ["Puerto Montt","Calbuco","Cochamó","Fresia","Frutillar","Los Muermos","Llanquihue","Maullín","Puerto Varas","Castro","Ancud","Chonchi","Curaco de Vélez","Dalcahue","Puqueldón","Queilén","Quellón","Quemchi","Quinchao","Osorno","Puerto Octay","Purranque","Puyehue","Río Negro","San Juan de la Costa","San Pablo"],
  "Aysén": ["Coyhaique","Lago Verde","Aysén","Cisnes","Guaitecas","Río Ibáñez","Chile Chico","Cochrane","O'Higgins","Tortel"],
  "Magallanes": ["Punta Arenas","Laguna Blanca","Río Verde","San Gregorio","Cabo de Hornos","Antártica","Porvenir","Primavera","Timaukel","Natales","Torres del Paine"],
};
function fillRegionesComunas(){
  const regionSel = $('#inputRegion');
  const comunaSel = $('#inputComuna');
  if(!regionSel || !comunaSel) return;
  regionSel.innerHTML = '<option value="">Selecciona región</option>';
  comunaSel.innerHTML = '<option value="">Selecciona comuna</option>';
  Object.keys(REGIONES_COMUNAS).forEach(region=>{
    const opt = document.createElement('option');
    opt.value = region; opt.textContent = region;
    regionSel.appendChild(opt);
  });
  regionSel.onchange = function(){
    const comunas = REGIONES_COMUNAS[this.value] || [];
    comunaSel.innerHTML = '<option value="">Selecciona comuna</option>';
    comunas.forEach(comuna=>{
      const opt = document.createElement('option');
      opt.value = comuna; opt.textContent = comuna;
      comunaSel.appendChild(opt);
    });
  };
}

/* ==================== Reseñas (demo) ==================== */
const REVIEWS = [
  {name:'Fer',     img:'img/mascota.png',      text:'Hermoso',                         stars:5},
  {name:'Valeska', img:'img/impresion.png',    text:'Llegó bien\nSúper bonito',        stars:5},
  {name:'Cholito', img:'img/llavero.png',      text:'A cholito lo recordaré por siempre', stars:5},
  {name:'Sofía',   img:'img/pokebola.png',     text:'😍 😍 😍 amé',                     stars:5},
  {name:'Antonia', img:'img/caja-beyblade.png',text:'Muy lindo 😍',                    stars:5},
  {name:'Teresa',  img:'img/calendario-f1.png',text:'❤',                               stars:5},
];
function renderReviews(){
  const track = document.getElementById('reviewsTrack');
  if(!track) return;
  track.innerHTML='';
  for(let i=0;i<4;i++){
    const sk=document.createElement('div');
    sk.className='skeleton-review';
    sk.innerHTML='<div class="ph-img"></div><div class="ph-line" style="width:60%"></div><div class="ph-line" style="width:40%"></div><div class="ph-line" style="width:70%"></div>';
    track.appendChild(sk);
  }
  setTimeout(()=>{
    track.innerHTML='';
    REVIEWS.forEach(r=>{
      const card=document.createElement('div');
      card.className='review-card';
      const stars='★'.repeat(r.stars);
      card.innerHTML=`<img src="${r.img}" alt="${r.name}"><div class="review-body"><div class="review-name">${r.name}</div><div class="review-stars">${stars}</div><div class="review-text">${r.text.replace(/\n/g,'<br>')}</div></div>`;
      track.appendChild(card);
    });
    initReviewsCarousel();
  },300);
}
function initReviewsCarousel(){
  const track = document.getElementById('reviewsTrack');
  const prev  = document.getElementById('reviewsPrev');
  const next  = document.getElementById('reviewsNext');
  if(!track||!prev||!next) return;
  let index=0;
  const cards=[...track.children];
  function cardWidth(){ return cards[0].offsetWidth+20; }
  const visible = ()=>{ const vp=track.parentElement.offsetWidth; return Math.floor(vp/cardWidth())||1; };
  function maxIndex(){ return Math.max(0, cards.length - visible()); }
  function update(){
    const max = maxIndex();
    if(index>max) index=0;
    if(index<0)   index=max;
    track.style.transform = `translateX(${-index*cardWidth()}px)`;
    prev.disabled=false; next.disabled=false;
  }
  prev.onclick=()=>{ index--; update(); };
  next.onclick=()=>{ index++; update(); };
  window.addEventListener('resize', update);
  update();
  let timer=null;
  function start(){ stop(); timer=setInterval(()=>{ index++; update(); }, 4000); }
  function stop(){ if(timer){ clearInterval(timer); timer=null; } }
  track.parentElement.addEventListener('mouseenter',stop);
  track.parentElement.addEventListener('mouseleave',start);
  start();
}

/* ==================== Pago ==================== */
// Base de API
// - Producción: same-origin ('')
// - Local: si abrimos el frontend con Live Server (p.ej. 127.0.0.1:5500), enviar al backend en :3001
//          si el backend sirve también el frontend (p.ej. :3000 o :3001), usar same-origin ('')
const API_BASE = (function(){
  if (window.API_BASE_URL) return window.API_BASE_URL.replace(/\/$/, '');
  const isLocalHost = /localhost|127\.0\.0\.1/.test(location.hostname);
  if (isLocalHost) {
    const backendPorts = new Set(['3000','3001']);
    // Si estamos en el mismo puerto del backend, usamos same-origin
    if (backendPorts.has(String(location.port || ''))) return '';
    // Si estamos en otro puerto (p.ej. Live Server 5500), apuntar al backend local por defecto
    // Preferimos 3001 (puerto actual del backend)
    return 'http://localhost:3001';
  }
  // Producción: same-origin
  return '';
})();

async function iniciarPago(payMethod, payload) {
  if (payMethod === 'flow') {
    const res = await fetch(`${API_BASE}/api/payments/flow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text().catch(()=> '');
      if (typeof showToast === 'function') {
        showToast(`Error HTTP ${res.status}: ${errText.slice(0,200)}`, 'error');
      }
      throw new Error(`Error HTTP ${res.status}: ${errText.slice(0,200)}`);
    }
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url; // redirige a Flow
      return;
    } else {
      if (typeof showToast === 'function') {
        showToast(data.error || "Error creando pago en Flow", 'error');
      }
      throw new Error(data.error || "Error creando pago en Flow");
    }
  } else if (payMethod === 'mercadopago') {
    if (typeof showToast === 'function') {
      showToast("MercadoPago todavía no está conectado en este flujo 🚧", 'error');
    } else {
      alert("MercadoPago todavía no está conectado en este flujo 🚧");
    }
  } else if (payMethod === 'webpay') {
    const res = await fetch(`${API_BASE}/api/payments/webpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text().catch(()=> '');
      if (typeof showToast === 'function') {
        showToast(`Error HTTP ${res.status}: ${errText.slice(0,200)}`, 'error');
      }
      throw new Error(`Error HTTP ${res.status}: ${errText.slice(0,200)}`);
    }
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return;
    } else {
      if (typeof showToast === 'function') {
        showToast(data.error || 'Error creando pago en Webpay', 'error');
      }
      throw new Error(data.error || 'Error creando pago en Webpay');
    }
  } else if (payMethod === 'khipu') {
    const res = await fetch(`${API_BASE}/api/payments/khipu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text().catch(()=> '');
      if (typeof showToast === 'function') {
        showToast(`Error HTTP ${res.status}: ${errText.slice(0,200)}`, 'error');
      }
      throw new Error(`Error HTTP ${res.status}: ${errText.slice(0,200)}`);
    }
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return;
    } else {
      throw new Error(data.error || 'Error creando pago en Khipu');
    }
  } else if (payMethod === 'transferencia' || payMethod === 'manual') {
    // Generar número de pedido aleatorio (8 dígitos)
    const orderNumber = Math.floor(10000000 + Math.random() * 90000000);
    
    // Guardar información del pedido en localStorage
    const orderData = {
      orderNumber,
      date: new Date().toISOString(),
      payload,
      status: 'pending_transfer'
    };
    localStorage.setItem(`order_${orderNumber}`, JSON.stringify(orderData));
    
    // Limpiar carrito
    cart = [];
    save();
    
    // Redirigir a página de confirmación con número de pedido
    window.location.href = `confirmacion-transferencia.html?order=${orderNumber}`;
  } else {
    alert("Selecciona un método de pago válido.");
  }
}

/* ==================== Confirmar checkout ==================== */
async function confirmCheckout(){
  const name      = $('#inputName')?.value.trim() || '';
  const apellido  = $('#inputApellido')?.value.trim() || '';
  const rut       = $('#inputRut')?.value.trim() || '';
  const direccion = $('#inputDireccion')?.value.trim() || '';
  const notes     = $('#inputNotes')?.value.trim() || '';
  const postal    = $('#inputPostal')?.value.trim() || '';
  const region    = $('#inputRegion')?.value || '';
  const comuna    = $('#inputComuna')?.value || '';
  const telefono  = $('#inputTelefono')?.value.trim() || '';
  const email     = $('#inputEmail')?.value || '';
  const envio     = (
    document.querySelector('input[name="shipMethod"]:checked')?.value ||
    $('#inputEnvio')?.value || ''
  );
  const payMethod = document.querySelector('input[name="payMethod"]:checked')?.value || 'flow';

  if(!name || !apellido || !rut || !direccion || !region || !comuna || !telefono || !envio){
    alert('Completa todos los campos obligatorios');
    return;
  }
  if(!validateRUT(rut)){
    alert('RUT inválido');
    return;
  }
  
  // Validar envío a Santiago
  if((envio === 'domicilio' || envio === 'santiago') && region !== 'Metropolitana de Santiago'){
    alert('El envío a domicilio solo está disponible para comunas de Santiago');
    return;
  }

  const total = cart.reduce((a, it) => {
    const p = window.PRODUCTS?.find(x => x.id === it.id);
    return a + (p ? p.price * it.qty : 0);
  }, 0);
  
  // Calcular costo de envío basado en el método seleccionado
  let costoEnvio = 0;
  if (region === 'Metropolitana de Santiago' && (envio === 'domicilio' || envio === 'santiago')) {
    costoEnvio = 2990;
  }
  // Si es 'porpagar' o 'retiro', el costo es 0 (se paga aparte)
  
  const totalFinal = total + costoEnvio;

  // Validación: Flow requiere mínimo $350 CLP
  if (payMethod === 'flow' && totalFinal < 350) {
    if (typeof showToast === 'function') {
      showToast('El monto mínimo para pagar con Flow es $350 CLP', 'error');
    } else {
      alert('El monto mínimo para pagar con Flow es $350 CLP. Agrega más productos o elige otro método de pago.');
    }
    return;
  }

  // Validación: carrito vacío o total = 0
  if (cart.length === 0 || totalFinal <= 0) {
    if (typeof showToast === 'function') {
      showToast('Tu carrito está vacío o el total es $0. Agrega productos antes de continuar.', 'warning');
    } else {
      alert('Tu carrito está vacío o el total es $0');
    }
    return;
  }

  const cartItems = cart.map(it=>{
    const p = window.PRODUCTS?.find(x=>x.id===it.id) || {};
    return { id: p.id || it.id, name: p.name || '', price: p.price || 0, qty: it.qty };
  });

  const payload = {
    items: cartItems,
    payer: { name, surname: apellido, email, rut },
    shippingCost: costoEnvio,
    discount: 0,
    meta: { region, comuna, telefono, direccion, notes, postal, envio, totalCLP: totalFinal }
  };

  try {
    // GA4: begin_checkout
    try { if (window.gaEvent) window.gaEvent('begin_checkout', { currency: 'CLP', value: totalFinal, items: cartItems.map(i=>({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.qty })) }); } catch {}
    await iniciarPago(payMethod, payload);
  } catch (err) {
    console.error('Error iniciando pago:', err);
    if (typeof showToast === 'function') {
      showToast('No se pudo iniciar el pago: ' + (err?.message || err), 'error');
    } else {
      alert('No se pudo iniciar el pago: ' + (err?.message || err));
    }
  } finally {
    const modal = $('#checkoutModal');
    if (modal) modal.classList.remove('show');
  }
}

/* ==================== DOM Ready ==================== */
document.addEventListener('DOMContentLoaded', ()=>{
  badge();
  $$('.add').forEach(b=>b.onclick=()=>add(b.dataset.id));
  $('#openCart')?.addEventListener('click', openCart);
  $('#closeCart')?.addEventListener('click', closeCart);
  $('#overlay')?.addEventListener('click', closeCart);
  $('#checkout')?.addEventListener('click', ()=> {
    if(cart.length===0) {
      if (typeof showToast === 'function') {
        showToast('Tu carrito está vacío. Agrega productos antes de continuar.', 'warning');
      } else {
        alert('Tu carrito está vacío');
      }
    } else {
      window.location.href = 'checkout.html';
    }
  });
  $('#clearCart')?.addEventListener('click', ()=>{
    if(cart.length > 0) {
      cart=[]; 
      save(); 
      render(); 
      badge();
      if (typeof showToast === 'function') {
        showToast('Carrito vaciado', 'info');
      }
    }
  });

  // botón confirmar del modal clásico (si existiera)
  $('#confirmCheckout')?.addEventListener('click', confirmCheckout);
  $('#cancelCheckout')?.addEventListener('click', ()=>$('#checkoutModal')?.classList.remove('show'));

  render();               // carrito lateral
  renderCatalog();        // catálogo
  // buildCategoryChips();   // chips categorías - DESHABILITADO, usando dropdown
  renderReviews();        // reseñas

  // Filtros de precio deshabilitados
  // const priceMinInput = document.getElementById('priceMin');
  // const priceMaxInput = document.getElementById('priceMax');
  // [priceMinInput, priceMaxInput].forEach(inp=>{
  //   if(!inp) return;
  //   inp.addEventListener('input', ()=>{
  //     priceMin = priceMinInput?.value ? parseInt(priceMinInput.value) : null;
  //     priceMax = priceMaxInput?.value ? parseInt(priceMaxInput.value) : null;
  //     renderCatalog($('#searchInput')?.value||'');
  //   });
  // });
  
  // Selector de ordenamiento
  const sortSelect = document.getElementById('sortSelect');
  if(sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      console.log('🔄 Ordenamiento cambiado a:', currentSort);
      renderCatalog($('#searchInput')?.value||'');
    });
  }
  
  document.querySelectorAll('input[name="stockFilter"]').forEach(r=>{
    r.addEventListener('change', ()=>{
      const sel = document.querySelector('input[name="stockFilter"]:checked');
      stockFilter = sel ? sel.value : 'all';
      renderCatalog($('#searchInput')?.value||'');
    });
  });
  const viewGridBtn = document.getElementById('viewGrid');
  const viewListBtn = document.getElementById('viewList');
  if(viewGridBtn && viewListBtn){
    viewGridBtn.onclick = ()=>{ viewMode='grid'; viewGridBtn.classList.add('active'); viewListBtn.classList.remove('active'); document.getElementById('catalogGrid')?.classList.remove('list-mode'); renderCatalog($('#searchInput')?.value||''); };
    viewListBtn.onclick = ()=>{ viewMode='list'; viewListBtn.classList.add('active'); viewGridBtn.classList.remove('active'); document.getElementById('catalogGrid')?.classList.add('list-mode'); renderCatalog($('#searchInput')?.value||''); };
  }
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    // Detectar si estamos en index.html o catalogo.html
    const isIndexPage = window.location.pathname.includes('index.html') || window.location.pathname === '/';
    
    searchInput.addEventListener('input', e => {
      const searchText = e.target.value.trim();
      
      if (isIndexPage) {
        // En index.html, solo mostrar sugerencias
        showSearchSuggestions(searchText);
      } else {
        // En catalogo.html, filtrar productos
        renderCatalog(searchText);
        showSearchSuggestions(searchText);
      }
    });
    
    searchInput.addEventListener('blur', ()=>{
      setTimeout(()=>{
        const sugDiv = document.getElementById('searchSuggestions');
        if(sugDiv){ sugDiv.innerHTML = ''; sugDiv.style.display = 'none'; }
      },200);
    });
    
    searchInput.addEventListener('keydown', e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        const txt = searchInput.value.trim().toLowerCase();
        
        if (isIndexPage) {
          // En index.html, redirigir al catálogo con búsqueda
          if (txt) {
            window.location.href = `catalogo.html?search=${encodeURIComponent(txt)}`;
          } else {
            window.location.href = 'catalogo.html';
          }
        } else {
          // En catalogo.html, buscar y redirigir al producto o filtrar
          if (txt && window.PRODUCTS && window.PRODUCTS.length > 0) {
            const match = window.PRODUCTS.find(p => p.name.toLowerCase().includes(txt));
            if (match) {
              // Redirigir a la página del producto
              window.location.href = `producto.html?id=${match.id}`;
              return;
            }
          }
          
          // Si no hay coincidencias, solo filtrar el catálogo
          renderCatalog(searchInput.value);
          const sugDiv = document.getElementById('searchSuggestions');
          if(sugDiv){ sugDiv.innerHTML = ''; sugDiv.style.display='none'; }
        }
      }
    });
  }

  fillRegionesComunas();

  // Dark mode
  const toggle = document.getElementById('darkToggle');
  const savedTheme = localStorage.getItem('theme');
  if(savedTheme==='dark') document.body.classList.add('dark');
  if(toggle){
    toggle.onclick = ()=>{
      document.body.classList.toggle('dark');
      localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
      toggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
    };
    toggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  }

  // Sesión y menú de usuario
  const userArea = document.getElementById('userArea');
  function renderUser(){
    if(!userArea) return;
    let session=null; try{ session = JSON.parse(localStorage.getItem('userSession')||'null'); }catch{}
    if(session){
      const userName = (session.guest ? 'Invitado' : (session.name||'Mi cuenta')).toUpperCase();
      // Renderizar botón + dropdown
      userArea.innerHTML = `
        <div class="user-menu">
          <button class="header-icon-btn user-btn" id="userMenuBtn" aria-expanded="false" aria-haspopup="true">
            <span class="icon">👤</span>
            <span class="label">${userName}</span>
          </button>
          <div class="user-dropdown" id="userDropdown" role="menu" aria-hidden="true">
            <a href="mi-cuenta.html" class="user-dd-item" role="menuitem">Ir a Mi cuenta</a>
            <a href="editar-perfil.html" class="user-dd-item" role="menuitem">Editar mis detalles</a>
            <button class="user-dd-item logout" id="logoutBtn" role="menuitem">Cerrar sesión</button>
          </div>
        </div>`;

      // Prefill en checkout si corresponde
      if($('#inputName') && !$('#inputName').value) $('#inputName').value = (session.name?.split(' ')[0]||session.name||'');
      if($('#inputApellido') && !$('#inputApellido').value && (session.name||'').split(' ').length>1) $('#inputApellido').value = session.name.split(' ').slice(1).join(' ');
      if($('#inputEmail') && !$('#inputEmail').value && session.email) $('#inputEmail').value = session.email;

      // Listeners del dropdown
      const ddBtn = document.getElementById('userMenuBtn');
      const dd = document.getElementById('userDropdown');
      const favCountEl = document.getElementById('favCount');
      const logoutBtn = document.getElementById('logoutBtn');

      // Actualizar contador de favoritos
      try {
        const wl = JSON.parse(localStorage.getItem('wishlist')||'[]');
        if(favCountEl) favCountEl.textContent = wl.length;
      } catch {}

      function openClose(toggle){
        if(!dd) return;
        const open = typeof toggle === 'boolean' ? toggle : !dd.classList.contains('open');
        dd.classList.toggle('open', open);
        if(ddBtn) ddBtn.setAttribute('aria-expanded', String(open));
      }
      if(ddBtn){
        ddBtn.addEventListener('click', (e)=>{ e.stopPropagation(); openClose(); });
      }
      // Cerrar al hacer click fuera
      document.addEventListener('click', (e)=>{
        if(!dd) return;
        if(!dd.contains(e.target) && !ddBtn.contains(e.target)){
          dd.classList.remove('open');
          ddBtn.setAttribute('aria-expanded','false');
        }
      }, { once: true });

      // Logout
      if(logoutBtn){
        logoutBtn.addEventListener('click', ()=>{
          localStorage.removeItem('userSession');
          if(typeof showToast === 'function') showToast('Sesión cerrada', 'info');
          window.location.href = 'index.html';
        });
      }

    } else {
      userArea.innerHTML = `
        <a href="login.html" id="loginLink" class="header-icon-btn">
          <span class="icon">👤</span>
          <span class="label">ACCESO</span>
        </a>`;
    }
    if(localStorage.getItem('justLoggedIn')){
      if(typeof showToast === 'function') {
        showToast('Sesión iniciada');
      }
      localStorage.removeItem('justLoggedIn');
    }
  }
  renderUser();
  
  // Actualizar cuando la página gana foco (al volver de login)
  window.addEventListener('focus', renderUser);
  // También escuchar cambios en localStorage desde otras pestañas
  window.addEventListener('storage', (e) => {
    if (e.key === 'userSession' || e.key === 'justLoggedIn') {
      renderUser();
    }
  });
  renderUser();
  
  // Actualizar cuando la página gana foco (al volver de login)
  window.addEventListener('focus', renderUser);
  // También escuchar cambios en localStorage desde otras pestañas
  window.addEventListener('storage', (e) => {
    if (e.key === 'userSession' || e.key === 'justLoggedIn') {
      renderUser();
    }
  });
  
  // Listener para selector de categorías del header
  const headerCategorySelect = document.getElementById('headerCategorySelect');
  if (headerCategorySelect) {
    // Llenar opciones de categorías
    function fillHeaderCategories() {
      if (!window.PRODUCTS || window.PRODUCTS.length === 0) {
        console.log('⏳ Esperando productos para llenar selector de categorías...');
        setTimeout(fillHeaderCategories, 200);
        return;
      }
      
      console.log('📦 Productos disponibles:', window.PRODUCTS.length);
      
      const categoriesSet = new Set();
      window.PRODUCTS.forEach(product => {
        if (product.category) {
          const cats = product.category.split(',').map(c => c.trim());
          cats.forEach(cat => {
            if (cat) categoriesSet.add(cat);
          });
        }
      });
      
      const categories = Array.from(categoriesSet).sort();
      
      console.log('🏷️ Categorías encontradas:', categories);
      
      // Mantener la opción "Todas las categorías"
      headerCategorySelect.innerHTML = '<option value="all">Todas las categorías</option>';
      
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        headerCategorySelect.appendChild(option);
      });
      
      console.log('✅ Selector de categorías del header llenado');
    }
    
    // Intentar llenar inmediatamente
    fillHeaderCategories();
    
    // También escuchar el evento productsReady si existe
    document.addEventListener('productsReady', () => {
      console.log('📢 Evento productsReady detectado');
      fillHeaderCategories();
    });
    
    // Listener para cambios
    headerCategorySelect.addEventListener('change', (e) => {
      const selectedCategory = e.target.value;
      console.log('🔄 Categoría seleccionada:', selectedCategory);
      
      currentCategory = selectedCategory;
      
      // Si estamos en la página de catálogo, filtrar
      if (window.location.pathname.includes('catalogo.html') || document.getElementById('catalogGrid')) {
        renderCatalog($('#searchInput')?.value || '');
      } else {
        // Si estamos en index, redirigir al catálogo
        if (selectedCategory === 'all') {
          window.location.href = 'catalogo.html';
        } else {
          window.location.href = `catalogo.html?category=${encodeURIComponent(selectedCategory)}`;
        }
      }
    });
  }
});


  // Exponer variables y funciones globales para producto.html
  window.cart = cart;
  window.save = save;
  window.badge = badge;
  window.add = add;
  window.qty = qty;
  window.openCart = openCart;
  window.render = render;
  // Exponer confirmCheckout para uso desde checkout.html
  window.confirmCheckout = confirmCheckout;

})( // <- FIN del wrapper: inyectamos $, $$ y money sin redeclarar globales
  window.$ || (q => document.querySelector(q)),
  window.$$ || (q => document.querySelectorAll(q)),
  window.money || (v => Number(v || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }))
);
