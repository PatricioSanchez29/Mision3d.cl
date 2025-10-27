# Guía de Deployment con SSL para Producción

## 📋 Requisitos Previos

1. **Servidor con Docker y Docker Compose instalados**
2. **Dominio apuntando a tu servidor** (registros DNS A configurados)
3. **Puerto 80 y 443 abiertos** en el firewall
4. **Archivo `.env` configurado** (usa `.env.example` como plantilla)
5. **Credenciales de Firebase** en `firebase-credentials.json` (opcional pero recomendado)

---

## 🚀 Opción 1: Despliegue con Perfiles (Docker Compose)

### Desarrollo (sin SSL)
```bash
# Levantar con perfil de desarrollo
docker-compose --profile dev up -d

# Ver logs
docker-compose logs -f
```

### Producción (sin SSL - usa reverse proxy externo)
```bash
# Levantar con perfil de producción
docker-compose --profile production up -d

# Ver logs
docker-compose logs -f backend-prod
```

**Nota**: Este método usa el `docker-compose.yml` estándar. El perfil `production` usa:
- URLs de Flow producción (`https://www.flow.cl/api`)
- CORS restringido a tu dominio (define `CORS_ORIGIN` en `.env`)
- Monta `firebase-credentials.json` para Firebase Admin SDK

---

## 🔒 Opción 2: Despliegue con SSL Automático (Recomendado para Producción)

Esta opción configura Nginx con SSL (Let's Encrypt) y renovación automática de certificados.

### Paso 1: Configurar Dominio

Edita los siguientes archivos reemplazando `tudominio.cl` con tu dominio real:

1. **nginx-ssl.conf** (líneas 3, 9, 10, 17, 18, 21, 22):
   ```nginx
   server_name tudominio.cl www.tudominio.cl;
   ssl_certificate /etc/letsencrypt/live/tudominio.cl/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/tudominio.cl/privkey.pem;
   ```

2. **docker-compose-ssl.yml** (línea 16):
   ```yaml
   - CORS_ORIGIN=https://tudominio.cl,https://www.tudominio.cl
   ```

3. **docker-compose-ssl.yml** (línea 23):
   ```yaml
   - RETURN_URL=https://tudominio.cl/checkout.html
   ```

4. **obtener-certificado.ps1** o **obtener-certificado.sh** (línea con `-d tudominio.cl`):
   ```bash
   -d tudominio.cl \
   -d www.tudominio.cl
   ```

### Paso 2: Verificar Variables de Entorno

Crea o actualiza tu archivo `.env` con los valores de producción:

```env
# Flow (PRODUCCIÓN)
FLOW_API_KEY=tu-api-key-de-produccion
FLOW_SECRET_KEY=tu-secret-key-de-produccion

# CORS (tu dominio con HTTPS)
CORS_ORIGIN=https://tudominio.cl,https://www.tudominio.cl

# SMTP (Gmail o servicio transaccional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
EMAIL_FROM="Misión 3D <tu-email@gmail.com>"

# Return URL (HTTPS)
RETURN_URL=https://tudominio.cl/checkout.html
```

### Paso 3: Obtener Certificado SSL (Let's Encrypt)

**En Windows (PowerShell):**
```powershell
# 1. Edita obtener-certificado.ps1 y reemplaza:
#    - tudominio.cl con tu dominio
#    - tu-email@ejemplo.com con tu email real

# 2. Ejecuta el script
.\obtener-certificado.ps1
```

**En Linux/Mac:**
```bash
# 1. Edita obtener-certificado.sh y reemplaza:
#    - tudominio.cl con tu dominio
#    - tu-email@ejemplo.com con tu email real

# 2. Da permisos de ejecución
chmod +x obtener-certificado.sh

# 3. Ejecuta el script
./obtener-certificado.sh
```

**Nota**: El script primero obtiene un certificado de prueba (`--staging`). Si todo funciona, ejecuta el comando sin `--staging` para obtener el certificado real.

### Paso 4: Verificar Certificados

Verifica que los certificados se hayan creado correctamente:

```bash
ls -la ./certbot/conf/live/tudominio.cl/
```

Deberías ver:
- `fullchain.pem`
- `privkey.pem`
- `cert.pem`
- `chain.pem`

### Paso 5: Obtener Certificado Real (Sin Staging)

Si el certificado de prueba funcionó, obtén el certificado real:

**Windows:**
```powershell
docker run --rm `
  -v ${PWD}/certbot/conf:/etc/letsencrypt `
  -v ${PWD}/certbot/www:/var/www/certbot `
  certbot/certbot certonly --webroot `
  --webroot-path=/var/www/certbot `
  --email tu-email@ejemplo.com `
  --agree-tos `
  --no-eff-email `
  -d tudominio.cl `
  -d www.tudominio.cl
```

**Linux/Mac:**
```bash
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email tu-email@ejemplo.com \
  --agree-tos \
  --no-eff-email \
  -d tudominio.cl \
  -d www.tudominio.cl
```

### Paso 6: Levantar Servicios con SSL

```bash
# Construir e iniciar todos los servicios
docker-compose -f docker-compose-ssl.yml up -d --build

# Ver logs
docker-compose -f docker-compose-ssl.yml logs -f

# Ver solo logs del backend
docker-compose -f docker-compose-ssl.yml logs -f backend

# Ver solo logs de nginx
docker-compose -f docker-compose-ssl.yml logs -f nginx
```

### Paso 7: Verificar Despliegue

1. **Accede a tu sitio**: `https://tudominio.cl`
2. **Verifica SSL**: El navegador debe mostrar el candado verde
3. **Prueba la API**: `https://tudominio.cl/api/health` debe retornar `{"status":"ok"}`
4. **Revisa logs**: `docker-compose -f docker-compose-ssl.yml logs`

---

## 🔄 Renovación Automática de Certificados

El contenedor `certbot` se encarga de renovar automáticamente los certificados cada 12 horas. Let's Encrypt permite renovar certificados hasta 30 días antes de su vencimiento.

Para forzar una renovación manual:

```bash
docker-compose -f docker-compose-ssl.yml exec certbot certbot renew
```

Después de renovar, recarga Nginx:

```bash
docker-compose -f docker-compose-ssl.yml exec nginx nginx -s reload
```

---

## 🛠️ Comandos Útiles

### Ver estado de los contenedores
```bash
docker-compose -f docker-compose-ssl.yml ps
```

### Reiniciar un servicio específico
```bash
docker-compose -f docker-compose-ssl.yml restart nginx
docker-compose -f docker-compose-ssl.yml restart backend
```

### Detener todos los servicios
```bash
docker-compose -f docker-compose-ssl.yml down
```

### Detener y eliminar volúmenes (CUIDADO: borra certificados)
```bash
docker-compose -f docker-compose-ssl.yml down -v
```

### Ver logs en tiempo real
```bash
docker-compose -f docker-compose-ssl.yml logs -f --tail=100
```

### Acceder a un contenedor
```bash
docker-compose -f docker-compose-ssl.yml exec backend sh
docker-compose -f docker-compose-ssl.yml exec nginx sh
```

### Verificar configuración de Nginx
```bash
docker-compose -f docker-compose-ssl.yml exec nginx nginx -t
```

---

## 📊 Monitoreo y Debugging

### Ver métricas de Docker
```bash
docker stats
```

### Inspeccionar red
```bash
docker network inspect mision3d_mision3d-net
```

### Ver variables de entorno del backend
```bash
docker-compose -f docker-compose-ssl.yml exec backend env | grep FLOW
```

### Verificar salud del backend
```bash
curl http://localhost:3000/api/health
# O desde fuera del servidor:
curl https://tudominio.cl/api/health
```

---

## 🔒 Seguridad

### Headers de Seguridad (ya configurados en nginx-ssl.conf)

- **HSTS**: Fuerza HTTPS por 1 año
- **X-Frame-Options**: Previene clickjacking
- **X-Content-Type-Options**: Previene MIME sniffing
- **X-XSS-Protection**: Protección XSS en navegadores antiguos

### CORS Restringido

El backend solo acepta peticiones desde:
- Tu dominio configurado en `CORS_ORIGIN`
- Rechaza peticiones de otros orígenes

### Certificados SSL

- Renovación automática cada 12 horas
- Protocolo TLS 1.2 y 1.3
- Ciphers modernos y seguros

---

## 🚨 Troubleshooting

### Error: "Cannot get certificate"

**Problema**: Certbot no puede validar tu dominio.

**Solución**:
1. Verifica que tu dominio apunte a la IP del servidor:
   ```bash
   nslookup tudominio.cl
   ```
2. Asegúrate que el puerto 80 esté abierto:
   ```bash
   curl http://tudominio.cl/.well-known/acme-challenge/test
   ```
3. Revisa los logs de certbot:
   ```bash
   docker-compose -f docker-compose-ssl.yml logs certbot
   ```

### Error: "502 Bad Gateway"

**Problema**: Nginx no puede conectar con el backend.

**Solución**:
1. Verifica que el backend esté corriendo:
   ```bash
   docker-compose -f docker-compose-ssl.yml ps backend
   ```
2. Revisa logs del backend:
   ```bash
   docker-compose -f docker-compose-ssl.yml logs backend
   ```
3. Verifica conectividad en la red Docker:
   ```bash
   docker-compose -f docker-compose-ssl.yml exec nginx ping backend
   ```

### Error: "CORS policy blocked"

**Problema**: CORS no permite peticiones desde tu dominio.

**Solución**:
1. Verifica la variable `CORS_ORIGIN` en `.env`:
   ```env
   CORS_ORIGIN=https://tudominio.cl,https://www.tudominio.cl
   ```
2. Reinicia el backend:
   ```bash
   docker-compose -f docker-compose-ssl.yml restart backend
   ```

### Error: "Firebase credentials not found"

**Problema**: El archivo `firebase-credentials.json` no existe.

**Solución (Opción 1 - Recomendada)**:
1. Obtén las credenciales desde Firebase Console
2. Guárdalas en `firebase-credentials.json` en la raíz del proyecto
3. Reinicia el backend

**Solución (Opción 2 - Modo REST)**:
- El backend funciona automáticamente en modo REST API si no hay credenciales
- Solo perderás funcionalidad de Firebase Admin SDK (queries avanzadas)

---

## 📁 Estructura de Archivos para Producción

```
mision3d_cart_v2/
├── docker-compose.yml              # Compose con perfiles (dev/production)
├── docker-compose-ssl.yml          # Compose para producción con SSL
├── nginx-ssl.conf                  # Nginx config con SSL y reverse proxy
├── obtener-certificado.ps1         # Script Windows para obtener SSL
├── obtener-certificado.sh          # Script Linux/Mac para obtener SSL
├── .env                            # Variables de entorno (NO SUBIR A GIT)
├── .env.example                    # Template de variables
├── firebase-credentials.json       # Credenciales Firebase (NO SUBIR A GIT)
├── Dockerfile                      # Dockerfile frontend (nginx)
├── nginx.conf                      # Nginx config básico (sin SSL)
├── certbot/
│   ├── conf/                       # Certificados SSL (generados)
│   └── www/                        # ACME challenge (generados)
├── logs/
│   └── nginx/                      # Logs de Nginx (generados)
└── backend/
    ├── Dockerfile                  # Dockerfile backend (node)
    ├── server.js                   # API
    ├── flow.js                     # Flow SDK
    ├── package.json
    └── README.md
```

---

## 🎯 Checklist Pre-Producción

Antes de subir a producción, verifica:

- [ ] **DNS configurado**: Dominio apunta a la IP del servidor
- [ ] **Puertos abiertos**: 80 y 443 en firewall
- [ ] **Variables de entorno**: `.env` con valores de producción
- [ ] **Credenciales Flow**: API Key y Secret Key de producción
- [ ] **Firebase credentials**: `firebase-credentials.json` presente (opcional)
- [ ] **Dominio en archivos**: Reemplazado `tudominio.cl` en todos los archivos
- [ ] **Email SMTP**: Configurado y probado
- [ ] **Certificado SSL**: Obtenido y verificado (sin `--staging`)
- [ ] **Logs funcionando**: Directorios creados y permisos correctos
- [ ] **Health check**: Backend responde en `/api/health`
- [ ] **CORS**: Solo permite tu dominio
- [ ] **HTTPS funciona**: Navegador muestra candado verde
- [ ] **Payment flow**: Probado con Flow en modo producción

---

## 📞 Soporte

Si tienes problemas, revisa:
1. Logs de Docker Compose
2. Logs de Nginx en `./logs/nginx/`
3. Variables de entorno en `.env`
4. Estado de los contenedores con `docker-compose ps`

---

## 📚 Referencias

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Flow API Chile](https://www.flow.cl/docs/api.html)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
