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

    // Categorías extraídas

    // Generar HTML
    let optionsHTML = '<div class="select-option" data-category="all">Todas las categorías</div>';
    
    allCategories.forEach(category => {
      optionsHTML += `<div class="select-option" data-category="${escapeHtml(category)}">${escapeHtml(category)}</div>`;
    });

    categoryOptionsContainer.innerHTML = optionsHTML;
    
    // Opciones generadas en el DOM

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

    // Categoría seleccionada

    // Actualizar selección global
    selectedCategoryGlobal = category;
    window.selectedCategory = category; // Exponer globalmente

    // estado global actualizado

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

    // Asegurar estado global y disparar render inmediatamente
    try {
      selectedCategoryGlobal = category;
      window.selectedCategory = category;
      window.currentCategory = category;
    } catch(e){}
    applyGlobalCategoryFilter(category);
    // Disparar evento para notificar el cambio de categoría a otros listeners
    try { window.dispatchEvent(new CustomEvent('categoryChanged', { detail: { category } })); } catch (e) { /* ignore */ }
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
    // Aplicando filtro de categoría (silent)
    
    // Si existe la función renderCatalog en script.js, usarla
    // Mantener sincronía con selects y variable global usada por renderCatalog
    try {
      // Actualizar variable global usada en script.js
      if (typeof window.currentCategory !== 'undefined') {
        window.currentCategory = category || 'all';
      } else {
        window.currentCategory = category || 'all';
      }

      // Sincronizar selects (si existen). Si la opción no existe en el select nativo,
      // la creamos para que la etiqueta quede visible (útil en mobile cuando el select
      // se muestra en vez del dropdown personalizado).
      const syncIds = ['categorySelect', 'headerCategorySelect', 'categorySelectSidebar'];
      syncIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        // Si la opción buscada no existe, crearla (evita que el select muestre vacío)
        const hasOpt = Array.from(el.options || []).some(o => String(o.value) === String(category));
        if (!hasOpt && category && category !== 'all') {
          try {
            const opt = document.createElement('option');
            opt.value = category; opt.textContent = category;
            el.appendChild(opt);
          } catch (e) { /* ignore */ }
        }

        // Asignar valor y disparar change para que listeners respondan
        try {
          el.value = category || 'all';
          const ev = new Event('change', { bubbles: true });
          el.dispatchEvent(ev);
        } catch (e) {
          try { el.value = category || 'all'; } catch(_){}
        }
      });

      // Actualizar URL (persistir categoría)
      try {
        const u = new URL(location.href);
        if (category && category !== 'all') u.searchParams.set('category', category);
        else u.searchParams.delete('category');
        history.replaceState(null, '', u.toString());
      } catch (e) { /* no fatal */ }

      // Mostrar chip activo si la función existe
      if (typeof window.showActiveChip === 'function') {
        window.showActiveChip(category);
      } else {
        // si existe elemento #activeCategoryChip, actualizar directamente
        const chipWrap = document.getElementById('activeCategoryChip');
        if (chipWrap) {
          if (!category || category === 'all') chipWrap.innerHTML = '';
          else chipWrap.innerHTML = `<span class=\"category-chip\">${category} <button class=\"chip-clear\" aria-label=\"Limpiar categoría\">✕</button></span>`;
        }
      }

      // Llamar a renderCatalog con la búsqueda actual
      if (typeof window.renderCatalog === 'function') {
        const searchQuery = document.getElementById('searchInput')?.value || '';
        window.renderCatalog(searchQuery);
      } else {
        console.warn('renderCatalog no está disponible');
      }
    } catch (err) {
      console.warn('Error aplicando filtro global de categoría:', err);
    }
  }

  /**
   * Obtener categoría seleccionada
   */
  function getSelectedCategory() {
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
