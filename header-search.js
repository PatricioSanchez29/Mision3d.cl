/**
 * BÚSQUEDA AVANZADA EN HEADER
 * Maneja el dropdown de categorías y la búsqueda en el header
 */

(function() {
  'use strict';

  // Poblar dropdown de categorías cuando los productos estén listos
  document.addEventListener('productsReady', () => {
    populateHeaderCategories();
    renderTrendChips();
  });

  // También intentar poblar al cargar si ya están disponibles
  if (window.PRODUCTS && window.PRODUCTS.length > 0) {
    populateHeaderCategories();
    renderTrendChips();
  }

  function populateHeaderCategories() {
    const select = document.getElementById('headerCategorySelect');
    if (!select || !window.PRODUCTS) return;

    // Obtener categorías únicas
    const categories = new Set();
    window.PRODUCTS.forEach(product => {
      if (product.category) {
        // Soportar múltiples categorías separadas por coma
        const cats = product.category.split(',').map(c => c.trim());
        cats.forEach(cat => categories.add(cat));
      }
    });

    // Limpiar opciones existentes excepto "Todas las categorías"
    select.innerHTML = '<option value="all">Todas las categorías</option>';

    // Agregar categorías ordenadas alfabéticamente
    Array.from(categories).sort().forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });

    console.log('📂 Categorías cargadas en header:', categories.size);
  }

  // Manejar búsqueda con botón
  const searchBtn = document.getElementById('headerSearchBtn');
  const searchInput = document.getElementById('searchInput');
  const categorySelect = document.getElementById('headerCategorySelect');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', performSearch);
    
    // También permitir búsqueda con Enter
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performSearch();
      }
    });

    // Rotación creativa de placeholders cuando está vacío y sin foco
    const placeholders = [
      '¿Qué estás buscando?…',
      'Busca: Porta llaveros',
      'Busca: Figuras 3D',
      'Busca: Accesorios Cocina',
      'Escribe y presiona Enter'
    ];
    let phIndex = 0;
    let phTimer = null;

    function startPlaceholderRotation() {
      if (!searchInput || searchInput === document.activeElement || searchInput.value.trim()) return;
      stopPlaceholderRotation();
      searchInput.setAttribute('placeholder', placeholders[phIndex]);
      phTimer = setInterval(() => {
        phIndex = (phIndex + 1) % placeholders.length;
        searchInput.setAttribute('placeholder', placeholders[phIndex]);
      }, 2800);
    }

    function stopPlaceholderRotation() {
      if (phTimer) {
        clearInterval(phTimer);
        phTimer = null;
      }
    }

    // Iniciar/pausar rotación según foco y contenido
    searchInput.addEventListener('focus', stopPlaceholderRotation);
    searchInput.addEventListener('blur', () => {
      setTimeout(startPlaceholderRotation, 150);
    });
    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim()) {
        stopPlaceholderRotation();
      } else {
        startPlaceholderRotation();
      }
    });

    // Arrancar rotación al cargar
    if (!searchInput.value.trim()) startPlaceholderRotation();
  }

  function performSearch() {
    const searchText = searchInput ? searchInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : 'all';
    const bar = document.querySelector('.advanced-search-bar');
    
    // Detectar si estamos en index o catalogo
    const isIndexPage = window.location.pathname.includes('index.html') || window.location.pathname === '/';
    
    if (isIndexPage) {
      // Redirigir a catálogo con parámetros
      let url = 'catalogo.html';
      const params = new URLSearchParams();
      
      if (searchText) params.set('search', searchText);
      if (category && category !== 'all') params.set('category', category);
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      // Si no hay ningún filtro ni texto, animación de "shake" y no navegar
      if (!searchText && (!category || category === 'all')) {
        if (bar) {
          bar.classList.add('shake');
          setTimeout(() => bar.classList.remove('shake'), 450);
        }
        return;
      }
      window.location.href = url;
    } else {
      // Estamos en catálogo, aplicar filtros
      if (category && category !== 'all' && typeof window.selectCategory === 'function') {
        window.selectCategory(category);
      }
      
      if (typeof window.renderCatalog === 'function') {
        window.renderCatalog(searchText);
      }
    }
  }

  function renderTrendChips() {
    const wrap = document.getElementById('headerTrendChips');
    if (!wrap) return;

    // Construir lista de tendencias: top categorías + términos por defecto
    const defaults = ['Porta Cuchara', 'Accesorios Cocina', 'Porta Vinos', 'Llaveros', 'Figuras 3D', 'Personalizados'];
    const categoryCounts = new Map();
    if (window.PRODUCTS && Array.isArray(window.PRODUCTS)) {
      window.PRODUCTS.forEach(p => {
        if (!p.category) return;
        const cats = p.category.split(',').map(c=>c.trim());
        cats.forEach(c => categoryCounts.set(c, (categoryCounts.get(c) || 0) + 1));
      });
    }

    const topCats = Array.from(categoryCounts.entries())
      .sort((a,b)=>b[1]-a[1])
      .slice(0,4)
      .map(([c])=>c);

    const terms = [...new Set([...topCats, ...defaults])].slice(0,8);

    wrap.innerHTML = '';
    terms.forEach(term => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'trend-chip';
      chip.textContent = term;
      chip.addEventListener('click', () => {
        if (searchInput) searchInput.value = term;
        performSearch();
      });
      wrap.appendChild(chip);
    });
  }

  // Exponer función globalmente por si se necesita
  window.performHeaderSearch = performSearch;
  window.populateHeaderCategories = populateHeaderCategories;
  window.renderTrendChips = renderTrendChips;

})();
