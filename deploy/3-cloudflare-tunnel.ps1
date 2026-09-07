<#
.SYNOPSIS
  Expose Pravia sur pravia.my-officeapps.com via un tunnel Cloudflare.

.DESCRIPTION
  192.168.1.140 est une adresse privee : un enregistrement DNS pointant dessus
  serait inutilisable depuis Internet. Un tunnel Cloudflare resout cela sans
  ouvrir le moindre port :

      navigateur --HTTPS--> Cloudflare --tunnel sortant--> IIS (127.0.0.1)

  Le connecteur installe sur le serveur etablit lui-meme la liaison vers
  Cloudflare. Aucune redirection de port sur la box, aucune adresse IP publique
  requise, certificat TLS fourni et renouvele par Cloudflare, adresse reelle du
  serveur jamais exposee.

.NOTES
  A executer en tant qu'administrateur, sur la machine qui heberge IIS.
  Une etape ouvre le navigateur pour vous authentifier aupres de Cloudflare :
  le domaine my-officeapps.com doit deja etre gere dans votre compte.

.EXAMPLE
  .\3-cloudflare-tunnel.ps1 -Domaine pravia.my-officeapps.com -PortLocal 8080
#>
[CmdletBinding()]
param(
  [string]$Domaine = "pravia.my-officeapps.com",
  [int]$PortLocal = 8080,
  [string]$NomTunnel = "pravia",
  [switch]$InstallerService
)

$ErrorActionPreference = "Stop"

function Etape($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  [ok] $t" -ForegroundColor Green }
function Info($t) { Write-Host "  $t" -ForegroundColor Gray }
function Alerte($t) { Write-Host "  [!] $t" -ForegroundColor Yellow }

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Ce script doit etre lance dans une console PowerShell en tant qu'administrateur."
}

# ------------------------------------------------------------- installation

Etape "Connecteur cloudflared"

$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source

if (-not $cloudflared) {
  Info "Installation via winget..."
  try {
    & winget install --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
  } catch {
    Alerte "winget indisponible, telechargement direct"
    $cible = "C:\Program Files\cloudflared"
    New-Item -ItemType Directory -Path $cible -Force | Out-Null
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" `
      -OutFile "$cible\cloudflared.exe"
    $env:PATH = "$env:PATH;$cible"
    [Environment]::SetEnvironmentVariable("PATH", "$([Environment]::GetEnvironmentVariable('PATH','Machine'));$cible", "Machine")
  }
  $env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine")
  $cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
  if (-not $cloudflared) { throw "cloudflared reste introuvable. Installez-le manuellement puis relancez." }
}
Ok "cloudflared : $((& cloudflared --version) -join ' ')"

# ------------------------------------------------------- verification locale

Etape "Verification du site local"
try {
  $r = Invoke-WebRequest -Uri "http://localhost:$PortLocal/" -UseBasicParsing -TimeoutSec 20
  Ok "IIS repond sur le port $PortLocal (HTTP $($r.StatusCode))"
} catch {
  Alerte "Aucune reponse sur http://localhost:$PortLocal/"
  Alerte "Lancez d'abord 2-installer-iis.ps1 : le tunnel ne sert a rien sans site."
  exit 1
}

# ------------------------------------------------------------ authentification

Etape "Authentification Cloudflare"

$dossier = Join-Path $env:USERPROFILE ".cloudflared"
$certificat = Join-Path $dossier "cert.pem"

if (Test-Path $certificat) {
  Ok "Deja authentifie ($certificat)"
} else {
  Info "Votre navigateur va s'ouvrir : choisissez le domaine my-officeapps.com."
  & cloudflared tunnel login
  if (-not (Test-Path $certificat)) { throw "Authentification non aboutie." }
  Ok "Authentification reussie"
}

# ------------------------------------------------------------------- tunnel

Etape "Tunnel"

$existant = (& cloudflared tunnel list 2>&1) | Select-String -Pattern "\s$NomTunnel\s"
if ($existant) {
  Info "Tunnel $NomTunnel deja present"
} else {
  & cloudflared tunnel create $NomTunnel
  if ($LASTEXITCODE -ne 0) { throw "Creation du tunnel impossible." }
  Ok "Tunnel $NomTunnel cree"
}

# L'identifiant du tunnel est le nom du fichier de credentials genere.
$identifiants = Get-ChildItem $dossier -Filter "*.json" |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $identifiants) { throw "Fichier d'identifiants du tunnel introuvable dans $dossier" }
$identifiant = $identifiants.BaseName
Info "Identifiant : $identifiant"

# ------------------------------------------------------------ configuration

Etape "Fichier de configuration"

$configuration = @"
# Configuration du tunnel Pravia - genere le $(Get-Date -Format 'yyyy-MM-dd HH:mm')
tunnel: $identifiant
credentials-file: $($identifiants.FullName)

ingress:
  - hostname: $Domaine
    service: http://localhost:$PortLocal
    originRequest:
      # IIS attend l'en-tete Host du domaine public pour repondre correctement.
      httpHostHeader: $Domaine
      connectTimeout: 30s
      # Next met un instant a repondre sur une page rendue a la demande.
      noTLSVerify: true

  # Regle finale obligatoire : tout ce qui ne correspond pas est refuse.
  - service: http_status:404
"@

$fichierConfig = Join-Path $dossier "config.yml"
Set-Content -Path $fichierConfig -Value $configuration -Encoding UTF8
Ok "Configuration ecrite : $fichierConfig"

# --------------------------------------------------------------------- DNS

Etape "Enregistrement DNS"

# Cree un CNAME <identifiant>.cfargotunnel.com sur la zone, en proxy.
& cloudflared tunnel route dns $NomTunnel $Domaine 2>&1 | ForEach-Object { Info $_ }
if ($LASTEXITCODE -eq 0) {
  Ok "$Domaine pointe vers le tunnel"
} else {
  Alerte "L'enregistrement existe peut-etre deja : verifiez dans le tableau de bord Cloudflare"
  Info "  DNS > my-officeapps.com > $Domaine doit etre un CNAME vers $identifiant.cfargotunnel.com (proxy actif)"
}

# ------------------------------------------------------------------ service

if ($InstallerService) {
  Etape "Service Windows"
  $svc = Get-Service cloudflared -ErrorAction SilentlyContinue
  if ($svc) {
    Info "Service deja installe, redemarrage"
    Restart-Service cloudflared
  } else {
    & cloudflared service install
    Start-Sleep -Seconds 3
    Start-Service cloudflared -ErrorAction SilentlyContinue
    Ok "Service installe : le tunnel remontera automatiquement au demarrage"
  }
  Start-Sleep -Seconds 8
} else {
  Etape "Demarrage manuel"
  Info "Pour un essai immediat, dans une autre console :"
  Info "  cloudflared tunnel run $NomTunnel"
  Info ""
  Info "Pour un fonctionnement permanent, relancez ce script avec -InstallerService"
}

# ------------------------------------------------------------- verification

Etape "Verification"

Info "La propagation DNS demande generalement moins d'une minute."
$ok = $false
foreach ($essai in 1..6) {
  Start-Sleep -Seconds 10
  try {
    $r = Invoke-WebRequest -Uri "https://$Domaine/" -UseBasicParsing -TimeoutSec 20
    Ok "https://$Domaine repond (HTTP $($r.StatusCode))"
    $ok = $true
    break
  } catch {
    Info "essai $essai/6 : pas encore joignable"
  }
}

if (-not $ok) {
  Alerte "Le domaine ne repond pas encore. Verifiez que le tunnel tourne :"
  Info "  Get-Service cloudflared"
  Info "  cloudflared tunnel info $NomTunnel"
}

Etape "Termine"
Info "Adresse publique : https://$Domaine"
Info ""
Alerte "N'oubliez pas de reporter cette adresse dans le back-office :"
Info "  /admin/seo > Adresse du site > https://$Domaine"
Info "Sans cela, les URL canoniques et le sitemap resteront errones."
