# Backend Pagos Tienda3D

Integración mínima de pagos con MercadoPago y Flow (Chile) para el proyecto frontend existente.

## 1. Requisitos
- Node.js >= 18
- Cuenta de MercadoPago (credenciales sandbox para pruebas)
- Cuenta Flow (sandbox)

## 2. Instalación
```bash
cd backend
npm install
cp .env.example .env
```
Edita `.env` y coloca tus credenciales reales (sandbox primero).

## 3. Variables de entorno
| Variable | Descripción |
|----------|-------------|
| MP_ACCESS_TOKEN | Access Token privado (sandbox) |
| MP_PUBLIC_KEY   | Public key (para SDK front futuro) |
| FLOW_API_KEY    | API Key Flow |
| FLOW_SECRET     | Secret HMAC Flow |
| FLOW_BASE_URL   | URL base API Flow (sandbox: https://sandbox.flow.cl/api) |
| FLOW_COMMERCE_ID| ID de comercio Flow |
| FLOW_RETURN_URL | URL a la que Flow redirige al usuario tras pagar |
| FLOW_CONFIRM_URL| Endpoint que Flow invoca (webhook / confirmación) |
| PORT            | Puerto del servidor Express |

## 4. Ejecutar servidor
```bash
npm run dev
```
Servidor escuchará (por defecto) en: http://localhost:3000

## 5. Endpoints
### POST /api/payments/mercadopago
Crea una preferencia a partir de items y retorna init_point.

Body JSON ejemplo:
```json
{
  "items": [{"id":"f1","name":"Calendario","price":15990,"qty":1}],
  "payer": {"name":"Juan","surname":"Pérez","email":"juan@example.com","rut":"11111111-1"},
  "shippingCost": 2990,
  "discount": 0
}
```
Respuesta (simplificada):
```json
{
  "init_point": "https://www.mercadopago.cl/checkout/v1/redirect?...",
  "id": "123456789"
}
```

### POST /api/payments/flow
Genera orden en Flow y retorna URL de pago.

Body igual al de MercadoPago.
Respuesta:
```json
{
  "url": "https://sandbox.flow.cl/app/web/pay.php?token=...",
  "flowOrder": 12345,
  "token": "abcdef"
}
```

## 6. Confirmaciones / callbacks
- Flow: `POST /flow/confirm` (pendiente validar firma HMAC). Por ahora solo loguea.
- Flow: `GET /flow/retorno` muestra mensaje simple.
- MercadoPago: back_urls definidas en preferencia (`/mp/success`, `/mp/failure`, `/mp/pending`).

## 7. Flujo Frontend (resumen)
1. Usuario completa checkout y elige pasarela.
2. `confirmCheckout()` arma payload y hace fetch a `/api/payments/{mercadopago|flow}`.
3. Redirige al `init_point` (MP) o `url` (Flow).
4. Pasarela procesa pago y redirige a la URL de retorno.*
5. (Opcional) Webhook/confirm procesa y marca la orden pagada.
6. Se abre WhatsApp paralelamente para tener respaldo manual.

## 8. Descuentos y envío
Actualmente el backend recibe `shippingCost` y `discount` ya calculados desde el front. Para mayor seguridad se recomienda volver a calcularlos en backend con una lista de precios de servidor.

## 9. Mejoras recomendadas
- Validar firma HMAC de Flow en `/flow/confirm`.
- Persistir órdenes (archivo JSON o BD: id, estado, items, totales, método).
- En MercadoPago enviar cada ítem real (no total único) para mejor desglose fiscal.
- Agregar manejo de `discount` real y validar que no sea manipulado.
- Reintentos automáticos si falla creación de preferencia.
- Autenticación simple para dashboard interno.

## 10. Ejemplo de payload de orden unificada
```json
{
  "orderId": "ORD-2025-0001",
  "items": [
    { "id": "f1", "name": "Calendario Formula 1", "price": 15990, "qty": 1 }
  ],
  "subtotal": 15990,
  "shippingCost": 2990,
  "discount": 0,
  "total": 18980,
  "paymentMethod": "mercadopago",
  "status": "pending",
  "customer": { "name": "Juan", "surname": "Pérez", "rut": "11111111-1", "email": "juan@example.com" }
}
```

## 11. Comandos útiles
```bash
# Instalar deps
npm install

# Ejecutar en watch mode (Node >=18)
npm run dev

# Producción
npm start
```

## 12. Notas de seguridad
- No expongas `FLOW_SECRET` ni `MP_ACCESS_TOKEN` en frontend.
- Implementa rate limiting si abres estos endpoints públicamente.
- Usa HTTPS en producción (reverse proxy / Nginx / Cloudflare).

## 13. Troubleshooting rápido
| Problema | Causa probable | Solución |
|----------|----------------|----------|
| 401 MercadoPago | Token inválido | Revisa MP_ACCESS_TOKEN en .env |
| Error Flow 403  | Firma incorrecta | Verifica orden de parámetros y secret |
| CORS en fetch   | Front abierto desde file:// | Sirve frontend desde mismo host/puerto o habilita CORS |
| Total incorrecto| Manipulación front | Recalcular backend y rechazar divergencias |

---
Listo para extender con persistencia o panel admin. Cualquier mejora que quieras me dices y la agrego.
# Mision3d.cl
# Mision3d.cl
