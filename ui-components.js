/**
 * Componentes UI y utilidades UX - Misión 3D
 * Loading spinners, toast notifications, animaciones
 */

// ==================== LOADING SPINNER ====================
function showLoading(message = 'Cargando...') {
  // Remover loading previo si existe
  hideLoading();
  
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'loadingOverlay';
  loadingOverlay.className = 'loading-overlay';
  loadingOverlay.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p class="loading-message">${message}</p>
    </div>
  `;
  
  document.body.appendChild(loadingOverlay);
  
  // Agregar clase para animación de entrada
  setTimeout(() => {
    loadingOverlay.classList.add('active');
  }, 10);
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}

// ==================== TOAST NOTIFICATIONS ====================
const toastQueue = [];
let isShowingToast = false;

function showToast(message, type = 'success', duration = 3000) {
  toastQueue.push({ message, type, duration });
  processToastQueue();
}

function processToastQueue() {
  if (isShowingToast || toastQueue.length === 0) return;
  
  isShowingToast = true;
  const { message, type, duration } = toastQueue.shift();
  
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  
  // Iconos según tipo
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  document.body.appendChild(toast);
  
  // Animación de entrada
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto-cerrar
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
      isShowingToast = false;
      processToastQueue();
    }, 300);
  }, duration);
}

// ==================== SKELETON LOADERS ====================
function createSkeletonCard() {
  return `
    <div class="card skeleton-card">
      <div class="skeleton skeleton-image"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-price"></div>
      <div class="skeleton skeleton-button"></div>
    </div>
  `;
}

function showSkeletonLoaders(containerId, count = 8) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    container.innerHTML += createSkeletonCard();
  }
}

// ==================== BUTTON LOADING STATE ====================
function setButtonLoading(button, loading = true, originalText = null) {
  if (!button) return;
  
  if (loading) {
    // Guardar texto original
    button.dataset.originalText = originalText || button.textContent;
    button.disabled = true;
    button.classList.add('btn-loading');
    button.innerHTML = `
      <span class="btn-spinner"></span>
      <span>${button.dataset.loadingText || 'Procesando...'}</span>
    `;
  } else {
    // Restaurar estado original
    button.disabled = false;
    button.classList.remove('btn-loading');
    button.textContent = button.dataset.originalText || originalText || 'Confirmar';
  }
}

// ==================== PROGRESS BAR ====================
function updateProgressBar(step) {
  const progressBar = document.getElementById('checkoutProgress');
  if (!progressBar) return;
  
  const steps = {
    cart: 0,
    info: 33,
    payment: 66,
    confirmation: 100
  };
  
  const percentage = steps[step] || 0;
  const fill = progressBar.querySelector('.progress-fill');
  if (fill) {
    fill.style.width = `${percentage}%`;
  }
  
  // Actualizar indicadores de paso
  document.querySelectorAll('.progress-step').forEach((stepEl, index) => {
    const stepValue = Object.keys(steps)[index];
    if (steps[stepValue] <= percentage) {
      stepEl.classList.add('completed');
    } else {
      stepEl.classList.remove('completed');
    }
  });
}

// ==================== ANIMACIONES DE ENTRADA ====================
function animateOnScroll() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, {
    threshold: 0.1
  });
  
  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
  });
}

// ==================== SMOOTH SCROLL ====================
function smoothScrollTo(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ==================== CONFIRMACIÓN MODAL ====================
function showConfirmDialog(message, onConfirm, onCancel = null) {
  const modal = document.createElement('div');
  modal.className = 'confirm-modal-overlay';
  modal.innerHTML = `
    <div class="confirm-modal">
      <div class="confirm-icon">⚠️</div>
      <p class="confirm-message">${message}</p>
      <div class="confirm-actions">
        <button class="btn outline" id="confirmCancel">Cancelar</button>
        <button class="btn primary" id="confirmOk">Confirmar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => modal.classList.add('active'), 10);
  
  document.getElementById('confirmOk').addEventListener('click', () => {
    modal.remove();
    if (onConfirm) onConfirm();
  });
  
  document.getElementById('confirmCancel').addEventListener('click', () => {
    modal.remove();
    if (onCancel) onCancel();
  });
}

// ==================== RIPPLE EFFECT ====================
function addRippleEffect(button) {
  button.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    this.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  });
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
  // Agregar ripple effect a botones
  document.querySelectorAll('.btn, button').forEach(btn => {
    if (!btn.classList.contains('no-ripple')) {
      addRippleEffect(btn);
    }
  });
  
  // Inicializar animaciones on scroll
  if (typeof IntersectionObserver !== 'undefined') {
    animateOnScroll();
  }
});

// Exportar funciones globalmente
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showToast = showToast;
window.showSkeletonLoaders = showSkeletonLoaders;
window.setButtonLoading = setButtonLoading;
window.updateProgressBar = updateProgressBar;
window.smoothScrollTo = smoothScrollTo;
window.showConfirmDialog = showConfirmDialog;
