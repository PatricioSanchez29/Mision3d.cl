/**
 * animations.js — Mision3D (version ligera)
 * Solo: scroll reveal suave + skeleton de carga.
 * Sin cursor, sin parallax, sin tilt — para no afectar rendimiento.
 */
(function () {
  'use strict';

  /* ── 1. SCROLL REVEAL ligero con IntersectionObserver ── */
  const style = document.createElement('style');
  style.textContent = `
    .agy-reveal {
      opacity: 0;
      transform: translateY(28px);
      transition: opacity .5s ease, transform .5s ease;
    }
    .agy-reveal.is-visible {
      opacity: 1;
      transform: translateY(0);
    }
    .agy-reveal.delay-1 { transition-delay: .08s; }
    .agy-reveal.delay-2 { transition-delay: .16s; }
    .agy-reveal.delay-3 { transition-delay: .24s; }
  `;
  document.head.appendChild(style);

  const selectors = ['.item', '.faq-item', '.card', '.related-card'];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('agy-reveal');
      if (i < 4) el.classList.add('delay-' + i);
    });
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.agy-reveal').forEach(el => io.observe(el));

  // Re-aplicar cuando se carguen productos dinámicos
  const reapply = () => {
    document.querySelectorAll('.card:not(.agy-reveal), .related-card:not(.agy-reveal)').forEach((el, i) => {
      el.classList.add('agy-reveal');
      if (i < 4) el.classList.add('delay-' + i);
      io.observe(el);
    });
  };
  window.addEventListener('productsLoaded', () => setTimeout(reapply, 100));
  document.addEventListener('productsReady', () => setTimeout(reapply, 100));

  /* ── 2. SKELETON de carga de productos ── */
  const grid = document.getElementById('homeProductsGrid');
  if (grid && !grid.children.length) {
    const skStyle = document.createElement('style');
    skStyle.textContent = `
      .sk { background:#f3f4f6; border-radius:14px; overflow:hidden; }
      .sk-img { width:100%; aspect-ratio:1; background:linear-gradient(90deg,#ececec 25%,#e0e0e0 50%,#ececec 75%); background-size:200% 100%; animation:sk-shine 1.4s infinite; }
      .sk-line { height:13px; margin:12px 14px 6px; border-radius:6px; background:linear-gradient(90deg,#ececec 25%,#e0e0e0 50%,#ececec 75%); background-size:200% 100%; animation:sk-shine 1.4s infinite; }
      .sk-line.s { width:55%; height:11px; }
      .sk-btn  { height:34px; margin:8px 14px 14px; border-radius:20px; background:linear-gradient(90deg,#ececec 25%,#e0e0e0 50%,#ececec 75%); background-size:200% 100%; animation:sk-shine 1.4s infinite; }
      @keyframes sk-shine { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    `;
    document.head.appendChild(skStyle);

    grid.innerHTML = Array(4).fill(0).map(() =>
      `<div class="sk"><div class="sk-img"></div><div class="sk-line"></div><div class="sk-line s"></div><div class="sk-btn"></div></div>`
    ).join('');

    const clear = () => { grid.querySelectorAll('.sk').forEach(s => s.remove()); };
    window.addEventListener('productsLoaded', clear, { once: true });
    document.addEventListener('productsReady', clear, { once: true });
    setTimeout(clear, 6000);
  }

})();
