# Déploiement de Pravia

Mise en production sur le serveur **192.168.1.140** : IIS, SQL Server, et un
tunnel Cloudflare exposant `https://pravia.my-officeapps.com`.

Tout se fait **sur le serveur lui-même**, à partir d'un clone du dépôt. Rien
n'est à construire ailleurs puis à recopier.

---

## Architecture

```
Navigateur ──HTTPS──> Cloudflare ──tunnel sortant──> cloudflared ──> IIS :8080
                                                                       │
                                                            HttpPlatformHandler
                                                                       │
                                                              Node (Next.js)
                                                                       │
                                                          SQL Server :1433 [Pravia]
```

**Pourquoi un tunnel plutôt qu'un enregistrement DNS classique ?**
`192.168.1.140` est une adresse privée : un enregistrement `A` pointant dessus
ne mènerait nulle part depuis Internet. Avec un tunnel, c'est le serveur qui
ouvre une connexion **sortante** vers Cloudflare. Conséquences : aucun port à
ouvrir sur la box, aucune adresse IP publique fixe nécessaire, certificat TLS
fourni et renouvelé par Cloudflare, et l'adresse réelle du serveur jamais
exposée.

---

## Prérequis

À installer sur le serveur avant de commencer.

```powershell
# Console PowerShell en tant qu'administrateur

# Node.js 20 minimum (le projet est développé sous Node 25)
winget install OpenJS.NodeJS.LTS

# Git
winget install Git.Git

# SQL Server Express, si absent
winget install Microsoft.SQLServer.2022.Express

# Outils en ligne de commande SQL (fournit sqlcmd)
winget install Microsoft.SQLServerManagementStudio
```

**IIS** — activer le rôle s'il ne l'est pas :

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures -All
```

**HttpPlatformHandler** — indispensable : IIS ne sait pas exécuter du
JavaScript, ce module lance le processus Node et lui relaie les requêtes.
Téléchargement manuel, il n'existe pas de paquet winget :

<https://www.iis.net/downloads/microsoft/httpplatformhandler>

Vérifier après installation :

```powershell
& "$env:SystemRoot\System32\inetsrv\appcmd.exe" list modules | Select-String httpPlatform
```

Enfin, un **compte Cloudflare** où le domaine `my-officeapps.com` est déjà géré.

---

## 1 · Cloner et installer

```powershell
cd C:\
git clone https://github.com/UserNabil/pravia.git
cd pravia
npm install
```

`npm install` compile `better-sqlite3`, un module natif. Il existe des binaires
précompilés pour Windows ; en cas d'échec, installez les outils de compilation :

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

---

## 2 · Générer les scripts SQL

L'application se sert d'une base SQLite locale comme **source** du jeu de
données de démonstration, puis l'exporte au format SQL Server.

```powershell
npm run setup     # crée la base SQLite locale, charge la démonstration
                  # et importe les traductions anglaises et arabes
npm run sql:all   # produit les quatre scripts dans dist-sql\
```

Vous obtenez quatre fichiers :

| Fichier | Contenu | Quand l'utiliser |
| --- | --- | --- |
| `pravia-schema.sql` | 20 tables, 18 clés étrangères, tous les index | Première installation, base vide |
| `pravia-data.sql` | 1 082 lignes : 40 produits, 48 commandes, 90 avis, 488 traductions | Première installation, avec la démonstration |
| `pravia-migration-i18n.sql` | Les 4 tables de traduction seules | **Base déjà en service**, mise à jour multilingue |
| `pravia-translations.sql` | Les 488 traductions seules | Rafraîchir les textes traduits sans toucher au reste |

> `pravia-data.sql` **purge toutes les tables** avant d'insérer : il ne
> convient qu'à une première installation. Sur une base qui contient déjà des
> commandes réelles, utilisez la migration puis le script de traductions.

> Pour partir d'une base **vide** en production, appliquez uniquement le
> schéma. Vous créerez ensuite le premier administrateur directement en SQL
> (voir « Créer un administrateur » plus bas).

---

## 3 · Préparer SQL Server

Une installation SQL Server Express refuse par défaut **exactement** ce dont
Node a besoin. Deux verrous, tous deux par défaut :

- **TCP/IP est désactivé** — seule la mémoire partagée est ouverte, que les
  pilotes Node ne savent pas utiliser ;
- **seule l'authentification Windows est acceptée**, alors que le pilote se
  connecte avec un identifiant SQL.

Le script lève les deux, crée la base et un compte applicatif limité à la
lecture et à l'écriture des données (jamais de droits sur la structure) :

```powershell
cd deploy
.\1-configurer-sqlserver.ps1 -Instance SQLEXPRESS -MotDePasse "UnMotDePasseSolide!2026"
```

> Le redémarrage du service interrompt brièvement **toutes** les bases de
> l'instance. Le script demande confirmation avant ; ajoutez `-SansConfirmation`
> pour l'automatiser.

N'ajoutez `-OuvrirPareFeu` que si SQL Server doit être joignable depuis une
autre machine. Ce n'est pas le cas ici : l'application tourne sur le même
serveur.

Sa dernière étape teste la connexion applicative et affiche la chaîne à
reporter dans la configuration. Chargez ensuite structure puis données :

```powershell
cd ..
sqlcmd -S localhost\SQLEXPRESS -E -C -d Pravia -i dist-sql\pravia-schema.sql
sqlcmd -S localhost\SQLEXPRESS -E -C -d Pravia -i dist-sql\pravia-data.sql
sqlcmd -S localhost\SQLEXPRESS -E -C -d Pravia -Q "SELECT COUNT(*) FROM Product"
```

La dernière commande doit renvoyer **40**.

---

## 4 · Construire le paquet

```powershell
npm run build:iis
```

Quatre étapes enchaînées :

1. génère `prisma/schema.sqlserver.prisma` à partir du schéma de référence ;
2. régénère les scripts SQL ;
3. compile l'application avec un client Prisma **SQL Server** ;
4. assemble `dist-iis\` : serveur, fichiers statiques, `public/`, `web.config`.

> **À savoir** : le client Prisma encode le moteur de base pour lequel il a été
> généré. Un client SQLite refuse de fonctionner avec SQL Server, et
> inversement. La commande régénère le client SQLite à la fin, pour que
> `npm run dev` reste utilisable sans manipulation.
>
> Deuxième piège écarté : Next ne copie ni `.next/static` ni `public/` dans sa
> sortie autonome. C'est la cause classique d'un site en production sans styles
> ni images. Le script d'assemblage les ajoute et vérifie leur présence.

---

## 5 · Installer le site dans IIS

```powershell
cd deploy
.\2-installer-iis.ps1 -Source ..\dist-iis -Destination C:\inetpub\pravia -Port 8080
```

Le script crée le pool d'applications (toujours actif, sans recyclage
programmé — sinon la première visite du matin attendrait le démarrage complet
de Next), crée le site, et restreint les droits d'accès à `.env.production`.

Complétez ensuite `C:\inetpub\pravia\.env.production` :

```ini
DATABASE_PROVIDER="sqlserver"
DATABASE_URL="sqlserver://localhost:1433;database=Pravia;user=pravia_app;password=VOTRE_MOT_DE_PASSE;encrypt=true;trustServerCertificate=true"
AUTH_SECRET="<chaîne aléatoire longue>"
NEXT_PUBLIC_SITE_URL="https://pravia.my-officeapps.com"
NODE_ENV="production"
```

Générez le secret de session :

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Redémarrez et testez :

```powershell
Restart-WebAppPool PraviaPool
Start-Process http://localhost:8080
```

---

## 6 · Exposer via Cloudflare

```powershell
.\3-cloudflare-tunnel.ps1 -Domaine pravia.my-officeapps.com -PortLocal 8080 -InstallerService
```

Le script installe `cloudflared`, ouvre le navigateur pour l'authentification
Cloudflare, crée le tunnel, écrit sa configuration, ajoute l'enregistrement DNS
et installe le service Windows pour que le tunnel remonte automatiquement au
démarrage.

L'enregistrement créé est un `CNAME` de `pravia` vers
`<identifiant>.cfargotunnel.com`, proxy Cloudflare actif (nuage orange).

### Réglages recommandés dans le tableau de bord Cloudflare

| Emplacement | Réglage | Valeur |
| --- | --- | --- |
| SSL/TLS → Overview | Mode de chiffrement | **Full** |
| SSL/TLS → Edge Certificates | Always Use HTTPS | activé |
| SSL/TLS → Edge Certificates | Automatic HTTPS Rewrites | activé |
| Speed → Optimization | Brotli | activé |
| Caching → Configuration | Niveau de cache | Standard |

Ne mettez **pas** les pages HTML en cache : catalogue, panier et back-office
sont rendus à la demande. Cloudflare met déjà en cache `/_next/static/` et
`/products/`, dont les noms portent une empreinte.

---

## 6 bis · Connexions externes (facultatif)

Google, Microsoft, Facebook, TikTok et Apple sont pris en charge. Chaque
fournisseur est indépendant : sans identifiants, son bouton n'apparaît pas.

La procédure complète, fournisseur par fournisseur, est dans
**[docs/connexions-externes.md](docs/connexions-externes.md)**. Les identifiants
se renseignent dans .env.production, et le back-office affiche pour chacun
l'URL de rappel exacte à déclarer : **/admin/connexions**.

Deux points à connaître : Apple exige HTTPS et refuse localhost, la connexion
Apple ne peut donc être testée qu'une fois le tunnel en place ; TikTok ne
transmet aucune adresse e-mail, elle est demandée à l'internaute juste après.

---

## 7 · Dernière étape, à ne pas oublier

Connectez-vous au back-office et renseignez le domaine réel :

**`/admin/seo` → Adresse du site → `https://pravia.my-officeapps.com`**

Tant que ce champ pointe ailleurs, les URL canoniques, le sitemap et les
aperçus sociaux restent inexploitables. Le diagnostic de la page le signale en
erreur rouge tant que ce n'est pas corrigé.

Contrôle final :

```
https://pravia.my-officeapps.com/
https://pravia.my-officeapps.com/robots.txt
https://pravia.my-officeapps.com/sitemap.xml
```

Comptes livrés avec le jeu de démonstration :

| Rôle | Adresse | Mot de passe |
| --- | --- | --- |
| Administrateur | `admin@pravia.com` | `admin123` |
| Client | `camille@exemple.fr` | `demo1234` |

> **Changez le mot de passe administrateur avant de présenter le site.**
> Back-office → Clients → créez un nouvel administrateur, puis supprimez ou
> renommez le compte de démonstration.

---

## Mettre à jour l'application

```powershell
cd C:\pravia
git pull
npm install
npm run build:iis
cd deploy
.\2-installer-iis.ps1 -Source ..\dist-iis -Destination C:\inetpub\pravia
```

Le script **préserve `.env.production`** : vos secrets ne sont pas écrasés.

### Mise à jour vers la version multilingue

Cette version ajoute quatre tables et ne modifie aucune table existante. Sur
une base **déjà en service**, appliquez la migration dédiée plutôt que le
schéma complet :

```powershell
# 1. Le code d'abord
cd C:\pravia
git pull
npm install
npm run build:iis

# 2. La base ensuite : purement additif, relançable sans dommage
sqlcmd -S localhost -d Pravia -U pravia_app -P "MOT_DE_PASSE" `
  -i dist-sql\pravia-migration-i18n.sql

# 3. Les textes traduits (40 fiches produit et 9 catégories en EN et AR)
sqlcmd -S localhost -d Pravia -U pravia_app -P "MOT_DE_PASSE" `
  -i dist-sql\pravia-translations.sql

# 4. Publication
cd deploy
.\2-installer-iis.ps1 -Source ..\dist-iis -Destination C:\inetpub\pravia
```

La migration se termine par deux `SELECT` de contrôle : vous devez voir les
quatre tables `…Translation` et les trois réglages `banner.text.*`.

Rien d'autre n'est à faire : les adresses passent de `/produits` à
`/fr/produits`, et l'ancienne forme redirige d'elle-même vers la langue du
visiteur. Aucune redirection à écrire dans IIS.

Si le schéma de données a changé pour une autre raison, calculez l'écart et
relisez-le avant de l'appliquer — `migrate diff` peut proposer des
suppressions de colonnes :

```powershell
npx prisma migrate diff `
  --from-url "sqlserver://localhost:1433;database=Pravia;user=pravia_app;password=...;encrypt=true;trustServerCertificate=true" `
  --to-schema prisma/schema.sqlserver.prisma --script -o ecart.sql
```

---

## Créer un administrateur sur une base vide

Si vous n'avez chargé que le schéma, sans le jeu de démonstration :

```powershell
# Empreinte du mot de passe choisi
node -e "console.log(require('bcryptjs').hashSync('VotreMotDePasse', 10))"
```

```sql
INSERT INTO [dbo].[User] (id, email, passwordHash, name, role, avatarColor, createdAt, updatedAt)
VALUES (NEWID(), N'admin@votre-domaine.fr', N'<empreinte>', N'Administrateur',
        N'ADMIN', N'#6366f1', SYSDATETIME(), SYSDATETIME());
```

Les réglages de la boutique et les pages SEO se créent ensuite depuis le
back-office.

---

## En cas de problème

| Symptôme | Cause probable |
| --- | --- |
| **502.5** dans IIS | Node n'a pas démarré. Voir `C:\inetpub\pravia\logs\` |
| `Failed to connect to ...:1433` | TCP/IP toujours désactivé, ou service non redémarré après `1-configurer-sqlserver.ps1` |
| `Login failed for user 'pravia_app'` | Authentification mixte non activée, ou mot de passe divergent entre SQL Server et `.env.production` |
| `Driver Adapter ... is not compatible` | Paquet compilé avec le mauvais client Prisma. Relancez `npm run build:iis` |
| Site sans styles ni images | `dist-iis` copié partiellement : `.next\static` et `public` doivent être présents |
| Connexion impossible en LAN | Ne devrait plus se produire : le drapeau `Secure` du cookie suit le protocole réel via `x-forwarded-proto`, donc `http://192.168.1.140:8080` fonctionne aussi bien que le domaine public |
| Domaine injoignable | `Get-Service cloudflared`, puis `cloudflared tunnel info pravia` |
| `HttpPlatformHandler` introuvable | Module non installé — voir les prérequis |

Journaux utiles :

```powershell
Get-Content C:\inetpub\pravia\logs\*.log -Tail 50   # application Node
Get-Service cloudflared                             # tunnel
Get-EventLog -LogName Application -Source "IIS*" -Newest 20
```

---

## Ce qui a été vérifié

Sur **SQL Server 2025 Express**, avec les scripts de ce dépôt :

- création des tables, clés étrangères et index, sans aucun avertissement ;
- import des lignes de démonstration ;
- conservation des accents, des apostrophes, des montants en centimes et des
  dates.

Les colonnes de traduction sont en `NVARCHAR` et les valeurs insérées portent
le préfixe `N'…'` : l'arabe est stocké et relu sans perte.

Sur le paquet `dist-iis` réellement produit :

- démarrage du serveur, service des fichiers statiques et des visuels produits ;
- les 31 vérifications du parcours fonctionnel (`npm run e2e`) ;
- la chaîne de pilotes SQL Server (`@prisma/adapter-mssql`, `mssql`, `tedious`)
  est bien empaquetée et tente la connexion sur le port 1433.

**Non vérifié :** la connexion TCP effective entre Node et SQL Server, faute de
droits administrateur sur la machine de développement pour activer TCP/IP.
C'est précisément ce que débloque `1-configurer-sqlserver.ps1`, dont la
dernière étape teste cette connexion et affiche le résultat. Si elle échoue,
le script s'arrête en l'indiquant.

Une fois le site en ligne, vous pouvez rejouer les deux suites depuis le clone :

```powershell
npm run e2e -- https://pravia.my-officeapps.com          # 35 vérifications
npm run seo -- https://pravia.my-officeapps.com          # 38 vérifications
npm run responsive -- https://pravia.my-officeapps.com   # 72 combinaisons
npm run i18n:check                                       # cohérence des catalogues
```

---

## Langues

Le site sert trois langues, toutes préfixées dans l'URL :

| Langue | Préfixe | Sens de lecture |
| --- | --- | --- |
| Français | `/fr` | gauche à droite |
| Anglais | `/en` | gauche à droite |
| Arabe | `/ar` | **droite à gauche** |

- L'interface vit dans `messages/fr.json`, `en.json` et `ar.json`
  (975 clés chacun). `npm run i18n:check` vérifie qu'aucune clé ne manque et
  que les pluriels arabes couvrent bien leurs six formes.
- Le **contenu** (fiches produit, catégories, caractéristiques) est traduit en
  base, dans les tables `…Translation`. Un champ vide retombe silencieusement
  sur la version française : une fiche à moitié traduite reste lisible.
- Le back-office édite ces traductions dans un onglet par langue, sur le
  formulaire produit et sur celui des catégories.
- Le bandeau promotionnel se décline par langue depuis **Réglages**.

Pour ajouter une langue : l'ajouter dans `src/i18n/routing.ts`, créer
`messages/<code>.json`, puis relancer `npm run i18n:check`.

---

## Marque

Les fichiers officiels sont dans `public/` :

| Fichier | Usage |
| --- | --- |
| `logo.png` | verrou horizontal complet, avec les deux baselines |
| `logo-compact.png` | symbole + PRAVIA, pour l'en-tête |
| `logo-principal.png` | verrou carré empilé |
| `logo-mark.png` | symbole seul |
| `icon.png`, `icon-192.png`, `favicon-32.png` | icônes du navigateur et du manifeste |

Le fond est transparent : la marque se pose telle quelle sur le thème clair
comme sur le sombre. Pour changer de logo, il suffit de remplacer ces fichiers
et de reconstruire — aucun code ne les nomme ailleurs que dans
`src/components/logo.tsx`.

La couleur primaire du site est celle du logo, définie une seule fois dans
`src/app/globals.css` (`--primary`).
