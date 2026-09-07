<#
.SYNOPSIS
  Installe Pravia dans IIS : pool d'applications, site, droits sur les fichiers.

.DESCRIPTION
  IIS ne sait pas executer du JavaScript. Le module HttpPlatformHandler lance
  le processus Node, lui attribue un port interne libre et lui relaie les
  requetes ; IIS conserve la gestion du demarrage, du redemarrage apres
  plantage et du recyclage.

  Le script verifie les prerequis, copie le paquet, cree le pool et le site,
  puis ajuste les droits du dossier.

.NOTES
  A executer en tant qu'administrateur, depuis le dossier deploy du paquet.

.EXAMPLE
  .\2-installer-iis.ps1 -Source .\dist-iis -Destination C:\inetpub\pravia -Port 8080
#>
[CmdletBinding()]
param(
  [string]$Source = ".\dist-iis",
  [string]$Destination = "C:\inetpub\pravia",
  [string]$NomSite = "Pravia",
  [int]$Port = 8080,
  [string]$EnTete = ""
)

$ErrorActionPreference = "Stop"

function Etape($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  [ok] $t" -ForegroundColor Green }
function Info($t) { Write-Host "  $t" -ForegroundColor Gray }
function Alerte($t) { Write-Host "  [!] $t" -ForegroundColor Yellow }

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Ce script doit etre lance dans une console PowerShell en tant qu'administrateur."
}

# ---------------------------------------------------------------- prerequis

Etape "Prerequis"

if (-not (Get-Service W3SVC -ErrorAction SilentlyContinue)) {
  throw "IIS n'est pas installe. Activez le role Serveur Web (IIS) dans les fonctionnalites Windows."
}
Ok "IIS present"

Import-Module WebAdministration -ErrorAction Stop
Ok "Module WebAdministration charge"

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { throw "Node.js introuvable dans le PATH. Installez Node.js 20 ou superieur." }
$versionNode = (& node --version)
Info "Node : $versionNode ($node)"
if ([int](($versionNode -replace '^v(\d+)\..*$', '$1')) -lt 20) {
  throw "Node.js 20 minimum est requis (version detectee : $versionNode)."
}

# HttpPlatformHandler s'enregistre comme module global dans IIS.
$modules = & "$env:SystemRoot\System32\inetsrv\appcmd.exe" list modules 2>$null
if ($modules -notmatch "httpPlatformHandler") {
  Alerte "HttpPlatformHandler n'est pas installe."
  Info "Telechargez-le ici, puis relancez ce script :"
  Info "  https://www.iis.net/downloads/microsoft/httpplatformhandler"
  throw "Prerequis manquant : HttpPlatformHandler"
}
Ok "HttpPlatformHandler present"

# ------------------------------------------------------------------- copie

Etape "Copie des fichiers"

if (-not (Test-Path $Source)) { throw "Paquet introuvable : $Source (lancez 'npm run build:iis')" }

$config = Join-Path $Destination ".env.production"
$sauvegarde = $null
if (Test-Path $config) {
  # La configuration en place contient les secrets : on la preserve.
  $sauvegarde = Get-Content $config -Raw
  Info "Configuration existante sauvegardee"
}

New-Item -ItemType Directory -Path $Destination -Force | Out-Null
Copy-Item -Path (Join-Path $Source "*") -Destination $Destination -Recurse -Force
Ok "Fichiers copies vers $Destination"

if ($sauvegarde) {
  Set-Content -Path $config -Value $sauvegarde -NoNewline
  Ok "Configuration restauree"
} elseif (-not (Test-Path $config)) {
  Copy-Item (Join-Path $Destination ".env.production.example") $config
  Alerte "Completez $config avant de demarrer le site."
}

New-Item -ItemType Directory -Path (Join-Path $Destination "logs") -Force | Out-Null

# ---------------------------------------------------------- pool et site

Etape "Pool d'applications"

$pool = "PraviaPool"
if (Test-Path "IIS:\AppPools\$pool") {
  Info "Pool $pool deja present"
} else {
  New-WebAppPool -Name $pool | Out-Null
  Ok "Pool $pool cree"
}

# Aucun code .NET n'est execute : le pool ne sert qu'a porter le processus Node.
Set-ItemProperty "IIS:\AppPools\$pool" -Name managedRuntimeVersion -Value ""
# Sans demarrage automatique ni recyclage horaire, la premiere visite du matin
# attendrait le demarrage complet de Next.
Set-ItemProperty "IIS:\AppPools\$pool" -Name startMode -Value "AlwaysRunning"
Set-ItemProperty "IIS:\AppPools\$pool" -Name processModel.idleTimeout -Value "00:00:00"
Set-ItemProperty "IIS:\AppPools\$pool" -Name recycling.periodicRestart.time -Value "00:00:00"
Ok "Pool configure (toujours actif, sans recyclage programme)"

Etape "Site web"

if (Test-Path "IIS:\Sites\$NomSite") {
  Info "Site $NomSite deja present, mise a jour"
  Set-ItemProperty "IIS:\Sites\$NomSite" -Name physicalPath -Value $Destination
  Set-ItemProperty "IIS:\Sites\$NomSite" -Name applicationPool -Value $pool
} else {
  New-Website -Name $NomSite -PhysicalPath $Destination -ApplicationPool $pool `
    -Port $Port -HostHeader $EnTete | Out-Null
  Ok "Site $NomSite cree sur le port $Port"
}

Set-ItemProperty "IIS:\Sites\$NomSite" -Name serverAutoStart -Value $true

# ------------------------------------------------------------------- droits

Etape "Droits sur les fichiers"

$identite = "IIS AppPool\$pool"

$acl = Get-Acl $Destination
$lecture = New-Object System.Security.AccessControl.FileSystemAccessRule(
  $identite, "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($lecture)
Set-Acl -Path $Destination -AclObject $acl
Ok "Lecture accordee a $identite"

# Node ecrit ses journaux et le cache d'images de Next.
foreach ($dossier in @("logs", ".next\cache")) {
  $chemin = Join-Path $Destination $dossier
  New-Item -ItemType Directory -Path $chemin -Force | Out-Null
  $a = Get-Acl $chemin
  $a.SetAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
    $identite, "Modify", "ContainerInherit,ObjectInherit", "None", "Allow")))
  Set-Acl -Path $chemin -AclObject $a
}
Ok "Ecriture accordee sur logs et .next\cache"

# Le fichier de secrets n'est lisible que par le pool et les administrateurs.
if (Test-Path $config) {
  $a = Get-Acl $config
  $a.SetAccessRuleProtection($true, $false)
  $a.SetAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($identite, "Read", "Allow")))
  $a.SetAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule("BUILTIN\Administrators", "FullControl", "Allow")))
  $a.SetAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule("NT AUTHORITY\SYSTEM", "FullControl", "Allow")))
  Set-Acl -Path $config -AclObject $a
  Ok "Acces a .env.production restreint"
}

# ---------------------------------------------------------------- demarrage

Etape "Demarrage"

Start-WebAppPool -Name $pool -ErrorAction SilentlyContinue
Start-Website -Name $NomSite -ErrorAction SilentlyContinue
Start-Sleep -Seconds 8

$url = "http://localhost:$Port/"
try {
  $reponse = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 45
  Ok "Site operationnel : HTTP $($reponse.StatusCode) sur $url"
} catch {
  Alerte "Le site ne repond pas encore : $($_.Exception.Message)"
  Info "Consultez les journaux Node : $Destination\logs\"
  Info "Verifiez d'abord le contenu de $config"
  exit 1
}

Etape "Termine"
Info "Site      : $url"
Info "Dossier   : $Destination"
Info "Journaux  : $Destination\logs\"
Info ""
Info "Etape suivante : exposer le site via Cloudflare (3-cloudflare-tunnel.ps1)"
