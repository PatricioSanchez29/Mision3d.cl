# Setup rápido del backend (Mision3D)

Este archivo explica cómo crear el archivo `backend/.env` y arrancar el servidor en desarrollo.

1) Abrir PowerShell en la carpeta `backend`:

```powershell
cd backend
```

2) Ejecutar el script interactivo para crear `.env`:

```powershell
.\setup-env.ps1
```

El script preguntará por `ADMIN_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GA_MEASUREMENT_ID` y `GA_API_SECRET`. Los valores se escribirán en `backend/.env`.

3) Instalar dependencias y arrancar el servidor:

```powershell
npm install
npm run dev
```

4) Probar endpoints de depuración:

- Validar admin key (dev):

```bash
curl -H "x-admin-key: TU_ADMIN_KEY" http://localhost:3000/debug/validate-admin-key
```

- Enviar evento fake de compra (dev):

```bash
curl "http://localhost:3000/debug/send-test-purchase?amount=15900&order=TEST123&email=demo@ejemplo.com"
```

Nota: no subas `.env` al repositorio ni compartas tus secretos públicamente.
