<#
.SYNOPSIS
  Ajoute pravia.my-officeapps.com a la configuration distante du tunnel Cloudflare.

.DESCRIPTION
  Le tunnel myoffice-tunnel est pilote a distance : il telecharge sa
  configuration depuis Cloudflare et ignore config.yml. Ajouter un hote dans le
  fichier local n'a donc aucun effet ; il faut modifier la configuration
  distante, ce que fait ce script via l'API.

  Les identifiants viennent de cert.pem, produit par `cloudflared tunnel login`.
  C'est la meme cle de service qu'utilise `cloudflared tunnel route dns`.

  Le script lit la configuration existante, la sauvegarde integralement, puis
  reecrit la liste des regles en y inserant le nouvel hote juste avant la regle
  de repli. Les onze autres sites sont repris tels quels.

.NOTES
  Aucun droit administrateur necessaire : il faut seulement pouvoir lire
  C:\Users\nab55\.cloudflared\cert.pem.

.EXAMPLE
  .\4-ajouter-hote-tunnel.ps1
  .\4-ajouter-hote-tunnel.ps1 -Simulation      # montre le resultat sans rien ecrire
#>
[CmdletBinding()]
param(
  [string]$Hote     = "pravia.my-officeapps.com",
  [string]$Service  = "https://localhost:443",
  [string]$TunnelId = "97f7c0f6-ed7e-4478-a11f-f9f62b6243d0",
  [string]$Cert     = "C:\Users\nab55\.cloudflared\cert.pem",
  [switch]$Simulation
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Etape($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Ok($t)    { Write-Host "  [ok] $t" -ForegroundColor Green }
function Info($t)  { Write-Host "  $t" -ForegroundColor Gray }

# ------------------------------------------------------------- identifiants

Etape "Identifiants"

if (-not (Test-Path $Cert)) { throw "Fichier d'identifiants introuvable : $Cert" }

# cert.pem porte un bloc ARGO TUNNEL TOKEN : du JSON encode en base64 qui
# contient l'identifiant de compte et la cle de service.
$texte = [IO.File]::ReadAllText($Cert)
$m = [regex]::Match($texte, '-----BEGIN ARGO TUNNEL TOKEN-----(.+?)-----END ARGO TUNNEL TOKEN-----', 'Singleline')
if (-not $m.Success) { throw "Bloc ARGO TUNNEL TOKEN introuvable dans $Cert" }

$jeton  = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(($m.Groups[1].Value -replace '\s', ''))) | ConvertFrom-Json
$compte = $jeton.accountID
if (-not $compte) {
  throw "Le jeton ne contient pas accountID (champs presents : $(($jeton.PSObject.Properties.Name) -join ', '))"
}

# Selon la version de cloudflared qui a produit cert.pem, le jeton porte soit un
# apiToken (authentification Bearer, cas courant depuis 2022), soit une
# serviceKey historique (en-tete X-Auth-User-Service-Key). On accepte les deux.
if ($jeton.apiToken) {
  $entetes = @{ "Authorization" = "Bearer $($jeton.apiToken)"; "Content-Type" = "application/json" }
  $mode = "apiToken (Bearer)"
} elseif ($jeton.serviceKey) {
  $entetes = @{ "X-Auth-User-Service-Key" = $jeton.serviceKey; "Content-Type" = "application/json" }
  $mode = "serviceKey"
} else {
  throw "Aucun identifiant exploitable dans le jeton (champs presents : $(($jeton.PSObject.Properties.Name) -join ', '))"
}

Info "Compte : $compte"
Info "Tunnel : $TunnelId"
Info "Authentification : $mode"
$url = "https://api.cloudflare.com/client/v4/accounts/$compte/cfd_tunnel/$TunnelId/configurations"

# ------------------------------------------------------- lecture et sauvegarde

Etape "Configuration distante actuelle"

$actuelle = Invoke-RestMethod -Uri $url -Headers $entetes -Method GET
if (-not $actuelle.success) { $actuelle.errors | ConvertTo-Json -Depth 8; throw "Lecture refusee par l'API" }

$regles = @($actuelle.result.config.ingress)
Info "version = $($actuelle.result.version), $($regles.Count) regles"
for ($i = 0; $i -lt $regles.Count; $i++) {
  $h = if ($regles[$i].hostname) { $regles[$i].hostname } else { "(repli)" }
  Info ("  #{0,-2} {1,-32} -> {2}" -f $i, $h, $regles[$i].service)
}

$sauvegarde = Join-Path $PSScriptRoot ("tunnel-config-avant-$Hote-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".json")
$actuelle.result | ConvertTo-Json -Depth 20 | Set-Content $sauvegarde -Encoding UTF8
Ok "Sauvegarde : $sauvegarde"

if ($regles | Where-Object { $_.hostname -eq $Hote }) {
  Ok "$Hote est deja present, rien a faire."
  return
}

# ------------------------------------------------------------- modification

Etape "Insertion de $Hote"

# L'ordre compte : Cloudflare retient la premiere regle qui correspond, et la
# derniere (sans hostname) attrape tout. On insere juste avant.
$repli = $regles | Where-Object { -not $_.hostname } | Select-Object -First 1
if (-not $repli) { throw "Regle de repli introuvable dans la configuration distante" }
$indexRepli = [array]::IndexOf($regles, $repli)

$nouvelle = [ordered]@{
  hostname      = $Hote
  service       = $Service
  originRequest = [ordered]@{ noTLSVerify = $true }
}

$liste = New-Object System.Collections.ArrayList
for ($i = 0; $i -lt $regles.Count; $i++) {
  if ($i -eq $indexRepli) { [void]$liste.Add($nouvelle) }
  [void]$liste.Add($regles[$i])
}

$corps = @{ config = @{ ingress = $liste } }
if ($actuelle.result.config.PSObject.Properties.Name -contains "warp-routing") {
  $corps.config."warp-routing" = $actuelle.result.config."warp-routing"
}

Info "Nouvelle liste :"
$j = 0
foreach ($r in $liste) {
  $h = if ($r.hostname) { $r.hostname } else { "(repli)" }
  Info ("  #{0,-2} {1,-32} -> {2}" -f $j, $h, $r.service)
  $j++
}

if ($Simulation) {
  Write-Host "`nSimulation : rien n'a ete envoye." -ForegroundColor Yellow
  return
}

# ----------------------------------------------------------------- ecriture

Etape "Envoi"

$payload = $corps | ConvertTo-Json -Depth 20
$ecriture = Invoke-RestMethod -Uri $url -Headers $entetes -Method PUT -Body $payload
if (-not $ecriture.success) { $ecriture.errors | ConvertTo-Json -Depth 8; throw "Ecriture refusee par l'API" }
Ok "Configuration ecrite, version = $($ecriture.result.version)"

Info "Le connecteur recoit la nouvelle configuration en direct, sans redemarrage."
Start-Sleep -Seconds 12

# -------------------------------------------------------------- verification

Etape "Verification"

foreach ($u in @("https://$Hote/", "https://$Hote/robots.txt", "https://$Hote/sitemap.xml",
                 "https://app.my-officeapps.com/", "https://quest.my-officeapps.com/")) {
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 60
    Ok "$u -> HTTP $($r.StatusCode), $($r.Content.Length) octets"
  } catch {
    Write-Host "  [!] $u -> $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

Write-Host ""
Info "En cas de probleme, la configuration precedente est dans :"
Info "  $sauvegarde"
Info "Elle se remet en place avec la meme API, methode PUT, en renvoyant son champ config."
