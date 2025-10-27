/**
 * BÚSQUEDA AVANZADA EN HEADER
 * Maneja el dropdown de categorías y la búsqueda en el header
 */

(function() {
  'use strict';

  // Poblar dropdown de categorías cuando los productos estén listos
  document.addEventListener('productsReady', () => {
    populateHeaderCategories();
  });

  // También intentar poblar al cargar si ya están disponibles
  if (window.PRODUCTS && window.PRODUCTS.length > 0) {
    populateHeaderCategories();
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
  }

  function performSearch() {
    const searchText = searchInput.value.trim();
    const category = categorySelect ? categorySelect.value : 'all';
    
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

  // Exponer función globalmente por si se necesita
  window.performHeaderSearch = performSearch;
  window.populateHeaderCategories = populateHeaderCategories;

})();
