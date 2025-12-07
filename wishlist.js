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
      showToast(`❤️ ${product?.name || 'Producto'} agregado a favoritos`, 'success');
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
      showToast(`💔 ${product?.name || 'Producto'} eliminado de favoritos`, 'info');
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
  
  if (wishlist.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
        <div style="font-size: 4rem; margin-bottom: 20px;">💔</div>
        <h2 style="margin: 0 0 10px; color: #333;">No tienes favoritos aún</h2>
        <p style="color: #666; margin-bottom: 30px;">Guarda tus productos favoritos para comprarlos después</p>
        <a href="catalogo.html" class="btn primary" style="text-decoration: none; padding: 12px 24px; display: inline-block;">
          Explorar productos
        </a>
      </div>
    `;
    return;
  }
  
  if (!window.PRODUCTS || window.PRODUCTS.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">Cargando productos...</p>';
    return;
  }
  
  const wishlistProducts = wishlist
    .map(id => window.PRODUCTS.find(p => p.id === id))
    .filter(p => p); // Filtrar productos que ya no existen
  
  container.innerHTML = wishlistProducts.map(p => {
    const desc = p.name.includes('Calendario') ? 'Calendario 3D con circuitos' :
                 p.name.includes('Beyblade') ? 'Personalizable con tu nombre' :
                 p.name.includes('Mascota') ? 'Tu mascota en 3D' :
                 p.name.includes('Pokebola') ? 'Pokebola coleccionable' : 
                 'Personalizado con tu logo';
    
    const price = p.price ? `$${p.price.toLocaleString('es-CL')}` : 'Consultar';
    const oldPrice = p.discount && p.discount > 0 ? `$${p.price.toLocaleString('es-CL')}` : '';
    const finalPrice = p.discount && p.discount > 0 ? 
      `$${Math.round(p.price * (1 - p.discount / 100)).toLocaleString('es-CL')}` : price;
    
    return `
      <div class="card" style="position: relative;">
        <button class="wishlist-btn active" data-product-id="${p.id}" style="position: absolute; top: 10px; right: 10px;">
          ❤️
        </button>
        <a href="producto.html?id=${p.id}" class="prod-link">
          <img src="${p.img || 'img/placeholder.png'}" alt="${p.name}" loading="lazy">
        </a>
        <h4>
          <a href="producto.html?id=${p.id}" class="prod-link">${p.name}</a>
        </h4>
        <p class="desc">${desc}</p>
        ${oldPrice ? `<span class="price-old">${oldPrice}</span>` : ''}
        <strong class="price">${finalPrice}</strong>
        ${p.discount > 0 ? `<span class="badge discount">-${p.discount}%</span>` : ''}
        <div class="btns">
          <button class="add" data-id="${p.id}">Agregar al carrito</button>
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
      // Volver a renderizar la página
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
    // Esperar a que los productos se carguen
    const checkProducts = setInterval(() => {
      if (window.PRODUCTS && window.PRODUCTS.length > 0) {
        clearInterval(checkProducts);
        renderWishlistPage();
      }
    }, 100);
    
    setTimeout(() => clearInterval(checkProducts), 5000);
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
