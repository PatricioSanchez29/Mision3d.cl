/**
 * BÚSQUEDA PREDICTIVA MEJORADA 🔍
 * Sistema avanzado de búsqueda con:
 * - Búsqueda por categoría
 * - Sugerencias inteligentes
 * - Historial de búsquedas
 * - Filtros múltiples
 */

(function() {
  'use strict';

  // Estado de la búsqueda
  const searchState = {
    history: JSON.parse(localStorage.getItem('searchHistory') || '[]'),
    selectedCategory: null,
    recentSearches: [],
    popularSearches: ['Figuras', 'Calendarios', 'Pokemon', 'Beyblade']
  };

  /**
   * Inicializar búsqueda mejorada
   */
  function initAdvancedSearch() {
    const searchInput = document.getElementById('searchInput');
    const suggestionsContainer = document.getElementById('searchSuggestions');

    if (!searchInput || !suggestionsContainer) {
      console.warn('Advanced Search: Elementos no encontrados');
      return;
    }

    // Event listeners
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('focus', handleSearchFocus);
    searchInput.addEventListener('keydown', handleSearchKeydown);

    // Cerrar sugerencias al hacer click fuera
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-header')) {
        closeSuggestions();
      }
    });

    // Mejorar el drawer search también
    const drawerSearchInput = document.getElementById('drawerSearchInput');
    if (drawerSearchInput) {
      drawerSearchInput.addEventListener('input', handleSearchInput);
      drawerSearchInput.addEventListener('focus', handleSearchFocus);
      drawerSearchInput.addEventListener('keydown', handleSearchKeydown);
    }
  }

  /**
   * Manejar input de búsqueda
   */
  function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    if (query.length === 0) {
      showDefaultSuggestions();
      return;
    }

    if (query.length < 2) {
      return;
    }

    showSmartSuggestions(query);
  }

  /**
   * Manejar focus en input de búsqueda
   */
  function handleSearchFocus(e) {
    const query = e.target.value.trim();
    
    if (query.length === 0) {
      showDefaultSuggestions();
    } else {
      showSmartSuggestions(query);
    }
  }

  /**
   * Manejar teclas en búsqueda
   */
  function handleSearchKeydown(e) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;

    const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');
    const activeSuggestion = suggestionsContainer.querySelector('.suggestion-item.active');

    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        navigateSuggestions(suggestions, activeSuggestion, 'down');
        break;
      case 'ArrowUp':
        e.preventDefault();
        navigateSuggestions(suggestions, activeSuggestion, 'up');
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestion) {
          activeSuggestion.click();
        } else {
          performSearch(e.target.value.trim());
        }
        break;
      case 'Escape':
        closeSuggestions();
        e.target.blur();
        break;
    }
  }

  /**
   * Navegar entre sugerencias con teclado
   */
  function navigateSuggestions(suggestions, current, direction) {
    if (suggestions.length === 0) return;

    let index = -1;
    if (current) {
      index = Array.from(suggestions).indexOf(current);
      current.classList.remove('active');
    }

    if (direction === 'down') {
      index = (index + 1) % suggestions.length;
    } else {
      index = index <= 0 ? suggestions.length - 1 : index - 1;
    }

    suggestions[index].classList.add('active');
    suggestions[index].scrollIntoView({ block: 'nearest' });
  }

  /**
   * Mostrar sugerencias por defecto (historial + populares)
   */
  function showDefaultSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;

    let html = '<div class="suggestions-wrapper">';

    // Historial de búsquedas
    if (searchState.history.length > 0) {
      html += `
        <div class="suggestion-section">
          <div class="suggestion-header">
            <span>🕐 Búsquedas recientes</span>
            <button class="clear-history" onclick="window.clearSearchHistory()">Limpiar</button>
          </div>
          ${searchState.history.slice(0, 5).map(term => `
            <div class="suggestion-item history-item" onclick="window.performSearch('${escapeHtml(term)}')">
              <span class="suggestion-icon">🕐</span>
              <span class="suggestion-text">${escapeHtml(term)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Búsquedas populares
    html += `
      <div class="suggestion-section">
        <div class="suggestion-header">
          <span>🔥 Búsquedas populares</span>
        </div>
        ${searchState.popularSearches.map(term => `
          <div class="suggestion-item popular-item" onclick="window.performSearch('${escapeHtml(term)}')">
            <span class="suggestion-icon">🔥</span>
            <span class="suggestion-text">${escapeHtml(term)}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Categorías
    const categories = getCategories();
    if (categories.length > 0) {
      html += `
        <div class="suggestion-section">
          <div class="suggestion-header">
            <span>📂 Categorías</span>
          </div>
          ${categories.slice(0, 6).map(cat => `
            <div class="suggestion-item category-item" onclick="window.searchByCategory('${escapeHtml(cat)}')">
              <span class="suggestion-icon">📂</span>
              <span class="suggestion-text">${escapeHtml(cat)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    html += '</div>';

    suggestionsContainer.innerHTML = html;
    suggestionsContainer.style.display = 'block';
  }

  /**
   * Mostrar sugerencias inteligentes basadas en query
   */
  function showSmartSuggestions(query) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;

    if (!window.PRODUCTS || !Array.isArray(window.PRODUCTS)) {
      console.warn('PRODUCTS no disponible');
      return;
    }

    const queryLower = query.toLowerCase();
    
    // Buscar productos que coincidan
    const productMatches = window.PRODUCTS.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(queryLower);
      const categoryMatch = p.category?.toLowerCase().includes(queryLower);
      return nameMatch || categoryMatch;
    }).slice(0, 6);

    // Buscar categorías que coincidan
    const categoryMatches = getCategories().filter(cat => 
      cat.toLowerCase().includes(queryLower)
    ).slice(0, 3);

    if (productMatches.length === 0 && categoryMatches.length === 0) {
      suggestionsContainer.innerHTML = `
        <div class="suggestions-wrapper">
          <div class="no-results">
            <span>😕 No se encontraron resultados para "${escapeHtml(query)}"</span>
          </div>
        </div>
      `;
      suggestionsContainer.style.display = 'block';
      return;
    }

    let html = '<div class="suggestions-wrapper">';

    // Productos coincidentes
    if (productMatches.length > 0) {
      html += `
        <div class="suggestion-section">
          <div class="suggestion-header">
            <span>🎯 Productos (${productMatches.length})</span>
          </div>
          ${productMatches.map(p => `
            <div class="suggestion-item product-item" onclick="window.goToProduct('${p.id}')">
              <img src="${p.img}" alt="${escapeHtml(p.name)}" class="suggestion-img" loading="lazy" onerror="this.src='img/placeholder.png'">
              <div class="suggestion-content">
                <div class="suggestion-name">${highlightMatch(p.name, query)}</div>
                <div class="suggestion-meta">
                  <span class="suggestion-category">${escapeHtml(p.category || 'Sin categoría')}</span>
                  <span class="suggestion-price">$${formatPrice(p.price)}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Categorías coincidentes
    if (categoryMatches.length > 0) {
      html += `
        <div class="suggestion-section">
          <div class="suggestion-header">
            <span>📂 Categorías (${categoryMatches.length})</span>
          </div>
          ${categoryMatches.map(cat => `
            <div class="suggestion-item category-item" onclick="window.searchByCategory('${escapeHtml(cat)}')">
              <span class="suggestion-icon">📂</span>
              <span class="suggestion-text">${highlightMatch(cat, query)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    html += '</div>';

    suggestionsContainer.innerHTML = html;
    suggestionsContainer.style.display = 'block';
  }

  /**
   * Obtener todas las categorías únicas
   */
  function getCategories() {
    if (!window.PRODUCTS || !Array.isArray(window.PRODUCTS)) return [];
    
    const categories = new Set();
    window.PRODUCTS.forEach(p => {
      if (p.category) categories.add(p.category);
    });
    
    return Array.from(categories).sort();
  }

  /**
   * Resaltar coincidencias en texto
   */
  function highlightMatch(text, query) {
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escapeHtml(text).replace(regex, '<strong class="highlight">$1</strong>');
  }

  /**
   * Escapar HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Escapar caracteres especiales de regex
   */
  function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Formatear precio
   */
  function formatPrice(price) {
    return price.toLocaleString('es-CL');
  }

  /**
   * Cerrar sugerencias
   */
  function closeSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (suggestionsContainer) {
      suggestionsContainer.style.display = 'none';
    }
  }

  /**
   * Realizar búsqueda
   */
  function performSearch(query) {
    if (!query || query.trim().length === 0) return;

    // Guardar en historial
    addToSearchHistory(query);

    // Redirigir a catálogo con búsqueda
    window.location.href = `catalogo.html?search=${encodeURIComponent(query)}`;
  }

  /**
   * Buscar por categoría
   */
  function searchByCategory(category) {
    window.location.href = `catalogo.html?category=${encodeURIComponent(category)}`;
  }

  /**
   * Ir a página de producto
   */
  function goToProduct(productId) {
    window.location.href = `producto.html?id=${productId}`;
  }

  /**
   * Agregar término al historial de búsquedas
   */
  function addToSearchHistory(term) {
    // Evitar duplicados
    searchState.history = searchState.history.filter(t => t.toLowerCase() !== term.toLowerCase());
    
    // Agregar al inicio
    searchState.history.unshift(term);
    
    // Limitar a 10 elementos
    searchState.history = searchState.history.slice(0, 10);
    
    // Guardar en localStorage
    localStorage.setItem('searchHistory', JSON.stringify(searchState.history));
  }

  /**
   * Limpiar historial de búsquedas
   */
  function clearSearchHistory() {
    searchState.history = [];
    localStorage.removeItem('searchHistory');
    closeSuggestions();
    
    if (typeof window.showToast === 'function') {
      window.showToast('✅ Historial de búsquedas eliminado');
    }
  }

  /**
   * Exponer funciones globalmente
   */
  window.initAdvancedSearch = initAdvancedSearch;
  window.performSearch = performSearch;
  window.searchByCategory = searchByCategory;
  window.goToProduct = goToProduct;
  window.clearSearchHistory = clearSearchHistory;

  /**
   * Auto-inicializar cuando el DOM esté listo
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdvancedSearch);
  } else {
    initAdvancedSearch();
  }

})();
