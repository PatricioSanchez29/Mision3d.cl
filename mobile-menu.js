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
          <a href="login.html" id="drawerUserLink">
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

    // Verificar si hay usuario logueado
    const currentUser = localStorage.getItem('currentUser');
    
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser);
        const userName = userData.nombre || userData.email?.split('@')[0] || 'Usuario';
        
        // Actualizar texto y enlace
        drawerUserText.textContent = userName;
        drawerUserLink.href = 'login.html'; // Ir a login donde puede ver perfil/cerrar sesión
      } catch (e) {
        // Si hay error, mostrar opción de login
        drawerUserText.textContent = 'Iniciar Sesión';
        drawerUserLink.href = 'login.html';
      }
    } else {
      // No hay sesión, mostrar login
      drawerUserText.textContent = 'Iniciar Sesión';
      drawerUserLink.href = 'login.html';
    }
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
