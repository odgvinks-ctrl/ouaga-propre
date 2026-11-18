param(
  [switch]$SansApk,
  [switch]$Reinitialiser
)

$ErrorActionPreference = "Stop"
$racine = $PSScriptRoot
$mobile = Join-Path $racine "mobile"
Set-Location $racine

function Etape($texte) {
  Write-Host ""
  Write-Host "==> $texte" -ForegroundColor Green
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker n'est pas installe ou Docker Desktop n'est pas lance." }
docker info *> $null
if ($LASTEXITCODE -ne 0) { throw "Docker Desktop n'est pas demarre. Ouvre-le, attends qu'il soit pret, puis relance." }

if ($Reinitialiser) {
  Etape "Remise a zero des donnees de demo"
  docker compose down -v
}

Etape "Construction et demarrage des conteneurs"
docker compose up --build -d
if ($LASTEXITCODE -ne 0) { throw "Le lancement Docker a echoue. Regarde : docker compose logs" }

Etape "Attente de l'adresse internet (tunnel)"
$adresse = $null
for ($i = 0; $i -lt 90; $i++) {
  Start-Sleep -Seconds 2
  $trouve = docker compose logs tunnel 2>&1 | Select-String -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -Last 1
  if ($trouve) {
    $adresse = $trouve.Matches[0].Value
    break
  }
}
if (-not $adresse) { throw "Le tunnel n'a pas donne d'adresse. Regarde : docker compose logs tunnel" }
Write-Host "Adresse internet : $adresse"
Set-Clipboard -Value $adresse

if (-not $SansApk) {
  Etape "Fabrication de l'APK"
  $jdk = Get-ChildItem "C:\Program Files\Microsoft" -Filter "jdk-21*" -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $jdk) { throw "Java 21 manquant pour l'APK : winget install --id Microsoft.OpenJDK.21 -e --source winget, ou relance avec -SansApk." }
  $env:JAVA_HOME = $jdk.FullName
  Set-Location $mobile
  if (-not (Test-Path (Join-Path $mobile "node_modules"))) { npm install }
  Set-Content (Join-Path $mobile ".env") "VITE_API_URL=$adresse"
  if (-not (Test-Path (Join-Path $mobile "android"))) {
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

Start-Process "http://localhost:8080/admin"

Etape "Tout est lance"
Write-Host "Admin     : http://localhost:8080/admin  (admin@fasoneere.bf / admin12345)"
Write-Host "App web   : http://localhost:8080"
Write-Host "Telephone : $adresse  (copiee dans le presse-papiers)"
Write-Host ""
Write-Host "Si l'adresse change apres un redemarrage, ouvre l'app > Connexion > Adresse du serveur, et colle la nouvelle."
Write-Host "Pour tout arreter : docker compose down"
