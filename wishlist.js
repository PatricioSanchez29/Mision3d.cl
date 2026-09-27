/*
 * Sistema de Favoritos/Wishlist
 * Permite a los usuarios guardar productos para comprar después
 */

// Estado global de favoritos
let wishlist = [];

// Inicializar favoritos desde localStorage
function initWishlist() {
  try {
    wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    updateWishlistBadge();
  } catch (e) {
    console.error('Error cargando wishlist:', e);
    wishlist = [];
  }
}

// Guardar favoritos en localStorage
function saveWishlist() {
  try {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistBadge();
  } catch (e) {
    console.error('Error guardando wishlist:', e);
  }
}

// Agregar producto a favoritos
function addToWishlist(productId) {
  if (!wishlist.includes(productId)) {
    wishlist.push(productId);
    saveWishlist();
    
    // Animar botón de favoritos
    if (typeof window.animateWishlistButton === 'function') {
      window.animateWishlistButton();
    }
    
    if (typeof showToast === 'function') {
      const product = window.PRODUCTS?.find(p => p.id === productId);
      showToast(`${product?.name || 'Producto'} agregado a favoritos`, 'success', false);
    }
    
    // Actualizar botones de corazón
    updateHeartButtons();
    return true;
  }
  return false;
}

// Quitar producto de favoritos
function removeFromWishlist(productId) {
  const index = wishlist.indexOf(productId);
  if (index > -1) {
    wishlist.splice(index, 1);
    saveWishlist();
    
    if (typeof showToast === 'function') {
      const product = window.PRODUCTS?.find(p => p.id === productId);
      showToast(`${product?.name || 'Producto'} eliminado de favoritos`, 'info', false);
    }
    
    // Actualizar botones de corazón
    updateHeartButtons();
    return true;
  }
  return false;
}

// Toggle favorito
function toggleWishlist(productId) {
  if (wishlist.includes(productId)) {
    removeFromWishlist(productId);
  } else {
    addToWishlist(productId);
  }
}

// Verificar si producto está en favoritos
function isInWishlist(productId) {
  return wishlist.includes(productId);
}

// Actualizar contador de favoritos en el header
function updateWishlistBadge() {
  const badge = document.getElementById('wishlistCount');
  if (badge) {
    badge.textContent = wishlist.length;
    badge.style.display = wishlist.length > 0 ? 'inline-block' : 'none';
  }
}

// Actualizar todos los botones de corazón
function updateHeartButtons() {
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const productId = btn.dataset.productId;
    if (isInWishlist(productId)) {
      btn.classList.add('active');
      btn.innerHTML = '❤️';
      btn.title = 'Quitar de favoritos';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '🤍';
      btn.title = 'Agregar a favoritos';
    }
  });
}

// Agregar botones de corazón a las tarjetas de productos
function addWishlistButtons() {
  // Tarjetas en catálogo/index
  document.querySelectorAll('.card').forEach(card => {
    if (card.querySelector('.wishlist-btn')) return; // Ya tiene botón
    
    const addBtn = card.querySelector('.add, .btn.primary');
    if (!addBtn) return;
    
    const productId = addBtn.dataset?.id || addBtn.getAttribute('onclick')?.match(/add\('([^']+)'\)/)?.[1];
    if (!productId) return;
    
    const heartBtn = document.createElement('button');
    heartBtn.className = 'wishlist-btn';
    heartBtn.dataset.productId = productId;
    heartBtn.innerHTML = isInWishlist(productId) ? '❤️' : '🤍';
    heartBtn.title = isInWishlist(productId) ? 'Quitar de favoritos' : 'Agregar a favoritos';
    
    heartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(productId);
    });
    
    // Insertar el botón en la esquina superior derecha de la tarjeta
    card.style.position = 'relative';
    card.insertBefore(heartBtn, card.firstChild);
  });
  
  // Tarjetas de productos relacionados
  document.querySelectorAll('.related-card').forEach(card => {
    if (card.querySelector('.wishlist-btn')) return;
    
    const productId = card.dataset.productId;
    if (!productId) return;
    
    const heartBtn = document.createElement('button');
    heartBtn.className = 'wishlist-btn';
    heartBtn.dataset.productId = productId;
    heartBtn.innerHTML = isInWishlist(productId) ? '❤️' : '🤍';
    heartBtn.title = isInWishlist(productId) ? 'Quitar de favoritos' : 'Agregar a favoritos';
    
    heartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(productId);
    });
    
    card.style.position = 'relative';
    card.insertBefore(heartBtn, card.firstChild);
  });
}

// Renderizar página de favoritos
function renderWishlistPage() {
  const container = document.getElementById('wishlistGrid');
  if (!container) return;
  
  if (!wishlist || wishlist.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
        <div style="font-size: 4rem; margin-bottom: 20px;">💔</div>
        <h2 style="margin: 0 0 10px; color: #1e293b; font-weight:800;">No tienes favoritos aún</h2>
        <p style="color: #64748b; margin-bottom: 28px; font-size:1rem;">Guarda tus productos favoritos tocando el corazón ❤️ en el catálogo para comprarlos cuando quieras.</p>
        <a href="catalogo.html" class="btn primary" style="text-decoration: none; padding: 14px 28px; display: inline-flex; align-items:center; gap:8px; border-radius: 999px; font-weight:700; background:#4f46e5; color:#fff;">
          🔍 Explorar catálogo
        </a>
      </div>
    `;
    return;
  }
  
  if (!window.PRODUCTS || window.PRODUCTS.length === 0) {
    try {
      const cached = JSON.parse(localStorage.getItem('PRODUCTS') || '[]');
      if (Array.isArray(cached) && cached.length > 0) {
        window.PRODUCTS = cached;
      }
    } catch(e) {}
  }

  if (!window.PRODUCTS || window.PRODUCTS.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
        <div style="font-size: 3rem; margin-bottom: 16px;">⏳</div>
        <h3 style="color:#1e293b;margin-bottom:8px">No pudimos conectar con el catálogo</h3>
        <p style="color:#64748b;margin-bottom:20px;font-size:0.95rem">Por favor revisa tu conexión a internet o recarga la página.</p>
        <button onclick="location.reload()" class="btn primary" style="border-radius:999px;padding:10px 22px;cursor:pointer">🔄 Recargar página</button>
      </div>
    `;
    return;
  }
  
  const wishlistProducts = wishlist
    .map(id => window.PRODUCTS.find(p => String(p.id) === String(id)))
    .filter(Boolean); // Filtrar productos válidos
  
  if (wishlistProducts.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
        <div style="font-size: 4rem; margin-bottom: 20px;">💔</div>
        <h2 style="margin: 0 0 10px; color: #1e293b; font-weight:800;">No tienes favoritos guardados</h2>
        <p style="color: #64748b; margin-bottom: 28px; font-size:1rem;">Los productos que tenías guardados ya no están en el catálogo o fueron modificados.</p>
        <a href="catalogo.html" class="btn primary" style="text-decoration: none; padding: 14px 28px; display: inline-flex; align-items:center; gap:8px; border-radius: 999px; font-weight:700; background:#4f46e5; color:#fff;">
          🔍 Explorar catálogo
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = wishlistProducts.map(p => {
    const desc = p.descripcion || p.description || p.desc || '';
    const numPrice = Number(p.price || 0);
    const price = numPrice > 0 ? `$${numPrice.toLocaleString('es-CL')}` : 'Consultar';
    const discount = Number(p.discount || 0);
    const hasDiscount = discount > 0;
    const finalPrice = hasDiscount ? `$${Math.round(numPrice * (1 - discount / 100)).toLocaleString('es-CL')}` : price;
    
    return `
      <div class="card" style="position: relative;">
        <button class="wishlist-btn active" data-product-id="${p.id}" style="position: absolute; top: 10px; right: 10px;" title="Quitar de favoritos">
          ❤️
        </button>
        <a href="producto.html?id=${p.id}" class="prod-link">
          <img src="${p.img || 'img/placeholder.png'}" alt="${p.name}" loading="lazy" onerror="this.src='img/placeholder.png'">
        </a>
        <h4>
          <a href="producto.html?id=${p.id}" class="prod-link">${p.name}</a>
        </h4>
        ${desc ? `<p class="desc">${desc}</p>` : ''}
        ${hasDiscount ? `<span class="price-old">${price}</span>` : ''}
        <strong class="price">${finalPrice}</strong>
        ${hasDiscount ? `<span class="badge discount">-${discount}%</span>` : ''}
        <div class="btns">
          <button class="add" data-id="${p.id}">🛒 Agregar</button>
          <a href="producto.html?id=${p.id}" class="btn outline small">Ver detalles</a>
        </div>
      </div>
    `;
  }).join('');
  
  // Agregar event listeners
  container.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(btn.dataset.productId);
      renderWishlistPage();
    });
  });
  
  container.querySelectorAll('.add').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof window.add === 'function') {
        window.add(btn.dataset.id);
      }
    });
  });
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  initWishlist();
  
  // Agregar botones después de un pequeño delay para asegurar que los productos estén cargados
  setTimeout(() => {
    addWishlistButtons();
  }, 500);
  
  // Observer para productos cargados dinámicamente
  const observer = new MutationObserver(() => {
    addWishlistButtons();
  });
  
  const catalogGrid = document.getElementById('catalogGrid') || document.querySelector('.grid');
  if (catalogGrid) {
    observer.observe(catalogGrid, {
      childList: true,
      subtree: true
    });
  }
  
  // Renderizar página de favoritos si estamos en ella
  if (document.getElementById('wishlistGrid')) {
    // Si no hay favoritos, renderizar de inmediato (sin esperar a productos)
    if (!wishlist || wishlist.length === 0) {
      renderWishlistPage();
      return;
    }

    // Si hay favoritos, intentar recuperar PRODUCTS de cache de inmediato
    if (!window.PRODUCTS || window.PRODUCTS.length === 0) {
      try {
        const cached = JSON.parse(localStorage.getItem('PRODUCTS') || '[]');
        if (Array.isArray(cached) && cached.length > 0) {
          window.PRODUCTS = cached;
        }
      } catch (e) {}
    }

    if (window.PRODUCTS && window.PRODUCTS.length > 0) {
      renderWishlistPage();
      return;
    }

    // Esperar a que los productos se carguen o usar fallback
    let rendered = false;
    const finish = () => {
      if (!rendered) {
        rendered = true;
        renderWishlistPage();
      }
    };

    const checkProducts = setInterval(() => {
      if (window.PRODUCTS && window.PRODUCTS.length > 0) {
        clearInterval(checkProducts);
        finish();
      }
    }, 100);

    // Si después de 1.5s no cargó, intentar datos.json y terminar
    setTimeout(() => {
      clearInterval(checkProducts);
      if (!window.PRODUCTS || window.PRODUCTS.length === 0) {
        fetch('datos.json')
          .then(r => r.json())
          .then(json => {
            const raw = json && json.productos ? Object.entries(json.productos).map(([id, p]) => ({ id, ...p })) : [];
            if (raw.length) window.PRODUCTS = raw;
          })
          .catch(() => {})
          .finally(() => {
            finish();
          });
      } else {
        finish();
      }
    }, 1500);
  }
});

// Escuchar evento de productos listos
document.addEventListener('productsReady', () => {
  addWishlistButtons();
  if (document.getElementById('wishlistGrid')) {
    renderWishlistPage();
  }
});

// Exponer funciones globalmente
// Exponer API pública en window
window.wishlist = {
  add: addToWishlist,
  remove: removeFromWishlist,
  toggle: toggleWishlist,
  isInWishlist: isInWishlist,
  getAll: () => [...wishlist],
  render: renderWishlistPage
};

// Compatibilidad con consumidores que esperan funciones sueltas
window.toggleWishlist = toggleWishlist;
window.isInWishlist = isInWishlist;
window.updateWishlistBadge = updateWishlistBadge;
window.addWishlistButtons = addWishlistButtons;

console.log('❤️ Sistema de Favoritos cargado correctamente');
