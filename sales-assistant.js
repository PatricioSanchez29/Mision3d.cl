/* Asistentes comerciales: capturan contexto y abren WhatsApp con una consulta lista. */
(() => {
  const phone = '56950503585';
  // Mantener los productos destacados como la primera vitrina tras el hero.
  const featuredProducts = document.getElementById('productos');
  const salesAssistant = document.getElementById('cotizar');
  if (featuredProducts && salesAssistant) featuredProducts.insertAdjacentElement('afterend', salesAssistant);

  function track(name, params) {
    try { window.gaEvent?.(name, params); } catch (_) {}
  }

  function openWhatsApp(message, agent) {
    track('sales_agent_start', { agent });
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  function value(form, name) {
    return String(new FormData(form).get(name) || '').trim();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('[data-agent-tab]');
    const panels = document.querySelectorAll('.sales-agent-form');

    tabs.forEach((tab) => tab.addEventListener('click', () => {
      const target = tab.dataset.agentTab;
      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
      panels.forEach((panel) => { panel.hidden = panel.id !== target; });
      track('sales_agent_select', { agent: target });
    }));

    document.getElementById('quoteAgent')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const type = value(form, 'type');
      if (!type) return;
      const quantity = value(form, 'quantity') || 'No indicada';
      const deadline = value(form, 'deadline') || 'Flexible / por definir';
      const details = value(form, 'details') || 'Sin detalles adicionales todavía';
      openWhatsApp(`Hola, quiero solicitar una cotización en Misión 3D.\n\n*Proyecto:* ${type}\n*Cantidad:* ${quantity}\n*Fecha ideal:* ${deadline}\n*Detalles:* ${details}\n\nPuedo enviar referencias o archivos por este chat.`, 'quote');
    });

    document.getElementById('supportAgent')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const topic = value(form, 'topic');
      if (!topic) return;
      const details = value(form, 'details') || 'Sin detalles adicionales todavía';
      openWhatsApp(`Hola, necesito ayuda de Misión 3D.\n\n*Tema:* ${topic}\n*Detalle:* ${details}`, 'support');
    });

    document.querySelectorAll('[data-sales-source]').forEach((link) => link.addEventListener('click', () => track('sales_contact_click', { source: link.dataset.salesSource })));
  });
})();
