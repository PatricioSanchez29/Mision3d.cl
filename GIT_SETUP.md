# 📦 Guía: Subir tu código a Git (GitHub/GitLab)

## 🔧 **Paso 1: Instalar Git**

### Windows (tu caso)

**Opción A: Instalador oficial**
1. Descarga Git desde: https://git-scm.com/download/win
2. Ejecuta el instalador
3. **Importante:** En la pantalla de "Adjusting your PATH", selecciona **"Git from the command line and also from 3rd-party software"**
4. Mantén las opciones por defecto en el resto
5. Reinicia PowerShell/CMD después de la instalación

**Opción B: Con Chocolatey** (si lo tienes instalado)
```powershell
choco install git -y
```

**Opción C: Con winget** (Windows 10/11)
```powershell
winget install --id Git.Git -e --source winget
```

### Verificar instalación

```powershell
# Reinicia PowerShell y ejecuta:
git --version
# Debe mostrar: git version 2.x.x
```

---

## 🎯 **Paso 2: Configurar Git (primera vez)**

```powershell
# Configurar tu nombre y email (aparecerán en los commits)
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"

# Opcional: Editor preferido (VSCode)
git config --global core.editor "code --wait"

# Verificar configuración
git config --list
```

---

## 🚀 **Paso 3: Inicializar repositorio local**

```powershell
# Navegar a tu proyecto
cd C:\Users\user1\Downloads\mision3d_cart_v2

# Inicializar Git
git init

# Ver estado
git status
# Verás todos los archivos sin seguimiento (untracked)
```

---

## 📂 **Paso 4: Hacer tu primer commit**

```powershell
# Agregar todos los archivos (ya tienes .gitignore configurado)
git add .

# Ver qué se agregó
git status

# Crear commit
git commit -m "Initial commit: E-commerce Mision3D con Flow y GA4"
```

---

## ☁️ **Paso 5: Crear repositorio remoto**

### Opción A: GitHub (recomendado)

1. Ve a https://github.com/new
2. Nombre del repo: `mision3d-ecommerce` (o el que prefieras)
3. **NO** marques "Initialize with README" (ya tienes uno)
4. Visibilidad: **Private** (si no quieres que sea público)
5. Click **"Create repository"**

### Opción B: GitLab

1. Ve a https://gitlab.com/projects/new
2. Nombre: `mision3d-ecommerce`
3. Visibilidad: **Private**
4. **NO** marques "Initialize with README"
5. Click **"Create project"**

---

## 🔗 **Paso 6: Conectar y subir código**

### Para GitHub:

```powershell
# Agregar remoto (reemplaza <usuario> con tu username)
git remote add origin https://github.com/<usuario>/mision3d-ecommerce.git

# Subir código
git push -u origin main
```

### Para GitLab:

```powershell
# Agregar remoto
git remote add origin https://gitlab.com/<usuario>/mision3d-ecommerce.git

# Subir código
git push -u origin main
```

**Si te pide credenciales:**
- Username: tu usuario de GitHub/GitLab
- Password: usa un **Personal Access Token** (no tu contraseña)

**Crear token:**
- GitHub: Settings → Developer settings → Personal access tokens → Generate new token (selecciona scopes: `repo`)
- GitLab: Preferences → Access Tokens → Create personal access token (scopes: `write_repository`)

---

## 🔐 **Paso 7: Configurar autenticación SSH (opcional pero recomendado)**

### Generar clave SSH

```powershell
# Generar clave (usa tu email de GitHub/GitLab)
ssh-keygen -t ed25519 -C "tu-email@ejemplo.com"

# Presiona Enter 3 veces (usa valores por defecto)

# Copiar clave pública
cat ~/.ssh/id_ed25519.pub | clip
# (Se copia al portapapeles)
```

### Agregar clave a GitHub/GitLab

**GitHub:**
1. Settings → SSH and GPG keys → New SSH key
2. Title: "PC Casa" (o el nombre que prefieras)
3. Pega la clave
4. Add SSH key

**GitLab:**
1. Preferences → SSH Keys
2. Pega la clave
3. Add key

### Cambiar remote a SSH

```powershell
# Reemplazar HTTPS por SSH
git remote set-url origin git@github.com:<usuario>/mision3d-ecommerce.git

# O para GitLab:
git remote set-url origin git@gitlab.com:<usuario>/mision3d-ecommerce.git

# Verificar
git remote -v
```

Ahora podrás hacer `git push` sin ingresar credenciales.

---

## 📝 **Comandos Git esenciales (día a día)**

### Ver cambios

```powershell
git status              # Ver archivos modificados
git diff                # Ver cambios en detalle
git log --oneline       # Ver historial de commits
```

### Guardar cambios

```powershell
# Flujo normal
git add .                              # Agregar todos los cambios
git commit -m "Descripción del cambio" # Crear commit
git push                               # Subir a GitHub/GitLab

# O todo en uno:
git commit -am "Mensaje" && git push
```

### Deshacer cambios

```powershell
# Descartar cambios locales (¡cuidado!)
git checkout -- archivo.js

# Deshacer último commit (sin perder cambios)
git reset --soft HEAD~1

# Ver qué cambió en un commit
git show <hash-del-commit>
```

### Ramas (opcional para features)

```powershell
# Crear rama nueva
git checkout -b feature/nuevo-catalogo

# Cambiar de rama
git checkout main

# Fusionar rama
git merge feature/nuevo-catalogo

# Subir rama
git push -u origin feature/nuevo-catalogo
```

---

## 🚨 **Importante: Archivos que NO deben subirse**

Ya creé un `.gitignore` que excluye:

❌ `.env` (credenciales Flow, SMTP)  
❌ `node_modules/` (dependencias)  
❌ `serviceAccount.json` (Firebase)  
❌ Certificados SSL  

**Si ya subiste archivos sensibles por error:**

```powershell
# Remover del repositorio (pero mantener local)
git rm --cached backend/.env
git commit -m "Remove sensitive files"
git push

# Luego cambiar credenciales comprometidas inmediatamente
```

---

## 🎯 **Workflow recomendado**

### Desarrollo diario:

```powershell
# 1. Al iniciar el día, actualiza tu repo
git pull

# 2. Trabaja en tu código...

# 3. Al terminar cambios importantes:
git add .
git commit -m "Fix: Corregir cálculo de envío en checkout"
git push

# 4. Commits descriptivos (usa prefijos):
# - feat: Nueva funcionalidad
# - fix: Corrección de bug
# - docs: Documentación
# - style: Formato/estilo
# - refactor: Refactorización
# - test: Tests
```

### Antes de desplegar a producción:

```powershell
# Crear tag de versión
git tag -a v1.0.0 -m "Release v1.0.0 - Lanzamiento inicial"
git push --tags

# Ver tags
git tag
```

---

## 🔄 **Clonar en otro PC/servidor**

```powershell
# Clonar repositorio
git clone https://github.com/<usuario>/mision3d-ecommerce.git
cd mision3d-ecommerce

# Configurar .env (nunca están en Git)
cp .env.example .env
nano .env  # o notepad .env en Windows

# Instalar dependencias
cd backend
npm install

# Listo para usar
npm start
```

---

## 📊 **Monitoreo del repositorio**

### GitHub Actions (CI/CD básico)

Puedes crear `.github/workflows/test.yml` para:
- Ejecutar tests automáticos
- Validar sintaxis
- Deploy automático a producción

Ejemplo básico:

```yaml
name: Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd backend && npm install
      - run: cd backend && npm test
```

---

## 🆘 **Solución de problemas comunes**

### "Permission denied (publickey)"
→ Configurar SSH correctamente (ver Paso 7)

### "fatal: not a git repository"
→ Ejecutar `git init` en la carpeta correcta

### "rejected: non-fast-forward"
→ Alguien más hizo cambios: `git pull --rebase` antes de `push`

### Conflictos de merge
```powershell
# Resolver manualmente los archivos marcados con <<<<<<
# Luego:
git add .
git commit -m "Resolve merge conflicts"
git push
```

---

## ✅ **Checklist final**

- [ ] Git instalado (`git --version` funciona)
- [ ] Configurado user.name y user.email
- [ ] Repositorio inicializado (`git init`)
- [ ] `.gitignore` en su lugar
- [ ] Primer commit hecho
- [ ] Repositorio remoto creado (GitHub/GitLab)
- [ ] Código subido (`git push`)
- [ ] SSH configurado (opcional)

---

## 🎉 **¡Listo!**

Ahora tu código está:
- ✅ Versionado
- ✅ Respaldado en la nube
- ✅ Listo para colaborar
- ✅ Preparado para CI/CD

**Siguiente paso:** Configura GitHub Actions para deploy automático o conecta con Railway/Render/DigitalOcean para deploy continuo.

---

**¿Dudas?** Revisa la documentación oficial:
- Git: https://git-scm.com/doc
- GitHub: https://docs.github.com
- GitLab: https://docs.gitlab.com
