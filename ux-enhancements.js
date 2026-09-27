/*
 * UX Enhancements - Mejoras de experiencia de usuario
 * Incluye: Scroll to top, Image zoom, Price sliders
 */

// ===== SCROLL TO TOP BUTTON =====
(function() {
  // Crear botón si no existe (si ya hay un botón con id `scrollTop`, no creamos otro)
  if (document.getElementById('scrollTop') || document.getElementById('scrollToTop')) {
    return;
  }
  // Crear botón si no existe
  if (!document.getElementById('scrollToTop')) {
    const btn = document.createElement('button');
    btn.id = 'scrollToTop';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', 'Volver arriba');
    document.body.appendChild(btn);
    
    // Mostrar/ocultar según scroll
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      
      if (currentScroll > 300) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
      
      lastScroll = currentScroll;
    });
    
    // Click para scroll suave
    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
})();

// ===== IMAGE ZOOM FUNCTIONALITY =====
(function() {
  // Crear modal de zoom si no existe
  if (!document.getElementById('imageZoomModal')) {
    const modal = document.createElement('div');
    modal.id = 'imageZoomModal';
    modal.innerHTML = `
      <span class="close-zoom">&times;</span>
      <img src="" alt="Zoom">
    `;
    document.body.appendChild(modal);
    
    const modalImg = modal.querySelector('img');
    const closeBtn = modal.querySelector('.close-zoom');
    
    // Cerrar al hacer click en X o en el fondo
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
    
    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        modal.classList.remove('active');
      }
    });
    
    // Función global para abrir zoom
    window.openImageZoom = function(imageSrc) {
      modalImg.src = imageSrc;
      modal.classList.add('active');
    };
  }
  
  // Agregar zoom a todas las imágenes de productos
  function enableImageZoom() {
    // Imágenes en cards de catálogo
    document.querySelectorAll('.card img, .related-card img').forEach(img => {
      if (!img.dataset.zoomEnabled) {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          window.openImageZoom(img.src);
        });
        img.dataset.zoomEnabled = 'true';
      }
    });
    
    // Imagen principal en página de producto
    const productMain = document.querySelector('.product-main img');
    if (productMain && !productMain.dataset.zoomEnabled) {
      productMain.style.cursor = 'zoom-in';
      productMain.addEventListener('click', (e) => {
        e.stopPropagation();
        window.openImageZoom(productMain.src);
      });
      productMain.dataset.zoomEnabled = 'true';
    }
  }
  
  // Ejecutar al cargar y cuando se carguen productos dinámicamente (sin MutationObserver pesado)
  document.addEventListener('DOMContentLoaded', enableImageZoom);
  window.addEventListener('productsLoaded', enableImageZoom);
  document.addEventListener('productsReady', enableImageZoom);
})();

// ===== PRICE RANGE SLIDER =====
window.initPriceSlider = function(containerSelector = '#priceSliderContainer') {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  // Obtener rango de precios de los productos
  const prices = window.PRODUCTS ? window.PRODUCTS.map(p => p.price || 0).filter(p => p > 0) : [];
  if (prices.length === 0) return;
  
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // Crear HTML del slider
  container.innerHTML = `
    <div class="price-slider-container">
      <h4>Rango de precio</h4>
      <div class="slider-wrapper">
        <div class="slider-track" id="sliderTrack"></div>
        <div class="price-slider">
          <input type="range" id="minRange" min="${minPrice}" max="${maxPrice}" value="${minPrice}" step="1000">
          <input type="range" id="maxRange" min="${minPrice}" max="${maxPrice}" value="${maxPrice}" step="1000">
        </div>
      </div>
      <div class="price-values">
        <span id="minValue">$${minPrice.toLocaleString('es-CL')}</span>
        <span id="maxValue">$${maxPrice.toLocaleString('es-CL')}</span>
      </div>
    </div>
  `;
  
  const minRange = container.querySelector('#minRange');
  const maxRange = container.querySelector('#maxRange');
  const minValue = container.querySelector('#minValue');
  const maxValue = container.querySelector('#maxValue');
  const track = container.querySelector('#sliderTrack');
  
  let debounceTimer;
  
  function updateSlider(applyFilterImmediately = false) {
    let min = parseInt(minRange.value);
    let max = parseInt(maxRange.value);
    
    // Evitar que se crucen
    if (min > max - 1000) {
      if (this && this.id === 'minRange') {
        min = max - 1000;
        minRange.value = min;
      } else if (this && this.id === 'maxRange') {
        max = min + 1000;
        maxRange.value = max;
      }
    }
    
    // Actualizar valores mostrados INMEDIATAMENTE
    minValue.textContent = `$${min.toLocaleString('es-CL')}`;
    maxValue.textContent = `$${max.toLocaleString('es-CL')}`;
    
    // Actualizar track visual INMEDIATAMENTE
    const percentMin = ((min - minPrice) / (maxPrice - minPrice)) * 100;
    const percentMax = ((max - minPrice) / (maxPrice - minPrice)) * 100;
    track.style.left = percentMin + '%';
    track.style.width = (percentMax - percentMin) + '%';
    
    // Aplicar filtro
    if (applyFilterImmediately) {
      // Aplicar inmediatamente (usado en inicialización)
      if (typeof window.applyPriceFilter === 'function') {
        window.applyPriceFilter(min, max);
      }
    } else {
      // Aplicar con debounce para mejor performance durante el arrastre
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log('💰 Aplicando filtro de precio:', min, '-', max);
        if (typeof window.applyPriceFilter === 'function') {
          window.applyPriceFilter(min, max);
        }
      }, 500); // 500ms de espera
    }
  }
  
  // Event listeners para input (mientras arrastra)
  minRange.addEventListener('input', updateSlider);
  maxRange.addEventListener('input', updateSlider);
  
  // Event listeners para change (cuando suelta)
  minRange.addEventListener('change', function() {
    updateSlider.call(this, true); // Aplicar inmediatamente al soltar
  });
  maxRange.addEventListener('change', function() {
    updateSlider.call(this, true); // Aplicar inmediatamente al soltar
  });
  
  // Inicializar sin aplicar filtro
  const percentMin = 0;
  const percentMax = 100;
  track.style.left = percentMin + '%';
  track.style.width = (percentMax - percentMin) + '%';
};

// ===== NOTIFICACIONES DE PRUEBA SOCIAL (SOCIAL PROOF) =====
(function () {
  'use strict';

  // No mostrar en páginas de checkout o autenticación para evitar distracciones
  const path = window.location.pathname.toLowerCase();
  if (
    path.includes('checkout') ||
    path.includes('confirmacion') ||
    path.includes('login') ||
    path.includes('register') ||
    path.includes('admin')
  ) {
    return;
  }

  // Verificar si el usuario lo cerró en esta sesión
  if (sessionStorage.getItem('socialProofDismissed')) {
    return;
  }

  const BUYERS = [
    { name: 'Matías', city: 'La Florida' },
    { name: 'Camila', city: 'Las Condes' },
    { name: 'Sebastián', city: 'Concepción' },
    { name: 'Valentina', city: 'Viña del Mar' },
    { name: 'Nicolás', city: 'Maipú' },
    { name: 'Ignacio', city: 'Providencia' },
    { name: 'Constanza', city: 'Ñuñoa' },
    { name: 'Benjamín', city: 'Santiago' },
    { name: 'Javiera', city: 'Temuco' },
    { name: 'Felipe', city: 'Puente Alto' },
    { name: 'Francisca', city: 'Rancagua' },
    { name: 'Diego', city: 'Antofagasta' }
  ];

  const FALLBACK_PRODUCTS = [
    { name: 'Soporte Auriculares Gamer', img: 'img/mision3d_logov2.png' },
    { name: 'Llavero Articulado Dragón', img: 'img/mision3d_logov2.png' },
    { name: 'Soporte Control PS5 / Xbox', img: 'img/mision3d_logov2.png' },
    { name: 'Calendario F1 2026', img: 'img/mision3d_logov2.png' },
    { name: 'Pokebola Coleccionable', img: 'img/mision3d_logov2.png' },
    { name: 'Litofanía Personalizada 3D', img: 'img/mision3d_logov2.png' }
  ];

  const TIMES_AGO = [
    'hace 4 min',
    'hace 8 min',
    'hace 14 min',
    'hace 22 min',
    'hace 35 min',
    'hace 48 min',
    'hace 1 hora'
  ];

  let toastEl = null;
  let timerId = null;
  let hideTimerId = null;

  function createToastElement() {
    toastEl = document.createElement('div');
    toastEl.id = 'socialProofToast';
    toastEl.className = 'social-proof-toast';
    document.body.appendChild(toastEl);

    // Pausar ocultado al poner el mouse o tocar
    toastEl.addEventListener('mouseenter', () => {
      clearTimeout(hideTimerId);
    });
    toastEl.addEventListener('mouseleave', () => {
      hideTimerId = setTimeout(hideToast, 2500);
    });
  }

  function getProductsPool() {
    if (Array.isArray(window.PRODUCTS) && window.PRODUCTS.length > 0) {
      return window.PRODUCTS;
    }
    try {
      const cached = JSON.parse(localStorage.getItem('PRODUCTS') || '[]');
      if (Array.isArray(cached) && cached.length > 0) return cached;
    } catch (e) {}
    return FALLBACK_PRODUCTS;
  }

  function showSocialToast() {
    if (!toastEl) createToastElement();
    if (sessionStorage.getItem('socialProofDismissed')) return;

    const products = getProductsPool();
    const product = products[Math.floor(Math.random() * products.length)];
    const buyer = BUYERS[Math.floor(Math.random() * BUYERS.length)];
    const timeAgo = TIMES_AGO[Math.floor(Math.random() * TIMES_AGO.length)];
    const prodImg = product.img || 'img/placeholder.png';
    const prodName = product.name || 'Producto personalizado 3D';
    const prodLink = product.id ? `producto.html?id=${product.id}` : 'catalogo.html';

    toastEl.innerHTML = `
      <button class="sp-close" type="button" aria-label="Cerrar notificación">✕</button>
      <a href="${prodLink}" class="sp-content">
        <div class="sp-thumb">
          <img src="${prodImg}" alt="${prodName}" loading="lazy" onerror="this.src='img/placeholder.png'">
        </div>
        <div class="sp-info">
          <p class="sp-buyer"><strong>${buyer.name}</strong> de ${buyer.city}</p>
          <p class="sp-item">compró <span>${prodName}</span></p>
          <div class="sp-meta">
            <span class="sp-time">${timeAgo}</span>
            <span class="sp-badge">✓ Verificado</span>
          </div>
        </div>
      </a>
    `;

    // Cerrar
    const closeBtn = toastEl.querySelector('.sp-close');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      hideToast();
      sessionStorage.setItem('socialProofDismissed', 'true');
      clearTimeout(timerId);
    });

    // Mostrar con animación
    toastEl.classList.remove('hiding');
    toastEl.classList.add('visible');

    // Ocultar automáticamente tras 5.5s
    clearTimeout(hideTimerId);
    hideTimerId = setTimeout(hideToast, 5500);

    // Programar la siguiente notificación entre 28 y 38 segundos
    scheduleNext(Math.floor(Math.random() * 10000) + 28000);
  }

  function hideToast() {
    if (!toastEl) return;
    toastEl.classList.remove('visible');
    toastEl.classList.add('hiding');
  }

  function scheduleNext(delayMs) {
    clearTimeout(timerId);
    timerId = setTimeout(showSocialToast, delayMs);
  }

  // Iniciar después de 6.5 segundos de cargar la página
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleNext(6500));
  } else {
    scheduleNext(6500);
  }
})();

console.log('✨ UX Enhancements cargado correctamente');
