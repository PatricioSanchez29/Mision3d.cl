/*
 * UX Enhancements - Mejoras de experiencia de usuario
 * Incluye: Scroll to top, Image zoom, Price sliders
 */

// ===== SCROLL TO TOP BUTTON =====
(function() {
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
  
  // Ejecutar al cargar y observar cambios en el DOM
  document.addEventListener('DOMContentLoaded', enableImageZoom);
  
  // Observer para productos cargados dinámicamente
  const observer = new MutationObserver(() => {
    enableImageZoom();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
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
  
  function updateSlider() {
    let min = parseInt(minRange.value);
    let max = parseInt(maxRange.value);
    
    // Evitar que se crucen
    if (min > max - 1000) {
      if (this.id === 'minRange') {
        min = max - 1000;
        minRange.value = min;
      } else {
        max = min + 1000;
        maxRange.value = max;
      }
    }
    
    // Actualizar valores mostrados
    minValue.textContent = `$${min.toLocaleString('es-CL')}`;
    maxValue.textContent = `$${max.toLocaleString('es-CL')}`;
    
    // Actualizar track visual
    const percentMin = ((min - minPrice) / (maxPrice - minPrice)) * 100;
    const percentMax = ((max - minPrice) / (maxPrice - minPrice)) * 100;
    track.style.left = percentMin + '%';
    track.style.width = (percentMax - percentMin) + '%';
    
    // Aplicar filtro si existe la función
    if (typeof window.applyPriceFilter === 'function') {
      window.applyPriceFilter(min, max);
    }
  }
  
  minRange.addEventListener('input', updateSlider);
  maxRange.addEventListener('input', updateSlider);
  
  // Inicializar
  updateSlider.call(minRange);
};

// ===== MEJOR ANIMACIÓN PARA TOAST =====
if (typeof window.showToast === 'function') {
  const originalShowToast = window.showToast;
  window.showToast = function(message, type = 'success') {
    // Llamar a la función original
    originalShowToast(message, type);
    
    // Agregar sonido de éxito (opcional)
    // const audio = new Audio('data:audio/wav;base64,...'); 
    // audio.play().catch(() => {});
  };
}

console.log('✨ UX Enhancements cargado correctamente');
