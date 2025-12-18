(function(){
  // Diagnóstico y fallback ligero para CTAs del hero en móvil.
  // No rompe comportamiento normal: solo actúa cuando detecta que el elemento
  // tocado no es un enlace, pero existe un enlace del hero bajo el punto.
  function isAnchor(el){ return !!(el && (el.tagName==='A' || el.closest && el.closest('a'))); }
  function findHeroAnchors(){ return Array.from(document.querySelectorAll('.hero-actions a')) }

  function pointTopElement(x,y){
    try{ return document.elementFromPoint(x,y); }catch(e){ return null; }
  }

  function anchorsContainingPoint(x,y){
    const anchors = findHeroAnchors();
    return anchors.filter(a=>{
      const r = a.getBoundingClientRect();
      return x>=r.left && x<=r.right && y>=r.top && y<=r.bottom;
    });
  }

  function onTouchStart(e){
    const t = (e.touches && e.touches[0]) || null;
    if(!t) return;
    e._hero_touch = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e){
    const t = (e.changedTouches && e.changedTouches[0]) || null;
    if(!t) return;
    const x = t.clientX, y = t.clientY;
    const top = pointTopElement(x,y);
    // Si el top element es un anchor dentro hero => normal click will happen
    if(top && top.closest && top.closest('.hero-actions') && top.closest('a')) return;

    // Si no es anchor pero existe un hero anchor que contiene el punto, trigger it
    const anchors = anchorsContainingPoint(x,y);
    if(anchors && anchors.length){
      // prefer first visible anchor
      const a = anchors.find(v=>v.offsetParent!==null) || anchors[0];
      if(a){
        console.log('debug-hero-touch: fallback click on', a.href || a);
        a.click();
      }
    } else {
      // Log for debugging: show top elements stack for developer console
      try{
        const els = document.elementsFromPoint(x,y).slice(0,6);
        console.log('debug-hero-touch: elementsFromPoint', els);
      }catch(e){ /* ignore */ }
    }
  }

  // Attach only once and only on touch-capable devices
  if(('ontouchstart' in window) && document.querySelector('.hero-actions')){
    const hero = document.querySelector('.hero');
    // Use capture to run early
    hero.addEventListener('touchstart', onTouchStart, {passive:true, capture:true});
    hero.addEventListener('touchend', onTouchEnd, {passive:true, capture:true});
    console.log('debug-hero-touch: attached listeners');
  }
})();
