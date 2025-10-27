# Script para obtener el certificado SSL inicial con Let's Encrypt
# Ejecutar ANTES de levantar docker-compose-ssl.yml

# IMPORTANTE: Reemplaza tudominio.cl con tu dominio real antes de ejecutar

# 1. Crear directorios para certbot
New-Item -ItemType Directory -Force -Path ./certbot/conf
New-Item -ItemType Directory -Force -Path ./certbot/www
New-Item -ItemType Directory -Force -Path ./logs/nginx

# 2. Obtener certificado SSL (staging primero, para testing)
# NOTA: Elimina --staging cuando estés listo para obtener el certificado real
docker run --rm `
  -v ${PWD}/certbot/conf:/etc/letsencrypt `
  -v ${PWD}/certbot/www:/var/www/certbot `
  certbot/certbot certonly --webroot `
  --webroot-path=/var/www/certbot `
  --email tu-email@ejemplo.com `
  --agree-tos `
  --no-eff-email `
  --staging `
  -d tudominio.cl `
  -d www.tudominio.cl

Write-Host ""
Write-Host "========================================"
Write-Host "Certificado de prueba (staging) obtenido"
Write-Host "========================================"
Write-Host ""
Write-Host "PASOS SIGUIENTES:"
Write-Host "1. Verifica que los certificados esten en ./certbot/conf/live/tudominio.cl/"
Write-Host "2. Actualiza nginx-ssl.conf con tu dominio real"
Write-Host "3. Actualiza docker-compose-ssl.yml con tu dominio en CORS_ORIGIN y RETURN_URL"
Write-Host "4. Ejecuta este script SIN --staging para obtener certificado real:"
Write-Host ""
Write-Host "   docker run --rm -v `${PWD}/certbot/conf:/etc/letsencrypt -v `${PWD}/certbot/www:/var/www/certbot certbot/certbot certonly --webroot --webroot-path=/var/www/certbot --email tu-email@ejemplo.com --agree-tos --no-eff-email -d tudominio.cl -d www.tudominio.cl"
Write-Host ""
Write-Host "5. Luego levanta los servicios:"
Write-Host "   docker-compose -f docker-compose-ssl.yml up -d"
Write-Host ""
