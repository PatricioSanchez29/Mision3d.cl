/**
 * QUICK VIEW MODAL ⚡
 * Ver detalles del producto sin cambiar de página
 * con galería, precio, descripción y añadir al carrito
 */

(function() {
  'use strict';

  let currentProduct = null;
  let currentImageIndex = 0;

  /**
   * Inicializar Quick View
   */
  function initQuickView() {
    // Crear modal si no existe
    if (!document.getElementById('quickViewModal')) {
      createQuickViewModal();
    }

    // Agregar botones de quick view a todas las tarjetas de productos
    addQuickViewButtons();

    // Observar nuevas tarjetas agregadas dinámicamente
    observeProductCards();
  }

  /**
   * Crear estructura del modal
   */
  function createQuickViewModal() {
    const modal = document.createElement('div');
    modal.id = 'quickViewModal';
    modal.className = 'quick-view-modal';
    modal.innerHTML = `
      <div class="quick-view-overlay"></div>
      <div class="quick-view-content">
        <button class="quick-view-close" aria-label="Cerrar">×</button>
        
        <div class="quick-view-body">
          <!-- Galería -->
          <div class="quick-view-gallery">
            <div class="quick-view-main-image">
              <img id="qvMainImage" src="" alt="">
              <button class="qv-nav-btn qv-prev" aria-label="Anterior">‹</button>
              <button class="qv-nav-btn qv-next" aria-label="Siguiente">›</button>
            </div>
            <div class="quick-view-thumbnails" id="qvThumbnails"></div>
          </div>

          <!-- Información del producto -->
          <div class="quick-view-info">
            <div class="qv-badges" id="qvBadges"></div>
            <h2 class="qv-title" id="qvTitle"></h2>
            <div class="qv-rating" id="qvRating"></div>
            
            <div class="qv-price-block">
              <div class="qv-price" id="qvPrice"></div>
              <div class="qv-stock" id="qvStock"></div>
            </div>

            <div class="qv-description" id="qvDescription"></div>

            <div class="qv-category" id="qvCategory"></div>

            <!-- Variantes -->
            <div class="qv-variants" id="qvVariants" style="display:none;">
              <label>Opciones:</label>
              <div class="qv-variants-grid" id="qvVariantsGrid"></div>
            </div>

            <!-- Campo de personalización -->
            <div class="qv-customization" id="qvCustomization" style="display:none;">
              <label>Personalización:</label>
              <input type="text" id="qvCustomNote" placeholder="Escribe tu texto (máx 15 letras)" maxlength="15" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px">
              <small style="color:#666;display:block;margin-top:4px">Este texto se enviará con tu pedido</small>
            </div>

            <div class="qv-quantity">
              <label>Cantidad:</label>
              <div class="qty-box">
                <button onclick="window.changeQVQuantity(-1)">−</button>
                <span id="qvQty">1</span>
                <button onclick="window.changeQVQuantity(1)">+</button>
              </div>
            </div>

            <div class="qv-actions">
              <button class="btn primary" id="qvAddToCart">
                🛒 Añadir al Carrito
              </button>
              <button class="btn outline" id="qvViewFull">
                👁️ Ver Detalles Completos
              </button>
              <button class="btn-icon wishlist-qv" id="qvWishlist" title="Agregar a favoritos">
                🤍
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const closeBtn = modal.querySelector('.quick-view-close');
    const overlay = modal.querySelector('.quick-view-overlay');
    const prevBtn = modal.querySelector('.qv-prev');
    const nextBtn = modal.querySelector('.qv-next');
    const addToCartBtn = modal.querySelector('#qvAddToCart');
    const viewFullBtn = modal.querySelector('#qvViewFull');
    const wishlistBtn = modal.querySelector('#qvWishlist');

    closeBtn.addEventListener('click', closeQuickView);
    overlay.addEventListener('click', closeQuickView);
    prevBtn.addEventListener('click', () => navigateImages(-1));
    nextBtn.addEventListener('click', () => navigateImages(1));
    addToCartBtn.addEventListener('click', addToCartFromQuickView);
    viewFullBtn.addEventListener('click', viewFullProduct);
    wishlistBtn.addEventListener('click', toggleWishlistFromQuickView);

    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeQuickView();
      }
    });

    // Navegar imágenes con flechas
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;
      if (e.key === 'ArrowLeft') navigateImages(-1);
      if (e.key === 'ArrowRight') navigateImages(1);
    });
  }

  /**
   * Agregar botones de quick view a productos
   */
  function addQuickViewButtons() {
    const productCards = document.querySelectorAll('.card, .related-card');
    
    productCards.forEach(card => {
      // Evitar agregar múltiples veces
      if (card.querySelector('.quick-view-btn')) return;

      // Extraer ID del producto
      const addBtn = card.querySelector('button[onclick*="add"]');
      if (!addBtn) return;

      const productId = addBtn.dataset?.id || 
                       addBtn.getAttribute('onclick')?.match(/add\('([^']+)'\)/)?.[1];
      
      if (!productId) return;

      // Crear botón de quick view
      const qvBtn = document.createElement('button');
      qvBtn.className = 'quick-view-btn';
      qvBtn.innerHTML = '👁️ Vista Rápida';
      qvBtn.title = 'Vista rápida';
      qvBtn.onclick = (e) => {
        e.stopPropagation();
        openQuickView(productId);
      };

      // Agregar al card
      const cardActions = card.querySelector('.card-actions') || card;
      
      // Si no hay contenedor de acciones, crear uno
      if (!card.querySelector('.card-actions')) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'card-actions';
        actionsDiv.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
        
        const existingBtn = card.querySelector('button[onclick*="add"]');
        if (existingBtn) {
          existingBtn.parentNode.insertBefore(actionsDiv, existingBtn);
          actionsDiv.appendChild(existingBtn);
        }
        
        actionsDiv.appendChild(qvBtn);
      } else {
        cardActions.appendChild(qvBtn);
      }
    });
  }

  /**
   * Observar nuevas tarjetas de productos
   */
  function observeProductCards() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.classList?.contains('card') || node.classList?.contains('related-card')) {
              addQuickViewButtons();
            } else if (node.querySelector?.('.card, .related-card')) {
              addQuickViewButtons();
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Abrir Quick View con un producto
   */
  function openQuickView(productId) {
    if (!window.PRODUCTS || !Array.isArray(window.PRODUCTS)) {
      console.warn('PRODUCTS no disponible');
      return;
    }

    const product = window.PRODUCTS.find(p => p.id === productId);
    if (!product) {
      console.warn('Producto no encontrado:', productId);
      return;
    }

    currentProduct = product;
    currentImageIndex = 0;

    // Llenar contenido
    populateQuickView(product);

    // Mostrar modal
    const modal = document.getElementById('quickViewModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Animación de entrada
    setTimeout(() => {
      modal.querySelector('.quick-view-content').classList.add('visible');
    }, 10);
  }

  /**
   * Poblar contenido del Quick View
   */
  function populateQuickView(product) {
    // Título
    document.getElementById('qvTitle').textContent = product.name;

    // Precio
    const priceEl = document.getElementById('qvPrice');
    if (product.discount && product.discount > 0) {
      const discountedPrice = product.price * (1 - product.discount / 100);
      priceEl.innerHTML = `
        <span class="qv-price-current">$${Math.round(discountedPrice).toLocaleString('es-CL')}</span>
        <span class="qv-price-old">$${product.price.toLocaleString('es-CL')}</span>
        <span class="qv-discount">-${product.discount}%</span>
      `;
    } else {
      priceEl.innerHTML = `<span class="qv-price-current">$${product.price.toLocaleString('es-CL')}</span>`;
    }

    // Stock
    const stockEl = document.getElementById('qvStock');
    if (product.stock === 'disponible') {
      stockEl.innerHTML = '<span class="stock-available">✅ Disponible</span>';
    } else if (product.stock === 'bajo') {
      stockEl.innerHTML = '<span class="stock-low">⚠️ Stock Limitado</span>';
    } else {
      stockEl.innerHTML = '<span class="stock-out">❌ Agotado</span>';
    }

    // Badges
    const badgesEl = document.getElementById('qvBadges');
    let badges = '';
    if (product.dateAdded && isNewProduct(product.dateAdded)) {
      badges += '<span class="badge new">Nuevo</span>';
    }
    if (product.discount && product.discount > 0) {
      badges += `<span class="badge discount">-${product.discount}%</span>`;
    }
    badgesEl.innerHTML = badges;

    // Rating
    const ratingEl = document.getElementById('qvRating');
    if (product.stars && product.reviews) {
      const stars = '⭐'.repeat(product.stars);
      ratingEl.innerHTML = `${stars} <span>(${product.reviews} reviews)</span>`;
    }

    // Descripción
    const descEl = document.getElementById('qvDescription');
    descEl.textContent = product.desc || 'Producto de impresión 3D personalizada de alta calidad.';

    // Categoría
    const catEl = document.getElementById('qvCategory');
    if (product.category) {
      catEl.innerHTML = `<span class="qv-cat-label">📂 Categoría:</span> <span class="qv-cat-value">${product.category}</span>`;
    }

    // Variantes
    let variants = [];
    if(product.variants && Array.isArray(product.variants)){
      variants = product.variants;
    } else if(product.variants && typeof product.variants === 'string'){
      try {
        variants = JSON.parse(product.variants);
      } catch(e) {
        variants = [];
      }
    }

    const variantsContainer = document.getElementById('qvVariants');
    const variantsGrid = document.getElementById('qvVariantsGrid');
    const customizationDiv = document.getElementById('qvCustomization');
    
    if(variants && variants.length > 0){
      variantsContainer.style.display = 'block';
      variantsGrid.innerHTML = variants.map((v, i) => `
        <button class="qv-variant-btn ${i === 0 ? 'active' : ''}" data-index="${i}" data-price="${v.price}" data-image="${v.image || ''}">
          ${v.name}
        </button>
      `).join('');
      
      // Inicializar precio y variante seleccionada
      if (!window.qvSelectedVariant) window.qvSelectedVariant = variants[0];
      
      // Event listeners para botones de variantes
      variantsGrid.querySelectorAll('.qv-variant-btn').forEach(btn => {
        btn.addEventListener('click', function(){
          // Desactivar todos
          variantsGrid.querySelectorAll('.qv-variant-btn').forEach(b => b.classList.remove('active'));
          // Activar el clickeado
          this.classList.add('active');
          
          const index = parseInt(this.dataset.index);
          window.qvSelectedVariant = variants[index];
          
          // Actualizar precio
          const priceEl = document.getElementById('qvPrice');
          const variantPrice = window.qvSelectedVariant.price;
          if (product.discount && product.discount > 0) {
            const discountedPrice = variantPrice * (1 - product.discount / 100);
            priceEl.innerHTML = `
              <span class="qv-price-current">$${Math.round(discountedPrice).toLocaleString('es-CL')}</span>
              <span class="qv-price-old">$${variantPrice.toLocaleString('es-CL')}</span>
              <span class="qv-discount">-${product.discount}%</span>
            `;
          } else {
            priceEl.innerHTML = `<span class="qv-price-current">$${variantPrice.toLocaleString('es-CL')}</span>`;
          }
          
          // Cambiar imagen si la variante tiene una
          if (window.qvSelectedVariant.image && window.qvSelectedVariant.image.trim() !== '') {
            document.getElementById('qvMainImage').src = window.qvSelectedVariant.image;
          } else {
            document.getElementById('qvMainImage').src = product.img;
          }
          
          // Mostrar/ocultar campo de personalización
          const variantName = (window.qvSelectedVariant?.name || '').toLowerCase();
          const isPersonalizada = variantName.includes('personalizado') && !variantName.includes('sin');
          customizationDiv.style.display = isPersonalizada ? 'block' : 'none';
        });
      });
      
      // Estado inicial del campo de personalización
      const firstVariantName = (variants[0]?.name || '').toLowerCase();
      const isFirstPersonalizada = firstVariantName.includes('personalizado') && !firstVariantName.includes('sin');
      customizationDiv.style.display = isFirstPersonalizada ? 'block' : 'none';
      
      // Inicializar precio con primera variante
      const priceEl = document.getElementById('qvPrice');
      const variantPrice = variants[0].price;
      if (product.discount && product.discount > 0) {
        const discountedPrice = variantPrice * (1 - product.discount / 100);
        priceEl.innerHTML = `
          <span class="qv-price-current">$${Math.round(discountedPrice).toLocaleString('es-CL')}</span>
          <span class="qv-price-old">$${variantPrice.toLocaleString('es-CL')}</span>
          <span class="qv-discount">-${product.discount}%</span>
        `;
      } else {
        priceEl.innerHTML = `<span class="qv-price-current">$${variantPrice.toLocaleString('es-CL')}</span>`;
      }
    } else {
      variantsContainer.style.display = 'none';
      customizationDiv.style.display = 'none';
      window.qvSelectedVariant = null;
    }

    // Imagen principal
    const mainImg = document.getElementById('qvMainImage');
    mainImg.src = product.img;
    mainImg.alt = product.name;

    // Thumbnails (si hay múltiples imágenes)
    const thumbsContainer = document.getElementById('qvThumbnails');
    const images = product.images || [product.img];
    
    if (images.length > 1) {
      thumbsContainer.innerHTML = images.map((img, index) => `
        <img src="${img}" alt="${product.name}" 
             class="qv-thumb ${index === 0 ? 'active' : ''}"
             onclick="window.selectQVImage(${index})">
      `).join('');
      thumbsContainer.style.display = 'flex';
    } else {
      thumbsContainer.style.display = 'none';
    }

    // Reset cantidad
    document.getElementById('qvQty').textContent = '1';

    // Wishlist
    updateWishlistButton();
  }

  /**
   * Verificar si es producto nuevo (últimos 30 días)
   */
  function isNewProduct(dateAdded) {
    const productDate = new Date(dateAdded);
    const now = new Date();
    const diffDays = (now - productDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }

  /**
   * Navegar entre imágenes
   */
  function navigateImages(direction) {
    if (!currentProduct) return;

    const images = currentProduct.images || [currentProduct.img];
    currentImageIndex = (currentImageIndex + direction + images.length) % images.length;

    const mainImg = document.getElementById('qvMainImage');
    mainImg.src = images[currentImageIndex];

    // Actualizar thumbnail activo
    document.querySelectorAll('.qv-thumb').forEach((thumb, index) => {
      thumb.classList.toggle('active', index === currentImageIndex);
    });
  }

  /**
   * Seleccionar imagen
   */
  function selectQVImage(index) {
    currentImageIndex = index;
    navigateImages(0);
  }

  /**
   * Cambiar cantidad
   */
  function changeQVQuantity(delta) {
    const qtyEl = document.getElementById('qvQty');
    let qty = parseInt(qtyEl.textContent) + delta;
    qty = Math.max(1, Math.min(99, qty));
    qtyEl.textContent = qty;
  }

  /**
   * Añadir al carrito desde Quick View
   */
  function addToCartFromQuickView() {
    if (!currentProduct) return;

    const qty = parseInt(document.getElementById('qvQty').textContent);
    const customNote = document.getElementById('qvCustomNote')?.value?.trim() || '';
    
    // Si tiene variantes, agregar con variante seleccionada
    if (window.qvSelectedVariant) {
      // Usar el carrito global si existe para mantener sincronía con la UI
      const itemKey = `${currentProduct.id}-${window.qvSelectedVariant.name}`;
      try {
        if (Array.isArray(window.cart)) {
          let existingItem = window.cart.find(x => x.id === itemKey);
          if (existingItem) {
            existingItem.qty += qty;
            if (customNote) existingItem.customNote = customNote;
          } else {
            window.cart.push({
              id: itemKey,
              originalId: currentProduct.id,
              qty: qty,
              variant: window.qvSelectedVariant.name,
              price: Number(window.qvSelectedVariant.price) || Number(currentProduct.price) || 0,
              customNote: customNote || null
            });
          }
          // Persistir y actualizar UI
          if (typeof window.save === 'function') window.save();
          if (typeof window.badge === 'function') window.badge();
          if (typeof window.openCart === 'function') window.openCart();
          if (typeof window.render === 'function') window.render(itemKey, `${currentProduct.name}${window.qvSelectedVariant.name?` (${window.qvSelectedVariant.name})`:''}`);
        } else {
          // Fallback solo localStorage si no existe window.cart
          const lc = JSON.parse(localStorage.getItem('cart') || '[]');
          let existingItem = lc.find(x => x.id === itemKey);
          if (existingItem) {
            existingItem.qty += qty;
            if (customNote) existingItem.customNote = customNote;
          } else {
            lc.push({ id: itemKey, originalId: currentProduct.id, qty, variant: window.qvSelectedVariant.name, price: Number(window.qvSelectedVariant.price)||0, customNote: customNote||null });
          }
          localStorage.setItem('cart', JSON.stringify(lc));
        }
      } catch {}

      if (typeof window.showToast === 'function') {
        const variantText = window.qvSelectedVariant.name ? ` (${window.qvSelectedVariant.name})` : '';
        window.showToast(`✅ ${qty}x ${currentProduct.name}${variantText} añadido al carrito`);
      }

      closeQuickView();
      return;
    }
    
    // Sin variantes: usar la función add() global
    if (typeof window.add === 'function') {
      for (let i = 0; i < qty; i++) {
        window.add(currentProduct.id);
      }
      
      if (typeof window.showToast === 'function') {
        window.showToast(`✅ ${qty}x ${currentProduct.name} añadido al carrito`);
      }
      
      closeQuickView();
    }
  }

  /**
   * Ver producto completo
   */
  function viewFullProduct() {
    if (!currentProduct) return;
    window.location.href = `producto.html?id=${currentProduct.id}`;
  }

  /**
   * Toggle wishlist desde Quick View
   */
  function toggleWishlistFromQuickView() {
    if (!currentProduct) return;

    // Usar API global de wishlist si está disponible
    if (window.wishlist?.toggle) {
      window.wishlist.toggle(currentProduct.id);
      updateWishlistButton();
    } else if (typeof window.toggleWishlist === 'function') {
      // soporte legacy si se expone como función suelta
      window.toggleWishlist(currentProduct.id);
      updateWishlistButton();
    }
  }

  /**
   * Actualizar botón de wishlist
   */
  function updateWishlistButton() {
    if (!currentProduct) return;

    const btn = document.getElementById('qvWishlist');
    const isInWishlist = (window.wishlist?.isInWishlist)
      ? window.wishlist.isInWishlist(currentProduct.id)
      : (typeof window.isInWishlist === 'function' ? window.isInWishlist(currentProduct.id) : false);

    btn.innerHTML = isInWishlist ? '❤️' : '🤍';
    btn.title = isInWishlist ? 'Quitar de favoritos' : 'Agregar a favoritos';
  }

  /**
   * Cerrar Quick View
   */
  function closeQuickView() {
    const modal = document.getElementById('quickViewModal');
    modal.querySelector('.quick-view-content').classList.remove('visible');
    
    setTimeout(() => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      currentProduct = null;
      currentImageIndex = 0;
    }, 300);
  }

  /**
   * Exponer funciones globalmente
   */
  window.initQuickView = initQuickView;
  window.openQuickView = openQuickView;
  window.closeQuickView = closeQuickView;
  window.selectQVImage = selectQVImage;
  window.changeQVQuantity = changeQVQuantity;

  /**
   * Auto-inicializar cuando el DOM esté listo
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickView);
  } else {
    // Delay para asegurar que otros scripts carguen primero
    setTimeout(initQuickView, 100);
  }

})();
