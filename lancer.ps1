param(
  [switch]$SansApk,
  [switch]$SansTunnel,
  [switch]$Reinitialiser
)

$ErrorActionPreference = "Stop"
$racine = $PSScriptRoot
$backend = Join-Path $racine "backend\app\full-stack-fastapi-template\backend"
$modele = Join-Path $racine "backend\app\full-stack-fastapi-template"
$mobile = Join-Path $racine "mobile"
$admin = Join-Path $racine "admin-web"
$journal = Join-Path $env:TEMP "faso-neere-tunnel.log"

function Etape($texte) {
  Write-Host ""
  Write-Host "==> $texte" -ForegroundColor Green
}

function Fenetre($titre, $dossier, $commande) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = '$titre'; Set-Location '$dossier'; $commande"
}

if (-not (Test-Path (Join-Path $modele ".env"))) {
  Copy-Item (Join-Path $modele ".env.example") (Join-Path $modele ".env")
}

$jdk = Get-ChildItem "C:\Program Files\Microsoft" -Filter "jdk-21*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($jdk) { $env:JAVA_HOME = $jdk.FullName }

function BackendRepond {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $connexion = $client.BeginConnect("127.0.0.1", 8000, $null, $null)
    $ok = $connexion.AsyncWaitHandle.WaitOne(1500) -and $client.Connected
    return $ok
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

if ($Reinitialiser) {
  Etape "Remise a zero des donnees de demo"
  if (BackendRepond) { throw "Ferme d'abord la fenetre 'FASO NEERE - Backend', puis relance avec -Reinitialiser." }
  $baseDemo = Join-Path $backend "faso_neere.db"
  if (Test-Path $baseDemo) { Remove-Item $baseDemo }
  Write-Host "Base de demo effacee, elle sera recreee au demarrage."
}

Etape "Demarrage du backend (port 8000)"
if (BackendRepond) {
  Write-Host "Le backend tourne deja, on le garde."
} else {
  $migrations = ""
  $fichierEnv = Join-Path $modele ".env"
  if ((Test-Path $fichierEnv) -and (Select-String -Path $fichierEnv -Pattern "^\s*DATABASE_URL\s*=\s*[`"']?postgres" -Quiet)) { $migrations = "uv run python -m alembic upgrade head; " }
  Fenetre "FASO NEERE - Backend" $backend "uv sync; $($migrations)uv run python app/initial_data.py; uv run python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
}

$pret = $false
for ($i = 0; $i -lt 90; $i++) {
  if (BackendRepond) {
    $pret = $true
    break
  }
  Start-Sleep -Seconds 2
}
if (-not $pret) { throw "Le backend ne repond pas. Regarde la fenetre 'FASO NEERE - Backend'." }
Write-Host "Backend pret."

$adresseApi = "http://127.0.0.1:8000"
if (-not $SansTunnel) {
  Etape "Ouverture du tunnel internet"
  Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Seconds 1
  if (Test-Path $journal) { Remove-Item $journal -Force }
  $cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
  if (-not $cloudflared) {
    $cloudflared = @(
      "C:\Program Files (x86)\cloudflared\cloudflared.exe",
      "C:\Program Files\cloudflared\cloudflared.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  }
  if (-not $cloudflared) { throw "cloudflared n'est pas installe : winget install --id Cloudflare.cloudflared -e --source winget" }
  Start-Process $cloudflared -ArgumentList "tunnel", "--url", "http://127.0.0.1:8000" -RedirectStandardError $journal -WindowStyle Minimized
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $journal) {
      $trouve = Select-String -Path $journal -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -First 1
      if ($trouve) {
        $adresseApi = $trouve.Matches[0].Value
        break
      }
    }
  }
  if ($adresseApi -like "http://127.0.0.1*") { throw "Le tunnel n'a pas donne d'adresse. Verifie que cloudflared est installe." }
  Write-Host "Adresse publique de l'API : $adresseApi"
}

Set-Content (Join-Path $mobile ".env") "VITE_API_URL=$adresseApi"
Set-Content (Join-Path $admin ".env") "VITE_API_URL=http://127.0.0.1:8000"

Etape "Demarrage de l'admin et de l'app web"
Fenetre "FASO NEERE - Admin" $admin "npm run dev"
Fenetre "FASO NEERE - App" $mobile "npm run dev"

if (-not $SansApk) {
  Etape "Fabrication de l'APK"
  if (-not $jdk) { throw "Java 21 manquant pour l'APK : winget install --id Microsoft.OpenJDK.21 -e --source winget, ou relance avec -SansApk." }
  Set-Location $mobile
  if (-not (Test-Path (Join-Path $mobile "android"))) {
    Write-Host "Premiere fabrication : ajout de la plateforme Android."
    npx cap add android
    if ($LASTEXITCODE -ne 0) { throw "L'ajout de la plateforme Android a echoue." }
    npm run icones
  }
  npm run android
  if ($LASTEXITCODE -ne 0) { throw "La preparation de l'APK a echoue." }
  Set-Location (Join-Path $mobile "android")
  .\gradlew.bat assembleDebug
  if ($LASTEXITCODE -ne 0) { throw "La compilation Gradle a echoue." }
  Set-Location $racine
  $apk = Join-Path $racine "FASO-NEERE.apk"
  Copy-Item (Join-Path $mobile "android\app\build\outputs\apk\debug\app-debug.apk") $apk -Force
  Write-Host "APK pret : $apk"
  Start-Process explorer.exe "/select,`"$apk`""
}

Start-Sleep -Seconds 3
Start-Process "http://localhost:5174/admin"

Etape "Tout est lance"
Write-Host "Admin  : http://localhost:5174/admin  (admin@fasoneere.bf / admin12345)"
Write-Host "App    : http://localhost:5174"
Write-Host "API    : $adresseApi/docs"
if (-not $SansApk) { Write-Host "APK    : FASO-NEERE.apk a la racine du projet, a installer sur le telephone" }
Write-Host ""
Write-Host "Pour tout arreter : ferme les fenetres 'FASO NEERE' et la fenetre cloudflared."
