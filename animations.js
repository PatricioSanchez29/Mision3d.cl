// ========== ANIMACIONES DE SCROLL ==========

// Intersection Observer para animaciones al hacer scroll
const observeElements = () => {
  const animatedElements = document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right, .scale-in');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Desconectar después de animar para mejor performance
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  animatedElements.forEach(el => observer.observe(el));
};

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeElements);
} else {
  observeElements();
}

// ========== ANIMACIÓN CARRITO ==========

// Animar el botón del carrito cuando se agrega un producto
const animateCartButton = () => {
  const cartBtn = document.getElementById('openCart');
  if (cartBtn) {
    cartBtn.classList.add('cart-bounce');
    setTimeout(() => {
      cartBtn.classList.remove('cart-bounce');
    }, 500);
  }
};

// Animar el botón de favoritos
const animateWishlistButton = () => {
  const wishBtn = document.getElementById('wishlistBtn');
  if (wishBtn) {
    wishBtn.classList.add('heart-beat');
    setTimeout(() => {
      wishBtn.classList.remove('heart-beat');
    }, 600);
  }
};

// Exponer funciones globalmente para uso en otros scripts
window.animateCartButton = animateCartButton;
window.animateWishlistButton = animateWishlistButton;

// ========== SKELETON LOADERS ==========
// Evitar colisiones si ya existen en otros archivos (p.ej. ui-components.js)
(() => {
  // Crear skeleton loader para tarjetas de productos (scope local, no global)
  const _createSkeletonCard = () => {
    return `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
        <div class="skeleton skeleton-price"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    `;
  };

  // Mostrar skeletons mientras cargan los productos
  const _showSkeletonLoaders = (containerId, count = 6) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const skeletonHTML = Array(count).fill(_createSkeletonCard()).join('');
    container.innerHTML = skeletonHTML;
  };

  // Exponer globalmente SOLO si no existe
  if (!window.showSkeletonLoaders) {
    window.showSkeletonLoaders = _showSkeletonLoaders;
  }
})();

// ========== EFECTO PARALLAX SUAVE EN HERO ==========

let lastScrollY = window.scrollY;
let ticking = false;

const updateParallax = () => {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const scrolled = window.scrollY;
  const heroHeight = hero.offsetHeight;
  
  if (scrolled < heroHeight) {
    const opacity = 1 - (scrolled / heroHeight) * 0.5;
    const translateY = scrolled * 0.3;
    
    hero.style.opacity = opacity;
    const heroContent = hero.querySelector('.hero-content');
    if (heroContent) {
      heroContent.style.transform = `translateY(${translateY}px)`;
    }
  }
  
  ticking = false;
};

const onScroll = () => {
  lastScrollY = window.scrollY;
  
  if (!ticking) {
    window.requestAnimationFrame(updateParallax);
    ticking = true;
  }
};

// Activar parallax solo en desktop
if (window.innerWidth > 768) {
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ========== SMOOTH SCROLL PARA NAVEGACIÓN ==========

const smoothScrollToSection = (targetId) => {
  const target = document.getElementById(targetId);
  if (!target) return;
  
  const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
  const targetPosition = target.offsetTop - headerHeight - 20;
  
  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
};

// Agregar smooth scroll a los enlaces de navegación
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav a[href^="#"]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href !== '#') {
        e.preventDefault();
        const targetId = href.substring(1);
        smoothScrollToSection(targetId);
      }
    });
  });
});

// ========== ANIMACIÓN DE NÚMEROS (CONTADOR) ==========

const animateCounter = (element, target, duration = 1000) => {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current);
  }, 16);
};

window.animateCounter = animateCounter;

// ========== EFECTO RIPPLE EN BOTONES ==========

const createRipple = (event) => {
  const button = event.currentTarget;
  
  // Solo en botones que quieran el efecto
  if (!button.classList.contains('ripple')) return;
  
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('ripple-effect');
  
  button.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
};

// Agregar efecto ripple a botones
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.btn, .add, .search-btn');
  buttons.forEach(button => {
    button.classList.add('ripple');
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.addEventListener('click', createRipple);
  });
});

// CSS para el efecto ripple (agregar dinámicamente)
const rippleStyles = `
  .ripple-effect {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s ease-out;
    pointer-events: none;
  }
  
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = rippleStyles;
document.head.appendChild(styleSheet);

console.log('✨ Animations.js cargado - Mejoras visuales activas');
