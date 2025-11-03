// backend/sitemap.js
import express from 'express';
const router = express.Router();

// Puedes agregar aquí tus rutas dinámicas si lo deseas
themes = [
  '/',
  '/login.html',
  '/register.html',
  '/catalogo.html',
  '/producto.html',
  '/checkout.html',
  '/favoritos.html',
  '/wishlist.html',
  '/reset-password.html',
  '/confirmacion-correo.html',
  // Agrega más rutas según tu sitio
];

router.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  const baseUrl = req.protocol + '://' + req.get('host');
  const urls = themes.map(route => `    <url><loc>${baseUrl}${route}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  res.send(xml);
});

export default router;
