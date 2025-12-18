// ==================== SOCIAL MEDIA INTEGRATION ====================
// Links de redes sociales de Misión 3D

const SOCIAL_CONFIG = {
  instagram: {
    url: 'https://www.instagram.com/mision3d.cl', // ACTUALIZAR con tu usuario real
    username: '@mision3d.cl',
    enabled: true
  },
  facebook: {
    url: 'https://www.facebook.com/mision3d.cl', // ACTUALIZAR
    enabled: false // activar cuando tengas página
  },
  tiktok: {
    url: 'https://www.tiktok.com/@mision3d.cl', // ACTUALIZAR
    username: '@mision3d.cl',
    enabled: false
  },
  youtube: {
    url: 'https://www.youtube.com/@mision3d', // ACTUALIZAR
    enabled: false
  }
};

// Crear widget de redes sociales
function createSocialWidget() {
  const widget = document.createElement('div');
  widget.className = 'social-widget';
  
  let socialHTML = '<div class="social-title">Síguenos</div><div class="social-links">';
  
  if (SOCIAL_CONFIG.instagram.enabled) {
    socialHTML += `
      <a href="${SOCIAL_CONFIG.instagram.url}" target="_blank" rel="noopener" class="social-link instagram" aria-label="Instagram">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      </a>
    `;
  }
  
  if (SOCIAL_CONFIG.facebook.enabled) {
    socialHTML += `
      <a href="${SOCIAL_CONFIG.facebook.url}" target="_blank" rel="noopener" class="social-link facebook" aria-label="Facebook">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </a>
    `;
  }
  
  if (SOCIAL_CONFIG.tiktok.enabled) {
    socialHTML += `
      <a href="${SOCIAL_CONFIG.tiktok.url}" target="_blank" rel="noopener" class="social-link tiktok" aria-label="TikTok">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      </a>
    `;
  }
  
  socialHTML += '</div>';
  widget.innerHTML = socialHTML;
  
  return widget;
}

// Agregar widget al footer o header
function injectSocialWidget() {
  // Buscar un lugar apropiado (puedes cambiar el selector)
  const footerContact = document.querySelector('.footer .footer-section:nth-child(2)');
  
  if (footerContact) {
    const widget = createSocialWidget();
    footerContact.appendChild(widget);
  }
}

// Estilos
const socialStyles = document.createElement('style');
socialStyles.textContent = `
  .social-widget {
    margin-top: 20px;
  }
  
  .social-title {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 12px;
    color: #0052cc;
  }
  
  .social-links {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .social-link {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    text-decoration: none;
    position: relative;
    overflow: hidden;
  }
  
  .social-link::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: currentColor;
    opacity: 0.1;
    border-radius: 50%;
    transition: transform 0.3s ease;
    transform: scale(0);
  }
  
  .social-link:hover::before {
    transform: scale(1);
  }
  
  .social-link svg {
    position: relative;
    z-index: 1;
  }
  
  .social-link.instagram {
    color: #E4405F;
  }
  
  .social-link.facebook {
    color: #1877F2;
  }
  
  .social-link.tiktok {
    color: #000000;
  }
  
  .social-link.youtube {
    color: #FF0000;
  }
  
  .social-link:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
`;
document.head.appendChild(socialStyles);

// Inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectSocialWidget);
} else {
  injectSocialWidget();
}

// Exponer configuración
window.SOCIAL_CONFIG = SOCIAL_CONFIG;

console.log('✅ Redes sociales integradas');
