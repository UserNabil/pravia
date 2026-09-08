<#
.SYNOPSIS
  Publie le site sur pravia-dz.com via le tunnel Cloudflare existant.

.DESCRIPTION
  Le domaine etant gere par le meme compte Cloudflare que le tunnel, tout se
  fait par l'API, avec les identifiants deja presents sur le serveur :

    1. enregistrements DNS : pravia-dz.com et www, en CNAME proxifie vers le
       tunnel (Cloudflare aplatit le CNAME a l'apex, c'est donc permis) ;
    2. hotes publics ajoutes a la configuration distante du tunnel.

  Le tunnel est pilote a distance : il telecharge sa configuration depuis
  Cloudflare et ignore config.yml. C'est donc la configuration distante qui est
  modifiee, apres sauvegarde integrale.

  La liaison IIS cote origine doit exister au prealable (elle sert le site sur
  http://localhost:80 avec l'en-tete d'hote). Le trafic entre cloudflared et IIS
  reste sur la boucle locale : il n'a pas besoin d'etre chiffre, et le domaine
  n'a de toute facon pas de certificat d'origine.

.NOTES
  Aucun droit administrateur necessaire : il faut seulement pouvoir lire
  C:\Users\nab55\.cloudflared\cert.pem.

.EXAMPLE
  .\6-domaine-pravia-dz.ps1
  .\6-domaine-pravia-dz.ps1 -Simulation
#>
[CmdletBinding()]
param(
  [string]$Domaine  = "pravia-dz.com",
  [string]$Service  = "http://localhost:80",
  [string]$TunnelId = "97f7c0f6-ed7e-4478-a11f-f9f62b6243d0",
  [string]$Cert     = "C:\Users\nab55\.cloudflared\cert.pem",
  # Jeton d'API Cloudflare. Celui de cert.pem est emis pour une seule zone au
  # moment du `cloudflared tunnel login` et ne peut pas etre elargi : pour un
  # domaine acquis ensuite, il en faut un cree depuis le tableau de bord.
  # Permissions attendues : Zone > DNS > Edit, et Account > Cloudflare Tunnel > Edit.
  [string]$ApiToken = "",
  # Identifiant du compte Cloudflare proprietaire du tunnel. Il est fourni
  # explicitement car lister les comptes reclame la permission Account Settings
  # > Read, qu'un jeton limite au tunnel et au DNS n'a pas — et n'a pas besoin
  # d'avoir pour travailler sur un compte connu.
  [string]$CompteId = "e11dc492081fa60452317d33c3ebb5b8",
  [switch]$SansWww,
  # Le jeton de cert.pem a ete emis pour une zone precise : il ne voit pas
  # forcement un domaine achete plus tard. Dans ce cas les enregistrements DNS
  # se creent depuis le tableau de bord, et ce script se limite au tunnel.
  [switch]$SansDns,
  # Liste les zones que le jeton peut atteindre, puis s'arrete. Repond a la
  # seule question qui compte quand le DNS echoue : ce jeton voit-il la zone ?
  [switch]$Zones,
  [switch]$Simulation
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Etape($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Ok($t)    { Write-Host "  [ok] $t" -ForegroundColor Green }
function Info($t)  { Write-Host "  $t" -ForegroundColor Gray }
function Alerte($t){ Write-Host "  [!] $t" -ForegroundColor Yellow }

# ------------------------------------------------------------- identifiants

Etape "Identifiants"

if ($ApiToken) {
  $entetes = @{ "Authorization" = "Bearer $ApiToken"; "Content-Type" = "application/json" }
  $verif = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/user/tokens/verify" -Headers $entetes -Method GET
  if (-not $verif.success) { $verif.errors | ConvertTo-Json -Depth 8; throw "Jeton refuse par Cloudflare." }
  Ok "Jeton d'API valide ($($verif.result.status))"

  if (-not $CompteId) { throw "Precisez -CompteId : l'identifiant du compte proprietaire du tunnel." }
  $compte = $CompteId
  Info "Compte : $compte"
  Info "Tunnel : $TunnelId"
}
else {
if (-not (Test-Path $Cert)) { throw "Fichier d'identifiants introuvable : $Cert" }

$texte = [IO.File]::ReadAllText($Cert)
$m = [regex]::Match($texte, '-----BEGIN ARGO TUNNEL TOKEN-----(.+?)-----END ARGO TUNNEL TOKEN-----', 'Singleline')
if (-not $m.Success) { throw "Bloc ARGO TUNNEL TOKEN introuvable dans $Cert" }

$jeton  = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(($m.Groups[1].Value -replace '\s', ''))) | ConvertFrom-Json
$compte = $jeton.accountID
if (-not $compte) { throw "accountID absent du jeton." }

if ($jeton.apiToken) {
  $entetes = @{ "Authorization" = "Bearer $($jeton.apiToken)"; "Content-Type" = "application/json" }
} elseif ($jeton.serviceKey) {
  $entetes = @{ "X-Auth-User-Service-Key" = $jeton.serviceKey; "Content-Type" = "application/json" }
} else {
  throw "Aucun identifiant exploitable dans le jeton."
}
Info "Compte : $compte"
Info "Tunnel : $TunnelId"
}

$hotes = if ($SansWww) { @($Domaine) } else { @($Domaine, "www.$Domaine") }
$cible = "$TunnelId.cfargotunnel.com"

if ($Zones) {
  Etape "Zones visibles par ce jeton"
  $page = 1
  do {
    $r = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones?per_page=50&page=$page" -Headers $entetes -Method GET
    if (-not $r.success) { $r.errors | ConvertTo-Json -Depth 8; throw "Lecture refusee" }
    foreach ($z in $r.result) { Info ("{0,-32} {1,-10} {2}" -f $z.name, $z.status, $z.id) }
    $page++
  } while ($r.result_info -and $page -le $r.result_info.total_pages)

  Write-Host ""
  Info "Si $Domaine figure ci-dessus, relancez sans -SansDns : le script creera les"
  Info "enregistrements. Sinon, ils sont a ajouter depuis le tableau de bord."
  return
}

# ------------------------------------------------------------------ zone

Etape "Zone $Domaine"
$zoneId = $null

if ($SansDns) {
  Info "DNS ignore a votre demande."
} else {
  # Nom distinct du parametre -Zones : PowerShell ignore la casse, et $zones
  # ecraserait le commutateur, provoquant une erreur de conversion.
  $recherche = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones?name=$Domaine" -Headers $entetes -Method GET -ErrorAction SilentlyContinue
  if ($recherche.success -and $recherche.result.Count) {
    $zoneId = $recherche.result[0].id
    Ok "Zone trouvee : $zoneId ($($recherche.result[0].status))"
  } else {
    # Echec attendu quand le domaine a ete achete apres l'emission du jeton :
    # on continue malgre tout, la configuration du tunnel etant, elle, portee
    # par le compte et non par la zone.
    Alerte "Zone $Domaine invisible avec ces identifiants : les enregistrements DNS devront etre crees depuis le tableau de bord."
    Info "  Type CNAME, proxifie (nuage orange), pour chacun de ces noms :"
    foreach ($h in $hotes) { Info "    $h  ->  $cible" }
  }
}

# -------------------------------------------------------------------- DNS

Etape "Enregistrements DNS"
if (-not $zoneId) {
  Alerte "Etape sautee : zone inaccessible."
}
foreach ($h in ($(if ($zoneId) { $hotes } else { @() }))) {
  $existants = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?name=$h" -Headers $entetes -Method GET
  $corps = @{ type = "CNAME"; name = $h; content = $cible; proxied = $true; ttl = 1 } | ConvertTo-Json

  if ($Simulation) { Info "$h -> $cible (simulation)"; continue }

  if ($existants.result.Count) {
    $id = $existants.result[0].id
    $r = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$id" -Headers $entetes -Method PUT -Body $corps
    if ($r.success) { Ok "$h mis a jour -> $cible" } else { $r.errors | ConvertTo-Json -Depth 8 }
  } else {
    $r = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $entetes -Method POST -Body $corps
    if ($r.success) { Ok "$h cree -> $cible" } else { $r.errors | ConvertTo-Json -Depth 8 }
  }
}

# ----------------------------------------------------------------- ingress

Etape "Configuration du tunnel"
$url = "https://api.cloudflare.com/client/v4/accounts/$compte/cfd_tunnel/$TunnelId/configurations"
$actuelle = Invoke-RestMethod -Uri $url -Headers $entetes -Method GET
if (-not $actuelle.success) { $actuelle.errors | ConvertTo-Json -Depth 8; throw "Lecture de la configuration refusee" }

$regles = @($actuelle.result.config.ingress)
Info "version $($actuelle.result.version), $($regles.Count) regles"

$sauvegarde = Join-Path $PSScriptRoot ("tunnel-config-avant-$Domaine-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".json")
$actuelle.result | ConvertTo-Json -Depth 20 | Set-Content $sauvegarde -Encoding UTF8
Ok "Sauvegarde : $sauvegarde"

$repli = $regles | Where-Object { -not $_.hostname } | Select-Object -First 1
if (-not $repli) { throw "Regle de repli introuvable." }
$indexRepli = [array]::IndexOf($regles, $repli)

$aAjouter = $hotes | Where-Object { $h = $_; -not ($regles | Where-Object { $_.hostname -eq $h }) }
if (-not $aAjouter) {
  Ok "Les hotes sont deja dans la configuration."
} else {
  $liste = New-Object System.Collections.ArrayList
  for ($i = 0; $i -lt $regles.Count; $i++) {
    if ($i -eq $indexRepli) {
      foreach ($h in $aAjouter) {
        [void]$liste.Add([ordered]@{ hostname = $h; service = $Service })
      }
    }
    [void]$liste.Add($regles[$i])
  }

  $j = 0
  foreach ($r in $liste) {
    Info ("  #{0,-2} {1,-32} -> {2}" -f $j, $(if ($r.hostname) { $r.hostname } else { "(repli)" }), $r.service)
    $j++
  }

  if ($Simulation) {
    Alerte "Simulation : rien n'a ete envoye."
    return
  }

  $charge = @{ config = @{ ingress = $liste } }
  if ($actuelle.result.config.PSObject.Properties.Name -contains "warp-routing") {
    $charge.config."warp-routing" = $actuelle.result.config."warp-routing"
  }

  $ecriture = Invoke-RestMethod -Uri $url -Headers $entetes -Method PUT -Body ($charge | ConvertTo-Json -Depth 20)
  if (-not $ecriture.success) { $ecriture.errors | ConvertTo-Json -Depth 8; throw "Ecriture refusee" }
  Ok "Configuration ecrite, version $($ecriture.result.version)"
  Info "Le connecteur la recoit en direct, sans redemarrage."
}

if ($Simulation) { return }

# ------------------------------------------------------------ verification

Etape "Verification"
Start-Sleep -Seconds 15
foreach ($u in @("https://$Domaine/", "https://pravia.my-officeapps.com/", "https://app.my-officeapps.com/")) {
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 60
    Ok "$u -> HTTP $($r.StatusCode), $($r.Content.Length) octets"
  } catch { Alerte "$u -> $($_.Exception.Message)" }
}

Write-Host ""
Info "Un domaine tout juste cree peut mettre quelques minutes a se propager."
Info "Configuration precedente du tunnel : $sauvegarde"
