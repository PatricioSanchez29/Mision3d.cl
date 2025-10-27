/**
 * DROPDOWN DE CATEGORÍAS 📂
 * Sistema de filtrado por categorías con búsqueda integrada
 */

(function() {
  'use strict';

  let selectedCategoryGlobal = 'all';
  let allCategories = [];

  /**
   * Inicializar dropdown de categorías
   */
  function initCategoryDropdown() {
    const customSelect = document.getElementById('categorySelect');
    const selectTrigger = customSelect?.querySelector('.select-trigger');
    const categorySearchInput = document.getElementById('categorySearchInput');

    if (!customSelect || !selectTrigger) {
      console.warn('Category dropdown: Elementos no encontrados');
      return;
    }

    // Generar opciones de categorías
    buildCategoryOptions();

    // Toggle dropdown
    selectTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const wasActive = customSelect.classList.contains('active');
      customSelect.classList.toggle('active');
      
      if (!wasActive && customSelect.classList.contains('active')) {
        categorySearchInput?.focus();
      }
    });

    // Cerrar dropdown al hacer click fuera
    document.addEventListener('click', (e) => {
      if (!customSelect.contains(e.target) && customSelect.classList.contains('active')) {
        customSelect.classList.remove('active');
      }
    });

    // Búsqueda en el dropdown
    categorySearchInput?.addEventListener('input', (e) => {
      filterCategoryOptions(e.target.value);
    });

    // Escuchar cuando los productos estén listos
    document.addEventListener('productsReady', () => {
      buildCategoryOptions();
    });

    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && customSelect.classList.contains('active')) {
        customSelect.classList.remove('active');
      }
    });
  }

  /**
   * Construir opciones de categorías desde PRODUCTS
   */
  function buildCategoryOptions() {
    const categoryOptionsContainer = document.getElementById('categoryOptions');
    if (!categoryOptionsContainer) return;

    const products = window.PRODUCTS || [];
    if (!products.length) {
      console.warn('No hay productos disponibles para generar categorías');
      return;
    }

    // Extraer categorías únicas
    const categoriesSet = new Set();
    products.forEach(product => {
      if (product.category) {
        // Separar por coma si hay múltiples categorías
        const cats = product.category.split(',').map(c => c.trim());
        cats.forEach(cat => {
          if (cat) categoriesSet.add(cat);
        });
      }
    });

    allCategories = Array.from(categoriesSet).sort((a, b) => 
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );

    console.log('📋 Categorías encontradas:', allCategories.length, allCategories);

    // Generar HTML
    let optionsHTML = '<div class="select-option" data-category="all">Todas las categorías</div>';
    
    allCategories.forEach(category => {
      optionsHTML += `<div class="select-option" data-category="${escapeHtml(category)}">${escapeHtml(category)}</div>`;
    });

    categoryOptionsContainer.innerHTML = optionsHTML;
    
    console.log('✅ Opciones de categoría generadas en el DOM');

    // Agregar event listeners a las opciones
    const options = categoryOptionsContainer.querySelectorAll('.select-option');
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectCategory(option);
      });
    });

    // Marcar la opción seleccionada actual
    updateSelectedOption();
  }

  /**
   * Seleccionar una categoría
   */
  function selectCategory(optionElement) {
    const category = optionElement.dataset.category;
    const customSelect = document.getElementById('categorySelect');
    const selectedCategorySpan = document.getElementById('selectedCategory');

    console.log('✅ Categoría seleccionada:', category);

    // Actualizar selección global
    selectedCategoryGlobal = category;
    window.selectedCategory = category; // Exponer globalmente

    console.log('🌍 selectedCategoryGlobal actualizado a:', selectedCategoryGlobal);
    console.log('🌍 window.selectedCategory actualizado a:', window.selectedCategory);

    // Actualizar UI
    selectedCategorySpan.textContent = optionElement.textContent;

    // Cerrar dropdown
    customSelect?.classList.remove('active');

    // Limpiar búsqueda
    const searchInput = document.getElementById('categorySearchInput');
    if (searchInput) {
      searchInput.value = '';
      filterCategoryOptions(''); // Mostrar todas las opciones
    }

    // Marcar opción seleccionada
    updateSelectedOption();

    // Aplicar filtro
    applyGlobalCategoryFilter(category);
  }

  /**
   * Actualizar opción seleccionada visualmente
   */
  function updateSelectedOption() {
    const options = document.querySelectorAll('.select-option');
    options.forEach(opt => {
      if (opt.dataset.category === selectedCategoryGlobal) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });
  }

  /**
   * Filtrar opciones por búsqueda
   */
  function filterCategoryOptions(searchTerm) {
    const options = document.querySelectorAll('.select-option');
    const term = searchTerm.toLowerCase().trim();

    options.forEach(option => {
      const text = option.textContent.toLowerCase();
      if (text.includes(term)) {
        option.classList.remove('hidden');
      } else {
        option.classList.add('hidden');
      }
    });
  }

  /**
   * Aplicar filtro de categoría global
   */
  function applyGlobalCategoryFilter(category) {
    console.log('🔍 Aplicando filtro de categoría:', category);
    
    // Si existe la función renderCatalog en script.js, usarla
    if (typeof window.renderCatalog === 'function') {
      const searchQuery = document.getElementById('searchInput')?.value || '';
      console.log('📋 Renderizando catálogo con categoría:', category, 'búsqueda:', searchQuery);
      window.renderCatalog(searchQuery);
    } else {
      console.warn('renderCatalog no está disponible');
    }
  }

  /**
   * Obtener categoría seleccionada
   */
  function getSelectedCategory() {
    console.log('📂 getSelectedCategory llamado, devolviendo:', selectedCategoryGlobal);
    return selectedCategoryGlobal;
  }

  /**
   * Resetear categoría a "Todas"
   */
  function resetCategory() {
    const allOption = document.querySelector('.select-option[data-category="all"]');
    if (allOption) {
      selectCategory(allOption);
    }
  }

  /**
   * Escape HTML para prevenir XSS
   */
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Exponer funciones globalmente
   */
  window.initCategoryDropdown = initCategoryDropdown;
  window.getSelectedCategory = getSelectedCategory;
  window.resetCategory = resetCategory;
  window.buildCategoryOptions = buildCategoryOptions;

  /**
   * Auto-inicializar cuando el DOM esté listo
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCategoryDropdown);
  } else {
    initCategoryDropdown();
  }

})();
