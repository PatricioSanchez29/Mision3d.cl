# Configuración de Firebase Admin SDK

## Pasos para configurar Firebase Admin

### 1. Cambiar reglas de seguridad en Firebase Console

1. Ve a: https://console.firebase.google.com/project/mision3d-72b4a/database/mision3d-72b4a-default-rtdb/rules
2. Cambia las reglas a:

```json
{
  "rules": {
    ".read": "auth == null",
    ".write": "auth == null"
  }
}
```

3. Haz clic en **"Publicar"**

**⚠️ IMPORTANTE:** Estas reglas son para desarrollo. En producción debes usar reglas más restrictivas.

### 2. Generar credenciales de servicio (Service Account)

1. Ve a: https://console.firebase.google.com/project/mision3d-72b4a/settings/serviceaccounts/adminsdk
2. Selecciona **"Node.js"**
3. Haz clic en **"Generar nueva clave privada"**
4. Se descargará un archivo JSON (ejemplo: `mision3d-72b4a-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`)
5. **Renombra el archivo a:** `firebase-credentials.json`
6. **Mueve el archivo a:** `backend/firebase-credentials.json`
7. **NO subas este archivo a Git** (ya está en .gitignore)

### 3. Reiniciar el servidor

```bash
cd backend
npm start
```

Deberías ver:
```
✅ Credenciales Firebase encontradas
🔥 Firebase Admin inicializado
Backend escuchando en puerto 3000
```

## Verificar que funciona

1. Haz una compra de prueba en la página
2. Revisa la consola del servidor, deberías ver:
   ```
   ✅ [Firebase] Pedido creado: -AbCdEf123 commerceOrder: ORD-1761525757807
   ```
3. Verifica en Firebase Console que el pedido aparece en: https://console.firebase.google.com/project/mision3d-72b4a/database/mision3d-72b4a-default-rtdb/data

## Solución de problemas

### Error: "Permission denied"
- Verifica que las reglas de seguridad estén configuradas correctamente
- Asegúrate de haber publicado las reglas en Firebase Console

### Error: "Credential implementation provided to initializeApp() via the 'credential' property failed"
- Verifica que el archivo `firebase-credentials.json` esté en la carpeta `backend/`
- Verifica que el contenido del archivo sea JSON válido

### El servidor funciona pero no se guardan los pedidos
- Abre la consola del navegador y busca errores
- Revisa los logs del servidor backend
- Verifica que Firebase Admin se haya inicializado correctamente
