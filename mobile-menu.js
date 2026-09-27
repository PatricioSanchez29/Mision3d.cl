/**
 * MENÚ HAMBURGUESA MÓVIL 🍔
 * Sistema completo de navegación lateral (drawer)
 * con animaciones suaves y overlay oscuro
 */

(function() {
  'use strict';

  // Estado del menú
  let isMenuOpen = false;

  /**
   * Inicializar menú hamburguesa
   */
  function initMobileMenu() {
    // Crear estructura del drawer si no existe
    if (!document.querySelector('.mobile-drawer')) {
      createDrawerStructure();
    }

    // Crear barra de navegación inferior móvil si no existe
    if (!document.querySelector('.mobile-bottom-nav')) {
      createBottomNavStructure();
    }

    // Referencias DOM
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const drawer = document.querySelector('.mobile-drawer');
    const overlay = document.querySelector('.mobile-menu-overlay');
    const drawerClose = document.querySelector('.drawer-close');

    if (!hamburgerBtn || !drawer || !overlay) {
      console.warn('Mobile menu: Elementos no encontrados');
      return;
    }

    // Event listeners
    hamburgerBtn.addEventListener('click', toggleMenu);
    drawerClose.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isMenuOpen) {
        closeMenu();
      }
    });

    // Prevenir scroll del body cuando el menú está abierto
    drawer.addEventListener('touchmove', (e) => {
      e.stopPropagation();
    }, { passive: false });

    // Cerrar menú al hacer click en un link (excepto enlaces de navegación)
    const drawerLinks = drawer.querySelectorAll('.drawer-nav a');
    drawerLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        // Si es un enlace de navegación a otra página, cerrar sin delay
        if (href && (href.startsWith('#') || href.includes('#'))) {
          // Solo para anclas internas, cerrar con delay
          setTimeout(closeMenu, 150);
        } else {
          // Para navegación a otras páginas, cerrar inmediatamente
          closeMenu();
        }
      });
    });

    // Marcar link activo según página actual
    highlightActiveLink();
    
    // Actualizar estado del usuario
    updateUserLink();

    // Mantener controles del header dentro del viewport en mobile
    fixMobileHeaderLayout();
    window.addEventListener('resize', fixMobileHeaderLayout);
  }

  function fixMobileHeaderLayout() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const cartBtn = document.getElementById('openCart');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    if (!isMobile) {
      if (cartBtn) cartBtn.removeAttribute('style');
      if (hamburgerBtn) {
        hamburgerBtn.style.left = '';
        hamburgerBtn.style.right = '';
        hamburgerBtn.style.top = '';
        hamburgerBtn.style.transform = '';
      }
      return;
    }

    if (hamburgerBtn) {
      hamburgerBtn.style.position = 'absolute';
      hamburgerBtn.style.left = '14px';
      hamburgerBtn.style.right = 'auto';
      hamburgerBtn.style.top = '16px';
      hamburgerBtn.style.transform = 'none';
    }

    if (cartBtn) {
      cartBtn.style.position = 'fixed';
      cartBtn.style.top = '16px';
      cartBtn.style.right = '14px';
      cartBtn.style.left = 'auto';
      cartBtn.style.transform = 'none';
      cartBtn.style.width = '54px';
      cartBtn.style.minWidth = '54px';
      cartBtn.style.maxWidth = '54px';
      cartBtn.style.height = '40px';
      cartBtn.style.padding = '0';
      cartBtn.style.display = 'inline-flex';
      cartBtn.style.alignItems = 'center';
      cartBtn.style.justifyContent = 'center';
      cartBtn.style.zIndex = '15020';
    }
  }

  /**
   * Crear estructura HTML del drawer
   */
  function createDrawerStructure() {
    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';
    document.body.appendChild(overlay);

    // Drawer
    const drawer = document.createElement('div');
    drawer.className = 'mobile-drawer';
    
    drawer.innerHTML = `
      <div class="drawer-header">
        <h3>🎨 Misión3D</h3>
        <button class="drawer-close" aria-label="Cerrar menú">×</button>
      </div>

      <div class="drawer-content">
        <nav class="drawer-nav">
          <a href="index.html">
            <span class="icon">🏠</span>
            <span>Inicio</span>
          </a>
          <a href="catalogo.html">
            <span class="icon">📦</span>
            <span>Catálogo</span>
          </a>
          <a href="index.html#nosotros">
            <span class="icon">ℹ️</span>
            <span>Nosotros</span>
          </a>
          <a href="index.html#contacto">
            <span class="icon">📧</span>
            <span>Contacto</span>
          </a>
          <a href="mi-cuenta.html" id="drawerUserLink" style="position:relative;">
            <span class="icon">👤</span>
            <span id="drawerUserText">Iniciar Sesión</span>
          </a>
       </nav>
      </div>
    `;

    document.body.appendChild(drawer);
  }

  /**
   * Abrir/Cerrar menú (toggle)
   */
  function toggleMenu() {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  /**
   * Abrir menú
   */
  function openMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const drawer = document.querySelector('.mobile-drawer');
    const overlay = document.querySelector('.mobile-menu-overlay');

    if (!drawer || !overlay) return;

    isMenuOpen = true;

    // Agregar clases activas
    hamburgerBtn?.classList.add('active');
    drawer.classList.add('active');
    overlay.classList.add('active');

    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';

    // Animar entrada de links (efecto cascada)
    const links = drawer.querySelectorAll('.drawer-nav a');
    links.forEach((link, index) => {
      link.style.opacity = '0';
      link.style.transform = 'translateX(-20px)';
      setTimeout(() => {
        link.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        link.style.opacity = '1';
        link.style.transform = 'translateX(0)';
      }, 100 + (index * 50));
    });
  }

  /**
   * Cerrar menú
   */
  function closeMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const drawer = document.querySelector('.mobile-drawer');
    const overlay = document.querySelector('.mobile-menu-overlay');

    if (!drawer || !overlay) return;

    isMenuOpen = false;

    // Remover clases activas
    hamburgerBtn?.classList.remove('active');
    drawer.classList.remove('active');
    overlay.classList.remove('active');

    // Restaurar scroll del body
    document.body.style.overflow = '';
  }

  /**
   * Marcar link activo según página actual
   */
  function highlightActiveLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.drawer-nav a');

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(currentPage)) {
        link.classList.add('active');
      }
    });
  }

  /**
   * Actualizar enlace de usuario según estado de sesión
   */
  function updateUserLink() {
    const drawerUserLink = document.getElementById('drawerUserLink');
    const drawerUserText = document.getElementById('drawerUserText');
    if (!drawerUserLink || !drawerUserText) return;

    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser);
        const userName = userData.nombre || userData.email?.split('@')[0] || 'Usuario';
        drawerUserText.textContent = userName;
        drawerUserLink.href = 'mi-cuenta.html';
      } catch (e) {
        drawerUserText.textContent = 'Iniciar Sesión';
        drawerUserLink.href = 'mi-cuenta.html';
      }
    } else {
      drawerUserText.textContent = 'Iniciar Sesión';
      drawerUserLink.href = 'mi-cuenta.html';
    }
  }

  /**
   * Crear estructura HTML de la barra de navegación inferior móvil
   */
  function createBottomNavStructure() {
    const rawPath = window.location.pathname.split('/').pop() || 'index.html';
    const currentPage = rawPath.toLowerCase();

    // No mostrar la barra de navegación inferior en checkout, confirmaciones o panel admin
    const isExcludedPage = currentPage.includes('checkout') || 
                           currentPage.includes('confirmacion') || 
                           currentPage.includes('admin') || 
                           currentPage.includes('dashboard');
    if (isExcludedPage) {
      return;
    }

    const bottomNav = document.createElement('nav');
    bottomNav.className = 'mobile-bottom-nav';
    bottomNav.setAttribute('aria-label', 'Navegación inferior móvil');

    const isHome = currentPage === '' || currentPage === 'index.html';
    const isCatalog = currentPage.includes('catalogo');
    const isQuote = currentPage.includes('cotizar');
    const isFav = currentPage.includes('favoritos');

    bottomNav.innerHTML = `
      <a href="index.html" class="bottom-nav-item ${isHome ? 'active' : ''}">
        <div class="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span class="bottom-nav-label">Inicio</span>
      </a>
      <a href="catalogo.html" class="bottom-nav-item ${isCatalog ? 'active' : ''}">
        <div class="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="7" height="7" x="3" y="3" rx="1"/>
            <rect width="7" height="7" x="14" y="3" rx="1"/>
            <rect width="7" height="7" x="14" y="14" rx="1"/>
            <rect width="7" height="7" x="3" y="14" rx="1"/>
          </svg>
        </div>
        <span class="bottom-nav-label">Catálogo</span>
      </a>
      <a href="cotizar.html" class="bottom-nav-item ${isQuote ? 'active' : ''}">
        <div class="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <span class="bottom-nav-label">Cotizar</span>
      </a>
      <a href="favoritos.html" class="bottom-nav-item ${isFav ? 'active' : ''}">
        <div class="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
          <span class="bottom-nav-badge" id="bottomNavWishlistBadge" style="display:none">0</span>
        </div>
        <span class="bottom-nav-label">Favoritos</span>
      </a>
      <button type="button" class="bottom-nav-item" id="bottomNavCartBtn" aria-label="Abrir carrito">
        <div class="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="21" r="1"/>
            <circle cx="19" cy="21" r="1"/>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
          </svg>
          <span class="bottom-nav-badge" id="bottomNavCartBadge" style="display:none">0</span>
        </div>
        <span class="bottom-nav-label">Carrito</span>
      </button>
    `;

    document.body.appendChild(bottomNav);

    // Event listener para el botón de carrito
    const cartBtn = bottomNav.querySelector('#bottomNavCartBtn');
    if (cartBtn) {
      cartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.openCart === 'function') {
          window.openCart();
        } else {
          const headerCart = document.getElementById('openCart');
          if (headerCart) headerCart.click();
        }
      });
    }

    // Inicializar sincronización de contadores
    syncBottomNavBadges();
    setupCartCountObserver();
  }

  /**
   * Sincronizar badges de carrito y favoritos en la barra inferior
   */
  function syncBottomNavBadges() {
    const cartBadge = document.getElementById('bottomNavCartBadge');
    if (cartBadge) {
      try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const count = Array.isArray(cart) ? cart.reduce((total, item) => total + (Number(item.qty) || 1), 0) : 0;
        cartBadge.textContent = count > 99 ? '99+' : count;
        cartBadge.style.display = count > 0 ? 'flex' : 'none';
      } catch (e) {
        cartBadge.style.display = 'none';
      }
    }

    const wishBadge = document.getElementById('bottomNavWishlistBadge');
    if (wishBadge) {
      try {
        const wishlist = JSON.parse(localStorage.getItem('wishlist') || localStorage.getItem('mision3d_wishlist') || '[]');
        const count = Array.isArray(wishlist) ? wishlist.length : 0;
        wishBadge.textContent = count > 99 ? '99+' : count;
        wishBadge.style.display = count > 0 ? 'flex' : 'none';
      } catch (e) {
        wishBadge.style.display = 'none';
      }
    }
  }

  /**
   * Observar cambios en el carrito
   */
  function setupCartCountObserver() {
    window.addEventListener('storage', syncBottomNavBadges);

    const headerCartCount = document.getElementById('cartCount');
    if (headerCartCount && window.MutationObserver) {
      const observer = new MutationObserver(() => {
        syncBottomNavBadges();
      });
      observer.observe(headerCartCount, { childList: true, characterData: true, subtree: true });
    }

    // Intervalo de seguridad ligero para mantener consistencia
    setInterval(syncBottomNavBadges, 1500);
  }

  /**
   * Exponer funciones globalmente
   */
  window.initMobileMenu = initMobileMenu;
  window.toggleMenu = toggleMenu;
  window.closeMenu = closeMenu;
  window.openMenu = openMenu;

  /**
   * Auto-inicializar cuando el DOM esté listo
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
  } else {
    initMobileMenu();
  }

})();
