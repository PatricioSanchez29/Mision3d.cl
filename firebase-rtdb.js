/*
Misión3D — Integración con Firebase Realtime Database (RTDB)
Archivo JS válido (módulo) para importar desde tus páginas:
  <script type="module" src="firebase-rtdb.js"></script>
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, get, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// ⚙️ Configuración mínima (puedes agregar apiKey/projectId más tarde si lo deseas)
const firebaseConfig = {
  databaseURL: "https://mision3d-72b4a-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// Helper: solo log en desarrollo (localhost)
const isDev = /localhost|127\.0\.0\.1/.test(location.hostname);
const devLog = (...args) => { if (isDev) console.log(...args); };
const devWarn = (...args) => { if (isDev) console.warn(...args); };

// Utilidad: intenta leer carrito del localStorage
function getCartSafe() {
  try { return JSON.parse(localStorage.getItem("cart") || "[]"); }
  catch { return []; }
}

// 🧾 Cargar productos desde RTDB y notificar a la UI
async function loadProductsFromRTDB() {
  try {
    devLog("[Firebase] Cargando productos desde RTDB...");
    const snap = await get(ref(db, "productos"));
    if (snap.exists()) {
      const data = snap.val();
      // {id:{...}} -> [{id,...}]
      window.PRODUCTS = Object.entries(data).map(([id, p]) => ({ id, ...p }));
      
      // IMPORTANTE: Actualizar localStorage para sincronizar con Firebase
      localStorage.setItem('PRODUCTS', JSON.stringify(window.PRODUCTS));
      
      devLog("✅ [Firebase] Productos cargados y sincronizados:", window.PRODUCTS.length);
    } else {
      devWarn("⚠️ [Firebase] No hay productos en la base de datos");
      // Si no hay productos en Firebase, limpiar localStorage
      localStorage.removeItem('PRODUCTS');
    }
  } catch (err) {
    console.error("❌ [Firebase] Error cargando productos:", err);
    devWarn("[RTDB] No se pudieron cargar productos:", err);
  }

  // Si existe, vuelve a renderizar catálogo/listados
  if (typeof window.renderCatalog === "function") {
    try { window.renderCatalog(""); } catch {}
  }

  // Lanza un evento por si quieres enganchar lógica extra
  document.dispatchEvent(new CustomEvent("productsReady", { detail: { ok: !!window.PRODUCTS } }));
}

// 📨 Guardar pedido en RTDB desde checkout.html
async function bindCheckoutSave() {
  const btn = document.getElementById("btnConfirmOrder");
  if (!btn) return; // No estamos en checkout.html

  btn.addEventListener("click", async () => {
    // Importar funciones de Supabase
    const { saveOrderSupabase } = await import('./supabase-orders.js');
    const items = getCartSafe();
    // Calcular total correctamente buscando precio en PRODUCTS
    const total = items.reduce((s, it) => {
      const product = (window.PRODUCTS || []).find(p => p.id === it.id);
      const price = product ? (Number(product.price) || 0) : 0;
      const qty = Number(it.qty) || 1;
      return s + (price * qty);
    }, 0);
    const pedido = {
      email:       document.getElementById("inputEmail")?.value?.trim() || "",
      nombre:      document.getElementById("inputName")?.value?.trim() || "",
      apellidos:   document.getElementById("inputApellido")?.value?.trim() || "",
      rut:         document.getElementById("inputRut")?.value?.trim() || "",
      direccion:   document.getElementById("inputDireccion")?.value?.trim() || "",
      region:      document.getElementById("inputRegion")?.value || "",
      comuna:      document.getElementById("inputComuna")?.value || "",
      telefono:    document.getElementById("inputTelefono")?.value?.trim() || "",
      postal:      document.getElementById("inputPostal")?.value?.trim() || "",
      notas:       document.getElementById("inputNotes")?.value?.trim() || "",
      envio:       (document.querySelector('input[name="shipMethod"]:checked')?.value) || (document.getElementById("inputEnvio")?.value) || "",
      pago:        (document.querySelector('input[name="payMethod"]:checked')?.value) || "",
      items,
      totalCLP:    total,
      estado:      "pendiente",
      createdAt:   new Date().toISOString()
    };
    try {
      const saved = await saveOrderSupabase(pedido);
      let pedidoId = '';
      if (saved && (typeof saved.id !== 'undefined')) pedidoId = saved.id;
      alert("✅ Pedido registrado. ID: " + pedidoId);
      localStorage.removeItem("cart");
      window.location.href = "index.html";
    } catch (e) {
      console.error("❌ [Supabase] Error guardando pedido:", e);
      alert("❌ Ocurrió un problema registrando el pedido. Intenta nuevamente.");
    }
  });
}

// Arranque común para todas las páginas
document.addEventListener("DOMContentLoaded", () => {
  // 1) Cargar productos; si falla, queda el fallback local de script.js
  loadProductsFromRTDB();

  // 2) Enganchar guardado de pedidos (solo si existe el botón)
  bindCheckoutSave();
});
