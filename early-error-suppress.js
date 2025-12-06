// early-error-suppress.js
// Instala handlers tempranos para suprimir errores conocidos de bundles externos
(function(){
  try{
    // Capturar errores sin dejar que la consola los muestre por defecto
    function shouldSuppress(file, msg){
      const suspicious = ['wrapper.mjs', 'AuthClient', 'AuthError', 'authclient', 'chrome-extension://'];
      for (let k of suspicious){ if (file && file.indexOf(k) !== -1) return true; }
      for (let k of suspicious){ if (msg && msg.indexOf(k) !== -1) return true; }
      return false;
    }

    window.addEventListener('error', function (ev) {
      try {
        const file = ev.filename || (ev.error && ev.error.sourceURL) || (ev.target && ev.target.src) || '';
        const msg = String(ev.message || (ev.error && ev.error.message) || '');
        if (shouldSuppress(file, msg)){
          try { ev.preventDefault && ev.preventDefault(); } catch(e){}
          try { ev.stopImmediatePropagation && ev.stopImmediatePropagation(); } catch(e){}
          try { ev.stopPropagation && ev.stopPropagation(); } catch(e){}
          try { ev.returnValue = true; } catch(e){}
          console.warn('[suppress] Ignorado error de', file || '(sin file)', msg);
          return true;
        }
      } catch(e){ }
    }, true);

    // Fallback global que algunas veces previene el log por DevTools
    window.onerror = function(message, source, lineno, colno, error){
      try{
        const file = source || (error && error.sourceURL) || '';
        const msg = String(message || (error && error.message) || '');
        if (shouldSuppress(file, msg)){
          console.warn('[suppress] window.onerror interceptó:', file || '(sin file)', msg);
          return true; // suprime el error
        }
      }catch(e){}
      return false;
    };

    window.addEventListener('unhandledrejection', function(ev){
      try{
        const reason = String(ev.reason || '');
        if (shouldSuppress('', reason)) {
          try { ev.preventDefault && ev.preventDefault(); } catch(e){}
          try { ev.stopImmediatePropagation && ev.stopImmediatePropagation(); } catch(e){}
          try { ev.stopPropagation && ev.stopPropagation(); } catch(e){}
          try { ev.returnValue = true; } catch(e){}
          console.warn('[suppress] Ignorado unhandledrejection:', reason);
          return true;
        }
      }catch(e){}
    }, true);

    // Opcional: filtrar logs en consola que contengan wrapper.mjs para reducir ruido
    const _origError = console.error.bind(console);
    console.error = function(...args){
      try{
        const txt = args.map(a=>String(a)).join(' ');
        if (txt.indexOf('wrapper.mjs') !== -1 || txt.indexOf('AuthClient') !== -1) {
          console.warn('[suppress] console.error suprimido:', txt);
          return;
        }
      }catch(e){}
      return _origError(...args);
    };
  }catch(e){ /* noop */ }
})();
