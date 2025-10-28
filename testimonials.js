// ==================== TESTIMONIOS / REVIEWS ====================
// Sistema simple de testimonios de clientes

const TESTIMONIALS = [
  {
    id: 1,
    name: 'María González',
    rating: 5,
    date: '2025-10-15',
    comment: '¡Increíble calidad! El calendario de F1 quedó perfecto, súper detallado y los colores impecables.',
    product: 'Calendario Formula 1',
    verified: true
  },
  {
    id: 2,
    name: 'Carlos Martínez',
    rating: 5,
    date: '2025-10-10',
    comment: 'Excelente servicio. Personalizaron la caja Beyblade con el nombre de mi hijo y llegó antes de lo esperado.',
    product: 'Caja Beyblade',
    verified: true
  },
  {
    id: 3,
    name: 'Ana Pérez',
    rating: 5,
    date: '2025-10-05',
    comment: 'La figura de mi mascota quedó idéntica! Super recomendado, atención rápida y producto de calidad.',
    product: 'Figura Mascota',
    verified: true
  }
];

// Renderizar estrellas
function renderStars(rating) {
  let stars = '';
  for (let i = 0; i < 5; i++) {
    stars += i < rating ? '⭐' : '☆';
  }
  return stars;
}

// Crear tarjeta de testimonial
function createTestimonialCard(testimonial) {
  const card = document.createElement('div');
  card.className = 'testimonial-card';
  
  const verifiedBadge = testimonial.verified 
    ? '<span class="verified-badge" title="Compra verificada">✓ Compra verificada</span>' 
    : '';
  
  const date = new Date(testimonial.date).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  card.innerHTML = `
    <div class="testimonial-header">
      <div class="testimonial-avatar">${testimonial.name.charAt(0)}</div>
      <div class="testimonial-info">
        <div class="testimonial-name">${testimonial.name}</div>
        <div class="testimonial-rating">${renderStars(testimonial.rating)}</div>
      </div>
    </div>
    <div class="testimonial-body">
      <p class="testimonial-comment">"${testimonial.comment}"</p>
      <div class="testimonial-meta">
        <span class="testimonial-product">📦 ${testimonial.product}</span>
        <span class="testimonial-date">${date}</span>
      </div>
      ${verifiedBadge}
    </div>
  `;
  
  return card;
}

// Crear sección de testimonios
function createTestimonialsSection() {
  const section = document.createElement('section');
  section.className = 'testimonials-section';
  section.id = 'testimonios';
  
  section.innerHTML = `
    <div class="container">
      <h2 class="section-title">
        <span class="gradient-text">Lo que dicen nuestros clientes</span>
      </h2>
      <p class="section-subtitle">Testimonios reales de clientes satisfechos</p>
      <div class="testimonials-grid" id="testimonialsGrid"></div>
    </div>
  `;
  
  return section;
}

// Renderizar testimonios
function renderTestimonials() {
  const grid = document.getElementById('testimonialsGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  TESTIMONIALS.forEach(testimonial => {
    grid.appendChild(createTestimonialCard(testimonial));
  });
}

// Inyectar sección en la página
function injectTestimonialsSection() {
  // Buscar dónde insertar (antes del footer)
  const footer = document.querySelector('.footer');
  if (footer) {
    const section = createTestimonialsSection();
    footer.before(section);
    renderTestimonials();
  }
}

// Estilos
const testimonialStyles = document.createElement('style');
testimonialStyles.textContent = `
  .testimonials-section {
    padding: 80px 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  }
  
  .testimonials-section .container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .section-subtitle {
    text-align: center;
    color: #64748b;
    font-size: 1.1rem;
    margin-bottom: 50px;
  }
  
  .testimonials-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
    margin-top: 40px;
  }
  
  .testimonial-card {
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .testimonial-card::before {
    content: '"';
    position: absolute;
    top: -10px;
    left: 20px;
    font-size: 120px;
    color: rgba(0, 82, 204, 0.05);
    font-family: Georgia, serif;
    line-height: 1;
  }
  
  .testimonial-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 82, 204, 0.15);
  }
  
  .testimonial-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 15px;
    position: relative;
    z-index: 1;
  }
  
  .testimonial-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0052cc 0%, #06b6d4 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 1.2rem;
  }
  
  .testimonial-info {
    flex: 1;
  }
  
  .testimonial-name {
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 4px;
  }
  
  .testimonial-rating {
    font-size: 0.9rem;
    color: #fbbf24;
  }
  
  .testimonial-body {
    position: relative;
    z-index: 1;
  }
  
  .testimonial-comment {
    color: #475569;
    line-height: 1.6;
    margin-bottom: 15px;
    font-style: italic;
  }
  
  .testimonial-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    font-size: 0.85rem;
    color: #94a3b8;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #e2e8f0;
    flex-wrap: wrap;
  }
  
  .testimonial-product {
    font-weight: 500;
    color: #64748b;
  }
  
  .verified-badge {
    display: inline-block;
    background: #10b981;
    color: white;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-top: 10px;
  }
  
  @media (max-width: 768px) {
    .testimonials-section {
      padding: 60px 20px;
    }
    
    .testimonials-grid {
      grid-template-columns: 1fr;
      gap: 20px;
    }
  }
`;
document.head.appendChild(testimonialStyles);

// Inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectTestimonialsSection);
} else {
  injectTestimonialsSection();
}

// Exponer para agregar más testimonios dinámicamente
window.TESTIMONIALS = TESTIMONIALS;
window.renderTestimonials = renderTestimonials;

console.log('✅ Sección de testimonios agregada');
