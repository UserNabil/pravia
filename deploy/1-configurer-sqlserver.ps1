<#
.SYNOPSIS
  Prepare SQL Server a recevoir Pravia : TCP/IP, authentification mixte,
  compte applicatif et base de donnees.

.DESCRIPTION
  Une installation SQL Server Express refuse par defaut ce dont Node a besoin :
    - TCP/IP est desactive (seule la memoire partagee est ouverte, inutilisable
      depuis un pilote Node) ;
    - seule l'authentification Windows est acceptee, alors que le pilote se
      connecte avec un identifiant SQL.
  Ce script leve les deux verrous, cree un compte applicatif aux droits limites,
  puis redemarre le service.

.NOTES
  A executer dans une console PowerShell ouverte en tant qu'administrateur.
  Le redemarrage du service interrompt brievement toutes les bases de
  l'instance : le script demande confirmation avant de le faire.

.EXAMPLE
  .\1-configurer-sqlserver.ps1 -Instance SQLEXPRESS -MotDePasse "..."
#>
[CmdletBinding()]
param(
  [string]$Instance = "SQLEXPRESS",
  [string]$Base = "Pravia",
  [string]$Compte = "pravia_app",
  [Parameter(Mandatory = $true)][string]$MotDePasse,
  [int]$Port = 1433,
  [switch]$OuvrirPareFeu,
  [switch]$SansConfirmation
)

$ErrorActionPreference = "Stop"

function Etape($texte) { Write-Host "`n=== $texte ===" -ForegroundColor Cyan }
function Ok($texte) { Write-Host "  [ok] $texte" -ForegroundColor Green }
function Info($texte) { Write-Host "  $texte" -ForegroundColor Gray }
function Alerte($texte) { Write-Host "  [!] $texte" -ForegroundColor Yellow }

# ---------------------------------------------------------------- prealables

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Ce script doit etre lance dans une console PowerShell en tant qu'administrateur."
}

if ($MotDePasse.Length -lt 12) {
  throw "Choisissez un mot de passe d'au moins 12 caracteres pour le compte applicatif."
}

$serveur = if ($Instance -eq "MSSQLSERVER") { "localhost" } else { "localhost\$Instance" }
$service = if ($Instance -eq "MSSQLSERVER") { "MSSQLSERVER" } else { "MSSQL`$$Instance" }

Etape "Verification de l'instance"
$svc = Get-Service -Name $service -ErrorAction SilentlyContinue
if (-not $svc) { throw "Service SQL Server introuvable : $service" }
Info "Service $service : $($svc.Status)"
if ($svc.Status -ne "Running") { Start-Service $service; Ok "Service demarre" }

# --------------------------------------------------------------- TCP/IP

Etape "Activation de TCP/IP"
$racine = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server"
$cle = (Get-ItemProperty "$racine\Instance Names\SQL").$Instance
if (-not $cle) { throw "Instance $Instance absente du registre." }

$tcp = "$racine\$cle\MSSQLServer\SuperSocketNetLib\Tcp"
$avant = (Get-ItemProperty $tcp).Enabled
Set-ItemProperty -Path $tcp -Name "Enabled" -Value 1
Info "TCP/IP : $avant -> 1"

# Port fixe sur IPAll : evite de dependre du service SQL Browser.
Set-ItemProperty -Path "$tcp\IPAll" -Name "TcpPort" -Value "$Port"
Set-ItemProperty -Path "$tcp\IPAll" -Name "TcpDynamicPorts" -Value ""
Ok "Port fixe a $Port"

# ------------------------------------------------- authentification mixte

Etape "Authentification mixte"
$cleServeur = "$racine\$cle\MSSQLServer"
$mode = (Get-ItemProperty $cleServeur -ErrorAction SilentlyContinue).LoginMode
if ($mode -eq 2) {
  Info "Deja active (LoginMode=2)"
} else {
  Set-ItemProperty -Path $cleServeur -Name "LoginMode" -Value 2
  Ok "LoginMode : $mode -> 2 (Windows + SQL)"
}

# --------------------------------------------------------------- redemarrage

Etape "Redemarrage du service"
Alerte "Toutes les bases de l'instance $Instance seront brievement indisponibles."
if (-not $SansConfirmation) {
  $reponse = Read-Host "  Redemarrer maintenant ? (o/N)"
  if ($reponse -notmatch '^[oOyY]$') {
    Alerte "Redemarrage reporte. Les changements ne prendront effet qu'apres :"
    Info "  Restart-Service '$service' -Force"
    exit 0
  }
}
Restart-Service -Name $service -Force
Start-Sleep -Seconds 5
Ok "Service redemarre"

# ---------------------------------------------------- base et compte applicatif

Etape "Base de donnees et compte applicatif"

# Le mot de passe part par variable sqlcmd : il n'apparait pas dans le T-SQL.
$sql = @"
IF DB_ID(N'$Base') IS NULL
BEGIN
    CREATE DATABASE [$Base];
    PRINT 'Base $Base creee';
END
ELSE PRINT 'Base $Base deja presente';
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$Compte')
BEGIN
    CREATE LOGIN [$Compte] WITH PASSWORD = N'`$(MDP)', CHECK_POLICY = ON;
    PRINT 'Identifiant $Compte cree';
END
ELSE
BEGIN
    ALTER LOGIN [$Compte] WITH PASSWORD = N'`$(MDP)';
    PRINT 'Mot de passe de $Compte mis a jour';
END
GO

USE [$Base];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$Compte')
    CREATE USER [$Compte] FOR LOGIN [$Compte];
GO

-- Lecture et ecriture des donnees uniquement : l'application n'a jamais besoin
-- de modifier la structure, le schema etant applique separement.
ALTER ROLE db_datareader ADD MEMBER [$Compte];
ALTER ROLE db_datawriter ADD MEMBER [$Compte];
PRINT 'Droits lecture/ecriture accordes a $Compte';
GO
"@

$fichier = Join-Path $env:TEMP "pravia-configuration.sql"
Set-Content -Path $fichier -Value $sql -Encoding UTF8
try {
  & sqlcmd -S $serveur -E -C -v MDP="$MotDePasse" -i $fichier
  if ($LASTEXITCODE -ne 0) { throw "sqlcmd a echoue (code $LASTEXITCODE)" }
} finally {
  Remove-Item $fichier -Force -ErrorAction SilentlyContinue
}
Ok "Base et compte prets"

# ------------------------------------------------------------------ pare-feu

if ($OuvrirPareFeu) {
  Etape "Pare-feu"
  $regle = "SQL Server ($Instance) - Pravia"
  if (Get-NetFirewallRule -DisplayName $regle -ErrorAction SilentlyContinue) {
    Info "Regle deja presente"
  } else {
    New-NetFirewallRule -DisplayName $regle -Direction Inbound -Protocol TCP `
      -LocalPort $Port -Action Allow -Profile Private | Out-Null
    Ok "Port $Port ouvert sur le profil reseau prive"
  }
  Alerte "N'ouvrez ce port que si SQL Server doit etre joignable depuis une autre machine."
}

# ------------------------------------------------------------- verification

Etape "Verification de la connexion applicative"
$test = & sqlcmd -S "localhost,$Port" -U $Compte -P $MotDePasse -d $Base -C -h -1 `
  -Q "SET NOCOUNT ON; SELECT 'connexion applicative operationnelle';" 2>&1

if ($LASTEXITCODE -eq 0) {
  Ok ($test -join " ").Trim()
} else {
  Alerte "La connexion en TCP a echoue :"
  $test | ForEach-Object { Info $_ }
  Alerte "Verifiez que le service a bien redemarre, puis relancez ce script."
  exit 1
}

Etape "Chaine de connexion a reporter dans .env.production"
Write-Host "DATABASE_PROVIDER=`"sqlserver`"" -ForegroundColor White
Write-Host "DATABASE_URL=`"sqlserver://localhost:$Port;database=$Base;user=$Compte;password=VOTRE_MOT_DE_PASSE;encrypt=true;trustServerCertificate=true`"" -ForegroundColor White
Write-Host ""
Info "Depuis une autre machine, remplacez localhost par l'adresse du serveur."
