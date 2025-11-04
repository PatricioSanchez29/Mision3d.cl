# Seguridad del Webhook de Flow

## 🔒 Protecciones Implementadas

### 1. **Validación de Firma Digital**

Flow envía un parámetro `s` (firma) en cada webhook que contiene un hash HMAC-SHA256 de los parámetros con tu clave secreta.

**Implementación:**
```javascript
const paramsToSign = { token };
const expectedSignature = flowSign(paramsToSign, secret);

if (receivedSignature !== expectedSignature) {
  return res.status(401).json({ error: 'Firma inválida' });
}
```

**¿Qué previene?**
- ✅ Webhooks falsos de atacantes
- ✅ Manipulación de parámetros (token, amount, etc.)
- ✅ Inyección de pagos fraudulentos

---

### 2. **Protección contra Replay Attacks**

Cada token de Flow solo se procesa **una vez**. Si un atacante intenta reenviar el mismo webhook, es rechazado.

**Implementación:**
```javascript
if (isTokenProcessed(token)) {
  return res.status(409).json({ error: 'Token duplicado' });
}
markTokenAsProcessed(token);
```

**¿Qué previene?**
- ✅ Reutilización de tokens antiguos
- ✅ Doble cobro al cliente
- ✅ Race conditions en webhooks duplicados

**Almacenamiento:**
- En memoria con Map (desarrollo/staging)
- **Recomendado para producción:** Redis con TTL de 10 minutos

---

### 3. **Validación de Monto**

El monto pagado en Flow **debe coincidir** con el monto del pedido original en tu base de datos.

**Implementación:**
```javascript
const montoEsperado = pedidoActual?.totalCLP || 0;
const montoPagado = paymentData.amount || 0;
const diferencia = Math.abs(montoPagado - montoEsperado);

if (diferencia > 1) { // Tolerancia de ±1 CLP por redondeo
  return res.status(400).json({ error: 'Discrepancia de monto' });
}
```

**¿Qué previene?**
- ✅ Pagos parciales fraudulentos
- ✅ Modificación del monto en tránsito
- ✅ Errores de integración

**Estados en Firebase:**
- `pagado` - Monto validado correctamente
- `discrepancia_monto` - Requiere revisión manual

---

### 4. **Validación de Datos Completos**

Verifica que Flow envíe todos los datos necesarios antes de procesar el pago.

**Implementación:**
```javascript
if (!paymentData.flowOrder || !paymentData.commerceOrder || !paymentData.status) {
  return res.status(400).json({ error: 'Datos incompletos' });
}

if (!paymentData.amount || paymentData.amount <= 0) {
  return res.status(400).json({ error: 'Monto inválido' });
}
```

**¿Qué previene?**
- ✅ Procesamiento de pagos incompletos
- ✅ Montos negativos o cero
- ✅ Errores silenciosos

---

### 5. **Estados de Flow Soportados**

El webhook maneja correctamente todos los estados de Flow:

| Status | Valor | Acción |
|--------|-------|--------|
| Pendiente | 1 | Registra pero NO marca como pagado |
| **Pagado** | 2 | ✅ Valida y marca como pagado |
| Rechazado | 3 | Marca como rechazado |
| Anulado | 4 | Marca como anulado |

**Código:**
```javascript
if (paymentData.status === 2) {
  // Solo marcar como pagado si status === 2
  updates[`pedidos/${p.id}/estado`] = 'pagado';
}
```

---

## 🚨 Vectores de Ataque Prevenidos

### 1. **Webhook Spoofing (Suplantación)**
**Ataque:** Atacante envía POST a `/flow/confirm` simulando ser Flow.  
**Prevención:** Validación de firma digital + verificación con Flow API.

### 2. **Replay Attack (Reutilización)**
**Ataque:** Atacante captura un webhook válido y lo reenvía múltiples veces.  
**Prevención:** Sistema de tokens procesados con TTL.

### 3. **Amount Manipulation (Manipulación de monto)**
**Ataque:** Atacante modifica el monto del pago en el webhook.  
**Prevención:** Validación contra pedido original en base de datos.

### 4. **Partial Payment Fraud (Pago parcial)**
**Ataque:** Cliente paga $1.000 pero modifica webhook para mostrar $100.000.  
**Prevención:** Validación de monto + consulta directa a Flow API.

### 5. **Race Condition (Doble procesamiento)**
**Ataque:** Envío simultáneo de webhooks duplicados.  
**Prevención:** Marcado atómico de token antes de procesamiento.

---

## 📋 Checklist de Seguridad

### Antes de Producción

- [x] Validación de firma activada
- [x] Protección contra replay attacks implementada
- [x] Validación de montos activada
- [x] Logs de seguridad configurados
- [ ] **Redis configurado para tokens procesados** (recomendado)
- [ ] **Webhook endpoint detrás de HTTPS** (obligatorio)
- [ ] **Rate limiting configurado** (recomendado: max 10 req/min)
- [ ] **Alertas de seguridad configuradas** (email/Slack en fraude detectado)
- [ ] **Variables de entorno en producción** (no hardcodear secrets)

### Monitoreo en Producción

```javascript
// Revisar logs diariamente para:
grep "🚨 \[SECURITY\]" logs/app.log
```

Buscar patrones de:
- Firmas inválidas repetidas (misma IP)
- Tokens duplicados (posibles bots)
- Discrepancias de monto (fraude o bugs)

---

## 🔧 Configuración Recomendada

### Redis para Tokens Procesados (Producción)

Reemplazar `Map` en memoria con Redis:

```javascript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

async function isTokenProcessed(token) {
  const exists = await redis.exists(`flow:token:${token}`);
  return exists === 1;
}

async function markTokenAsProcessed(token) {
  await redis.setex(`flow:token:${token}`, 600, '1'); // TTL 10 min
}
```

**Ventajas:**
- ✅ Persistente entre reinicios
- ✅ Funciona con múltiples instancias (load balancer)
- ✅ TTL automático

---

### Rate Limiting para Webhook

Limitar peticiones al webhook para prevenir ataques de fuerza bruta:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,     // 5 minutos
  max: 500,                    // Máx. 500 peticiones por IP en ese tiempo
  message: {
    error: "Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.",
    retryAfter: "5 minutos"
  },
  standardHeaders: true,       // Devuelve headers RateLimit-* estándar
  legacyHeaders: false         // Desactiva los headers X-RateLimit-*
});

app.post("/flow/confirm", webhookLimiter, async (req, res) => {
  // ... resto del código
});

// Aplica el límite a todas las rutas
app.use(limiter);

---

### Alertas de Seguridad

Enviar notificación inmediata cuando se detecte fraude:

```javascript
async function alertSecurityTeam(type, details) {
  const mensaje = `
    🚨 ALERTA DE SEGURIDAD: ${type}
    
    Detalles:
    ${JSON.stringify(details, null, 2)}
    
    IP: ${details.ip}
    Timestamp: ${new Date().toISOString()}
  `;
  
  // Enviar por email
  await sendEmail({
    to: process.env.SECURITY_ALERT_EMAIL,
    subject: `🚨 Seguridad: ${type}`,
    text: mensaje
  });
  
  // O Slack
  // await axios.post(process.env.SLACK_WEBHOOK, { text: mensaje });
}

// Uso:
if (receivedSignature !== expectedSignature) {
  await alertSecurityTeam('Firma Inválida', {
    token,
    receivedSignature,
    expectedSignature,
    ip: req.ip
  });
  return res.status(401).json({ error: 'Firma inválida' });
}
```

---

## 🧪 Testing de Seguridad

### 1. Test de Firma Inválida

```bash
curl -X POST http://localhost:3000/flow/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test123",
    "s": "firma_falsa_12345"
  }'

# Respuesta esperada: 401 Unauthorized
# { "error": "Firma inválida", "message": "..." }
```

### 2. Test de Replay Attack

```bash
# Primera petición (debería funcionar)
curl -X POST http://localhost:3000/flow/confirm \
  -H "Content-Type: application/json" \
  -d '{"token": "abc123", "s": "firma_valida"}'

# Segunda petición CON EL MISMO TOKEN (debería fallar)
curl -X POST http://localhost:3000/flow/confirm \
  -H "Content-Type: application/json" \
  -d '{"token": "abc123", "s": "firma_valida"}'

# Respuesta esperada: 409 Conflict
# { "error": "Token duplicado", "message": "..." }
```

### 3. Test de Validación de Monto

Crear pedido de $10.000 y simular webhook con $1.000:

```bash
# Debería fallar con:
# { "error": "Discrepancia de monto", "message": "..." }
```

---

## 📚 Referencias

- [Flow API Documentation](https://www.flow.cl/docs/api.html)
- [OWASP Webhook Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [HMAC Signature Validation](https://en.wikipedia.org/wiki/HMAC)
- [Replay Attack Prevention](https://owasp.org/www-community/attacks/Replay_attack)

---

## 🆘 Soporte

Si detectas actividad sospechosa:

1. **Revisa logs**: `grep "🚨" logs/app.log`
2. **Verifica estado en Firebase**: Busca pedidos con `estado: 'discrepancia_monto'`
3. **Consulta directamente a Flow**: Usa el panel de Flow para verificar transacciones
4. **Bloquea IPs sospechosas**: Firewall o nginx config

---

## ✅ Resumen

Tu webhook ahora tiene **5 capas de seguridad**:

1. ✅ Validación de firma digital (HMAC-SHA256)
2. ✅ Protección contra replay attacks (tokens únicos)
3. ✅ Validación de montos (vs pedido original)
4. ✅ Validación de datos completos
5. ✅ Manejo correcto de estados de Flow

**Nivel de seguridad:** 🔒🔒🔒🔒 (4/5)

Para llegar a 5/5 en producción, implementa:
- Redis para tokens procesados
- Rate limiting en webhook
- Alertas automáticas de seguridad
- HTTPS obligatorio
