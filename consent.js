/*
  Consent Mode + GA4 loader + cookie banner (vanilla JS)
  - Set window.GA_MEASUREMENT_ID = 'G-XXXXXXXXXX' in HTML to enable.
  - Stores decision in localStorage key 'cookieConsent' {analytics:'granted'|'denied', ts}
  - Exposes window.gaEvent(name, params)
*/
(function(){
  var GA_ID = window.GA_MEASUREMENT_ID || localStorage.getItem('ga4_id') || '';
  if (GA_ID) localStorage.setItem('ga4_id', GA_ID);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // Default: denied until user accepts
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'analytics_storage': 'denied',
    'functionality_storage': 'granted',
    'security_storage': 'granted'
  });

  function loadGA(){
    if (!GA_ID) return;
    if (document.getElementById('ga4-lib')) return; // already loaded
    var s = document.createElement('script');
    s.id = 'ga4-lib';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, { send_page_view: true });
  }

  function grantConsent(){
    gtag('consent', 'update', { 'ad_storage': 'granted', 'analytics_storage': 'granted' });
    localStorage.setItem('cookieConsent', JSON.stringify({ analytics: 'granted', ts: Date.now() }));
    loadGA();
    hideBanner();
  }
  function denyConsent(){
    gtag('consent', 'update', { 'ad_storage': 'denied', 'analytics_storage': 'denied' });
    localStorage.setItem('cookieConsent', JSON.stringify({ analytics: 'denied', ts: Date.now() }));
    hideBanner();
  }

  // Banner UI
  function injectStyles(){
    if (document.getElementById('cookie-style')) return;
    var css = '\n#cookie-banner{position:fixed;left:16px;right:16px;bottom:16px;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:12px;padding:14px 16px;display:flex;gap:14px;align-items:center;z-index:9999;box-shadow:0 8px 30px rgba(0,0,0,.25)}\n#cookie-banner .msg{flex:1;font-size:.88rem;line-height:1.4}\n#cookie-banner .actions{display:flex;gap:10px}\n#cookie-banner button{cursor:pointer;border-radius:10px;padding:10px 14px;font-weight:600;border:1px solid #334155}#cookie-accept{background:#16a34a;color:#fff;border:none}#cookie-deny{background:#0b1220;color:#e2e8f0}\n@media (max-width:560px){#cookie-banner{flex-direction:column;align-items:flex-start}}';
    var st = document.createElement('style'); st.id='cookie-style'; st.textContent = css; document.head.appendChild(st);
  }
  function showBanner(){
    injectStyles();
    if (document.getElementById('cookie-banner')) return;
    var wrap = document.createElement('div'); wrap.id='cookie-banner';
    wrap.innerHTML = '<div class="msg">Usamos cookies para analítica (Google Analytics 4). Puedes aceptar o rechazar.</div>'+
      '<div class="actions"><button id="cookie-deny">Rechazar</button><button id="cookie-accept">Aceptar</button></div>';
    document.body.appendChild(wrap);
    document.getElementById('cookie-accept').onclick = grantConsent;
    document.getElementById('cookie-deny').onclick = denyConsent;
  }
  function hideBanner(){ var b=document.getElementById('cookie-banner'); if(b) b.remove(); }

  // Initialize based on stored choice
  try {
    var stored = JSON.parse(localStorage.getItem('cookieConsent')||'null');
    if (stored && stored.analytics === 'granted') { loadGA(); }
    else if (!stored) { if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', showBanner); else showBanner(); }
  } catch { showBanner(); }

  // Expose event helper
  window.gaEvent = function(name, params){
    try { gtag('event', name, params || {}); } catch(_e) {}
  };
})();
