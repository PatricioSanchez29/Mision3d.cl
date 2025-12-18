// Config de backend compartida para todo el frontend
(() => {
  try {
    if (!window.API_BASE_URL) {
      const isLocal = /localhost|127\.0\.0\.1/.test(location.hostname);
      window.API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://api.mision3d.cl';
      // console.debug('[config] API_BASE_URL =', window.API_BASE_URL);
    }
    // Health-check en local desactivado para evitar CORS desde 127.0.0.1 -> producción.
    // Si el backend local no está levantado, los endpoints fallarán (y es esperado
    // mientras desarrollas front). Inicia el backend para evitar ERR_CONNECTION_REFUSED.
  } catch {}
})();

// Actualiza el menú de usuario del header según el estado de sesión de Supabase
import { supabase } from './supabase-orders.js';

function setupDropdownToggle(btn, content) {
  if (!btn || !content) return;
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', function () {
    content.style.display = 'none';
  });
}

function renderLoggedOut(container) {
  if (!container) return;
  container.innerHTML = `
    <a href="login.html" style="display:block;padding:8px 18px;color:#222;text-decoration:none;">Ingresar</a>
    <a href="register.html" style="display:block;padding:8px 18px;color:#222;text-decoration:none;">Crear cuenta</a>
  `;
}

function renderLoggedIn(container) {
  if (!container) return;
  container.innerHTML = `
    <a href="mi-cuenta.html" style="display:block;padding:8px 18px;color:#222;text-decoration:none;">Ir a Mi cuenta</a>
    <a href="mi-cuenta.html#details" style="display:block;padding:8px 18px;color:#222;text-decoration:none;">Editar mis detalles</a>
    <a href="#" id="logoutLink" style="display:block;padding:8px 18px;color:#e11d48;text-decoration:none;">Cerrar sesión</a>
  `;
  const logout = container.querySelector('#logoutLink');
  if (logout) {
    logout.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await supabase.auth.signOut(); } catch {}
      try { localStorage.removeItem('userSession'); } catch {}
      window.location.href = 'index.html';
    });
  }
}

async function initHeaderAuth() {
  // Caso 1: Dropdown del header (index.html)
  const dropdownContent = document.getElementById('loginDropdownContent');
  const dropdownBtn = document.getElementById('loginDropdownBtn');
  if (dropdownBtn && dropdownContent) {
    setupDropdownToggle(dropdownBtn, dropdownContent);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) renderLoggedIn(dropdownContent); else renderLoggedOut(dropdownContent);
    } catch {
      renderLoggedOut(dropdownContent);
    }
  }

  // Caso 2: Header simple con enlace (mi-cuenta.html u otras)
  const loginLink = document.getElementById('loginLink');
  if (loginLink) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        loginLink.href = 'mi-cuenta.html';
        const label = loginLink.querySelector('.label');
        if (label) label.textContent = 'MI CUENTA';
      } else {
        loginLink.href = 'login.html';
        const label = loginLink.querySelector('.label');
        if (label) label.textContent = 'INGRESAR';
      }
    } catch {
      // si falla, mantener login
      loginLink.href = 'login.html';
    }
  }
}

document.addEventListener('DOMContentLoaded', initHeaderAuth);
