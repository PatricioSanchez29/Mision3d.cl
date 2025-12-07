# Script Bash para obtener el certificado SSL inicial con Let's Encrypt
# Ejecutar ANTES de levantar docker-compose-ssl.yml

# IMPORTANTE: Reemplaza tudominio.cl con tu dominio real antes de ejecutar

#!/bin/bash

# 1. Crear directorios para certbot
mkdir -p ./certbot/conf
mkdir -p ./certbot/www
mkdir -p ./logs/nginx

# 2. Obtener certificado SSL (staging primero, para testing)
# NOTA: Elimina --staging cuando estés listo para obtener el certificado real
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email tu-email@ejemplo.com \
  --agree-tos \
  --no-eff-email \
  --staging \
  -d tudominio.cl \
  -d www.tudominio.cl

echo ""
echo "========================================"
echo "Certificado de prueba (staging) obtenido"
echo "========================================"
echo ""
echo "PASOS SIGUIENTES:"
echo "1. Verifica que los certificados estén en ./certbot/conf/live/tudominio.cl/"
echo "2. Actualiza nginx-ssl.conf con tu dominio real"
echo "3. Actualiza docker-compose-ssl.yml con tu dominio en CORS_ORIGIN y RETURN_URL"
echo "4. Ejecuta este script SIN --staging para obtener certificado real:"
echo ""
echo "   docker run --rm -v \$(pwd)/certbot/conf:/etc/letsencrypt -v \$(pwd)/certbot/www:/var/www/certbot certbot/certbot certonly --webroot --webroot-path=/var/www/certbot --email tu-email@ejemplo.com --agree-tos --no-eff-email -d tudominio.cl -d www.tudominio.cl"
echo ""
echo "5. Luego levanta los servicios:"
echo "   docker-compose -f docker-compose-ssl.yml up -d"
echo ""
