<#
  setup-env.ps1
  Script interactivo para crear backend/.env a partir de preguntas.
  Uso: abrir PowerShell en la carpeta backend y ejecutar: .\setup-env.ps1
  Nota: el script convierte entradas seguras a texto plano y escribe .env localmente.
#>

function Read-SecurePlain([string]$prompt){
  $ss = Read-Host -AsSecureString -Prompt $prompt
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
  try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  return $plain
}

Write-Host "=== Configurar backend/.env (Mision3D) ===" -ForegroundColor Cyan

$admin = Read-SecurePlain "ADMIN_KEY (clave para endpoints admin)"
$supabaseUrl = Read-Host "SUPABASE_URL (ej: https://xxxx.supabase.co)"
$supabaseKey = Read-SecurePlain "SUPABASE_SERVICE_ROLE_KEY (service role key)"
$gaId = Read-Host "GA_MEASUREMENT_ID (ej: G-XXXXXX) [opcional]"
if(-not $gaId){ $gaId = 'G-XKQGMM6ZK0' }
$gaSecret = Read-SecurePlain "GA_API_SECRET (Measurement Protocol secret) [opcional]"
$port = Read-Host "PORT (por defecto 3000)"
if(-not $port){ $port = 3000 }

$envPath = Join-Path -Path (Get-Location) -ChildPath ".env"
Write-Host "Escribiendo archivo: $envPath" -ForegroundColor Green

$lines = @()
$lines += "ADMIN_KEY=$admin"
if($supabaseUrl -and $supabaseKey){
  $lines += "SUPABASE_URL=$supabaseUrl"
  $lines += "SUPABASE_SERVICE_ROLE_KEY=$supabaseKey"
} else {
  Write-Host "Aviso: SUPABASE no configurado (se puede llenar más tarde)." -ForegroundColor Yellow
}
$lines += "GA_MEASUREMENT_ID=$gaId"
$lines += "GA_API_SECRET=$gaSecret"
$lines += "PORT=$port"

try{
  $lines | Out-File -FilePath $envPath -Encoding utf8 -Force
  Write-Host "Archivo .env creado correctamente." -ForegroundColor Green
  Write-Host "Reinicia el servidor con: npm run dev (en carpeta backend)" -ForegroundColor Cyan
} catch {
  Write-Host "Error escribiendo .env: $_" -ForegroundColor Red
}

Write-Host "Hecho." -ForegroundColor Green
