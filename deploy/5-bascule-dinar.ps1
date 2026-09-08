<#
.SYNOPSIS
  Bascule la production vers le dinar, les wilayas et la commande sans compte.

.DESCRIPTION
  Le passage au dinar et la refonte des adresses changent trop la structure pour
  une migration additive : le catalogue est reprice, Order perd ses colonnes
  d'adresse francaise au profit d'un couple wilaya/commune, userId devient
  facultatif, et deux tables apparaissent pour le decoupage administratif.

  Le script enchaine donc, apres avoir arrete le site :

    1. sauvegarde complete de la base ;
    2. suppression de toutes les tables ;
    3. creation du schema depuis dist-sql\pravia-schema.sql ;
    4. chargement du jeu de donnees depuis dist-sql\pravia-data.sql ;
    5. reglages propres a la production ;
    6. deploiement du paquet dist-iis et redemarrage.

  ATTENTION : les commandes, comptes et avis actuellement en base sont perdus.
  Ils proviennent tous du jeu de demonstration. La sauvegarde de l'etape 1
  permet de revenir en arriere (RESTORE DATABASE).

.NOTES
  A executer dans une console PowerShell ouverte en tant qu'administrateur,
  apres `npm run build:iis`.

.EXAMPLE
  .\5-bascule-dinar.ps1 -EmpreinteAdmin '$2b$10$...'
#>
[CmdletBinding()]
param(
  [string]$Instance = "SQLEXPRESS",
  [string]$Base = "Pravia",
  [string]$Destination = "C:\inetpub\pravia",
  [string]$Pool = "PraviaPool",
  [string]$AdresseSite = "https://pravia.my-officeapps.com",
  # Empreinte bcrypt du mot de passe administrateur. Vide : le seed laisse le
  # mot de passe de demonstration en place.
  [string]$EmpreinteAdmin = ""
)

$ErrorActionPreference = "Continue"

function Etape($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Ok($t)    { Write-Host "  [ok] $t" -ForegroundColor Green }
function Info($t)  { Write-Host "  $t" -ForegroundColor Gray }

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Ce script doit etre lance dans une console PowerShell en tant qu'administrateur."
}

$racine = Split-Path $PSScriptRoot -Parent
$serveur = if ($Instance -eq "MSSQLSERVER") { "localhost" } else { "localhost\$Instance" }

foreach ($f in @("dist-sql\pravia-schema.sql", "dist-sql\pravia-data.sql")) {
  if (-not (Test-Path (Join-Path $racine $f))) {
    throw "$f introuvable. Lancez d'abord : npm run build:iis"
  }
}

Import-Module WebAdministration -ErrorAction Stop

function Sql($fichier) {
  & sqlcmd -S $serveur -E -C -d $Base -b -h -1 -W -i $fichier
  if ($LASTEXITCODE -ne 0) { throw "sqlcmd a echoue sur $fichier (code $LASTEXITCODE)" }
}

# ------------------------------------------------------------------ arret

# Toute sortie prematurée doit rallumer le site : s'arreter en laissant le pool
# eteint transformerait un echec de migration en panne complete.
trap {
  Write-Host ""
  Write-Host "[!] $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "  Redemarrage du site." -ForegroundColor Yellow
  Start-WebAppPool -Name $Pool -ErrorAction SilentlyContinue
  break
}

Etape "Arret du site"
Stop-WebAppPool -Name $Pool -ErrorAction SilentlyContinue
for ($i = 0; $i -lt 20; $i++) {
  if ((Get-WebAppPoolState -Name $Pool).Value -eq "Stopped") { break }
  Start-Sleep -Seconds 1
}
Ok "Pool $Pool : $((Get-WebAppPoolState -Name $Pool).Value)"
Start-Sleep -Seconds 3

# ------------------------------------------------------------- sauvegarde

Etape "Sauvegarde de la base"
# BACKUP s'execute sous le compte de service SQL Server, pas sous la session qui
# lance ce script : ecrire dans C:\inetpub echouerait en "Access is denied".
# On demande donc a l'instance son propre dossier de sauvegarde, sur lequel elle
# a les droits par construction.
$dossier = (& sqlcmd -S $serveur -E -C -h -1 -W -Q "SET NOCOUNT ON; SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(4000));" | Where-Object { $_.Trim() }) | Select-Object -First 1
if (-not $dossier) { throw "Dossier de sauvegarde de l'instance introuvable." }
$dossier = $dossier.Trim()
Info "Dossier de l'instance : $dossier"

$sauvegarde = Join-Path $dossier "pravia-avant-dinar-$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
# Pas de COMPRESSION : Express Edition ne la prend pas en charge.
& sqlcmd -S $serveur -E -C -b -Q "BACKUP DATABASE [$Base] TO DISK = N'$sauvegarde' WITH INIT;"
if ($LASTEXITCODE -ne 0) { throw "La sauvegarde a echoue : on s'arrete la." }
if (-not (Test-Path $sauvegarde)) { throw "Sauvegarde absente : on s'arrete la." }
Ok "$sauvegarde ($([math]::Round((Get-Item $sauvegarde).Length / 1MB, 1)) Mo)"

# ------------------------------------------------------------- rechargement

Etape "Remise a zero du schema"
Sql (Join-Path $PSScriptRoot "pravia-vider-schema.sql")
Ok "Tables supprimees"

Etape "Creation du schema"
Sql (Join-Path $racine "dist-sql\pravia-schema.sql")
Ok "Schema cree"

Etape "Chargement des donnees"
Sql (Join-Path $racine "dist-sql\pravia-data.sql")
Ok "Donnees chargees"

Etape "Reglages de production"
$reglages = @"
SET NOCOUNT ON;
IF EXISTS (SELECT 1 FROM [dbo].[Setting] WHERE [key] = N'seo.siteUrl')
    UPDATE [dbo].[Setting] SET [value] = N'$AdresseSite' WHERE [key] = N'seo.siteUrl';
ELSE
    INSERT INTO [dbo].[Setting] ([key], [value]) VALUES (N'seo.siteUrl', N'$AdresseSite');
"@
if ($EmpreinteAdmin) {
  $reglages += @"

UPDATE [dbo].[User]
   SET [passwordHash] = N'$EmpreinteAdmin', [updatedAt] = SYSDATETIME()
 WHERE [email] = N'admin@pravia.com';
"@
}
$fichier = Join-Path $env:TEMP "pravia-reglages.sql"
Set-Content -Path $fichier -Value $reglages -Encoding UTF8
try { Sql $fichier } finally { Remove-Item $fichier -Force -ErrorAction SilentlyContinue }
Ok "Adresse du site$(if ($EmpreinteAdmin) { ' et mot de passe administrateur' }) appliques"

# ------------------------------------------------------------- verification

Etape "Controle du contenu"
& sqlcmd -S $serveur -E -C -d $Base -h -1 -W -Q @"
SET NOCOUNT ON;
SELECT 'tables  = ' + CAST(COUNT(*) AS varchar) FROM sys.tables;
SELECT 'Wilaya  = ' + CAST(COUNT(*) AS varchar) FROM [dbo].[Wilaya];
SELECT 'Commune = ' + CAST(COUNT(*) AS varchar) FROM [dbo].[Commune];
SELECT 'Product = ' + CAST(COUNT(*) AS varchar) FROM [dbo].[Product];
SELECT 'Order   = ' + CAST(COUNT(*) AS varchar) FROM [dbo].[Order];
SELECT 'devise  = ' + [value] FROM [dbo].[Setting] WHERE [key] = 'store.currency';
SELECT 'Galaxy S23 Ultra = ' + CAST(price / 100 AS varchar) + ' DA' FROM [dbo].[Product] WHERE slug = 'galaxy-s23-ultra';
SELECT 'mojibake arabe = ' + CAST(COUNT(*) AS varchar) FROM [dbo].[ProductTranslation] WHERE description LIKE N'%Ù%';
"@

# --------------------------------------------------------------- deploiement

Etape "Deploiement du paquet"
& (Join-Path $PSScriptRoot "2-installer-iis.ps1") -Source (Join-Path $racine "dist-iis") -Destination $Destination -Port 80
Info "Le controle final de l'installateur vise localhost sans en-tete d'hote : il n'est pas significatif ici."

Etape "Demarrage"
Start-WebAppPool -Name $Pool -ErrorAction SilentlyContinue
Start-Sleep -Seconds 25

Etape "Verification de l'origine"
foreach ($chemin in @('/', '/ar', '/fr', '/en', '/ar/produits')) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1$chemin" -Headers @{ Host = 'pravia.my-officeapps.com' } -UseBasicParsing -TimeoutSec 90
    Ok "$chemin -> HTTP $($r.StatusCode), $($r.Content.Length) octets"
  } catch { Write-Host "  [!] $chemin -> $($_.Exception.Message)" -ForegroundColor Yellow }
}

Write-Host ""
Info "En cas de probleme, la base d'avant se restaure avec :"
Info "  RESTORE DATABASE [$Base] FROM DISK = N'$sauvegarde' WITH REPLACE;"
