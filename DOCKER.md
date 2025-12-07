# Despliegue con Docker

Este proyecto incluye contenedores para:
- Backend (Node/Express) en el puerto 3000
- Frontend estático (Nginx) en el puerto 8080

## Requisitos
- Docker Desktop o Docker Engine + Docker Compose v2

## Archivos relevantes
- `backend/Dockerfile` → Imagen del API
- `Dockerfile` → Imagen del sitio estático (Nginx)
- `docker-compose.yml` → Orquestación local
- `.dockerignore` y `backend/.dockerignore` → Excluir archivos no necesarios

## Variables de entorno
Crea un archivo `.env` en la raíz (junto a `docker-compose.yml`) con tus claves:

```
FLOW_API_KEY=TU_API_KEY_FLOW
FLOW_SECRET=TU_FLOW_SECRET
FLOW_API_URL=https://sandbox.flow.cl/api
```

Firebase (opcional para desarrollo local):
- Si usas credenciales de servicio, coloca el archivo en `backend/firebase-credentials.json` y ajusta el `docker-compose.yml` para montarlo (ver más abajo).
- Si no lo montas, el backend funciona en modo básico sin credenciales.

## Construir e iniciar

```powershell
# Desde la carpeta raíz del proyecto
cd C:\Users\user1\Downloads\mision3d_cart_v2

docker compose build

docker compose up -d
```

Abre en el navegador:
- Frontend: http://localhost:8080
- Backend:  http://localhost:3000/api/health

Para ver logs:
```powershell
docker compose logs -f backend
```

Para detener y limpiar:
```powershell
docker compose down
```

## Montar credenciales de Firebase (opcional)
1) Asegúrate de tener el archivo `backend/firebase-credentials.json` (consulta `backend/FIREBASE_SETUP.md`).
2) Edita `docker-compose.yml` y descomenta el bloque de volúmenes del servicio `backend`:

```yaml
  backend:
    # ...
    volumes:
      - ./backend/firebase-credentials.json:/app/firebase-credentials.json:ro
```

Reinicia los contenedores:
```powershell
docker compose up -d --build
```

## Desarrollo en caliente (opcional)
Si quieres iterar rápidamente en el backend, puedes ejecutar el backend fuera de Docker con `npm run dev` y usar solo el contenedor del frontend, o crear un `docker-compose.override.yml` con bind mounts y `node --watch`.

## Notas
- El frontend llama al backend usando `http://localhost:3000`. Si cambias puertos, ajusta el código si fuera necesario.
- En producción, se recomienda un reverse proxy (Nginx/Traefik) con HTTPS.
