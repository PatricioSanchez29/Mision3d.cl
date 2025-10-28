// ==================== WHATSAPP INTEGRATION ====================
// Integración de WhatsApp Business para contacto directo

const WHATSAPP_CONFIG = {
  // Reemplaza con tu número de WhatsApp (código país + número sin espacios ni +)
  // Ejemplo: 56912345678 para Chile
  phoneNumber: '56950503585', // ACTUALIZAR CON TU NÚMERO REAL
  
  // Mensajes predefinidos según contexto
  messages: {
    general: '¡Hola! Me gustaría obtener más información sobre Misión 3D.',
    product: (productName) => `¡Hola! Estoy interesado en: ${productName}`,
    cart: (items, total) => {
      const itemsList = items.map(i => `• ${i.name} (x${i.qty})`).join('%0A');
      return `¡Hola! Quiero consultar sobre mi carrito:%0A${itemsList}%0ATotal: $${total.toLocaleString('es-CL')}`;
    },
    custom: '¡Hola! Necesito un producto personalizado.',
    support: '¡Hola! Necesito ayuda con mi pedido.'
  }
};

// Función para abrir WhatsApp con mensaje
function openWhatsApp(messageType = 'general', data = null) {
  let message = WHATSAPP_CONFIG.messages.general;
  
  if (typeof messageType === 'function') {
    message = messageType(data);
  } else if (typeof WHATSAPP_CONFIG.messages[messageType] === 'function') {
    message = WHATSAPP_CONFIG.messages[messageType](data);
  } else if (WHATSAPP_CONFIG.messages[messageType]) {
    message = WHATSAPP_CONFIG.messages[messageType];
  }
  
  const url = `https://wa.me/${WHATSAPP_CONFIG.phoneNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  
  // Google Analytics tracking
  try {
    if (window.gaEvent) {
      window.gaEvent('whatsapp_click', {
        message_type: messageType,
        phone: WHATSAPP_CONFIG.phoneNumber
      });
    }
  } catch (e) {}
}

// Botón flotante de WhatsApp
function createWhatsAppButton() {
  const button = document.createElement('a');
  button.id = 'whatsapp-float';
  button.href = '#';
  button.className = 'whatsapp-float';
  button.setAttribute('aria-label', 'Contactar por WhatsApp');
  button.innerHTML = `
    <svg viewBox="0 0 32 32" width="32" height="32">
      <path fill="currentColor" d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 7.933-2.127c2.42 1.37 5.173 2.127 8.067 2.127 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.467c-2.482 0-4.908-0.646-7.07-1.87l-0.507-0.292-4.713 1.262 1.262-4.669-0.292-0.508c-1.207-2.100-1.847-4.507-1.847-6.924 0-7.435 6.050-13.485 13.485-13.485s13.485 6.050 13.485 13.485c0 7.435-6.050 13.485-13.485 13.485zM21.960 18.828c-0.206-0.103-1.207-0.596-1.394-0.664s-0.323-0.103-0.459 0.103c-0.137 0.206-0.528 0.664-0.647 0.801s-0.238 0.155-0.444 0.052c-0.206-0.103-0.870-0.321-1.656-1.023-0.613-0.547-1.027-1.223-1.147-1.429s-0.013-0.317 0.090-0.42c0.093-0.092 0.206-0.238 0.309-0.357s0.137-0.206 0.206-0.344c0.068-0.137 0.034-0.258-0.017-0.361s-0.459-1.106-0.630-1.514c-0.167-0.397-0.336-0.343-0.459-0.349-0.119-0.006-0.255-0.007-0.391-0.007s-0.357 0.051-0.544 0.258c-0.187 0.206-0.714 0.698-0.714 1.702s0.731 1.974 0.833 2.112c0.103 0.137 1.449 2.212 3.511 3.103 0.491 0.212 0.874 0.339 1.173 0.434 0.493 0.155 0.941 0.133 1.296 0.081 0.396-0.059 1.207-0.494 1.378-0.970s0.171-0.886 0.120-0.970c-0.052-0.085-0.188-0.137-0.394-0.240z"/>
    </svg>
    <span class="whatsapp-pulse"></span>
  `;
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    openWhatsApp('general');
  });
  
  document.body.appendChild(button);
}

// Inicializar botón flotante cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createWhatsAppButton);
} else {
  createWhatsAppButton();
}

// Exponer funciones globalmente
window.openWhatsApp = openWhatsApp;
window.WHATSAPP_CONFIG = WHATSAPP_CONFIG;

// Estilos CSS para el botón flotante
const whatsappStyles = document.createElement('style');
whatsappStyles.textContent = `
  .whatsapp-float {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: #25D366;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4);
    z-index: 9999;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    color: white;
  }
  
  .whatsapp-float:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(37, 211, 102, 0.6);
  }
  
  .whatsapp-float svg {
    width: 32px;
    height: 32px;
    position: relative;
    z-index: 2;
  }
  
  .whatsapp-pulse {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #25D366;
    opacity: 0.6;
    animation: whatsapp-pulse 2s infinite;
  }
  
  @keyframes whatsapp-pulse {
    0% {
      transform: scale(1);
      opacity: 0.6;
    }
    50% {
      transform: scale(1.2);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .whatsapp-float {
      bottom: 15px;
      right: 15px;
      width: 56px;
      height: 56px;
    }
    
    .whatsapp-float svg {
      width: 28px;
      height: 28px;
    }
  }
  
  /* Tooltip opcional */
  .whatsapp-float::before {
    content: '¿Necesitas ayuda?';
    position: absolute;
    right: 70px;
    background: #fff;
    color: #333;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }
  
  .whatsapp-float:hover::before {
    opacity: 1;
  }
  
  @media (max-width: 768px) {
    .whatsapp-float::before {
      display: none;
    }
  }
`;
document.head.appendChild(whatsappStyles);

console.log('✅ WhatsApp Business integrado - Botón flotante activo');
