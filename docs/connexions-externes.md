# Connexions externes (Google, Microsoft, Facebook, TikTok, Apple)

Chaque fournisseur est **facultatif et indépendant** : si ses identifiants ne
sont pas renseignés, son bouton n'apparaît simplement pas sur la page de
connexion. Vous pouvez donc en activer un aujourd'hui et les autres plus tard.

L'état de configuration se consulte à tout moment dans le back-office :
**`/admin/connexions`**, qui affiche pour chaque fournisseur l'URL de rappel
exacte à déclarer et les variables attendues.

---

## Avant de commencer

L'**URL de rappel** est construite à partir du domaine renseigné dans
`/admin/seo`. Elle prend toujours cette forme :

```
https://pravia.my-officeapps.com/api/auth/<fournisseur>/callback
```

Elle doit correspondre **au caractère près** à celle déclarée chez le
fournisseur — c'est de très loin la première cause d'échec. Renseignez donc le
vrai domaine avant de créer les applications.

> **Apple impose HTTPS** et refuse `localhost`. La connexion Apple ne peut donc
> être testée qu'une fois le tunnel Cloudflare en place.

---

## Google

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
   créez un projet si nécessaire.
2. *Écran de consentement OAuth* → type **Externe**, renseignez le nom de
   l'application et l'e-mail de support.
3. *Identifiants* → **Créer des identifiants** → **ID client OAuth** →
   type **Application Web**.
4. Dans *URI de redirection autorisés*, collez l'URL de rappel `google`.

```ini
GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="..."
```

Tant que l'application est en mode *Test*, seuls les comptes ajoutés comme
testeurs peuvent se connecter. Passez-la en *Production* pour l'ouvrir à tous.

---

## Microsoft

1. [Microsoft Entra ID](https://entra.microsoft.com) → *Inscriptions
   d'applications* → **Nouvelle inscription**.
2. *Types de comptes pris en charge* : « Comptes dans un annuaire
   organisationnel quelconque et comptes Microsoft personnels » pour accepter
   les deux.
3. *URI de redirection* → plateforme **Web** → l'URL de rappel `microsoft`.
4. *Certificats et secrets* → **Nouveau secret client**. Copiez la **valeur**,
   pas l'identifiant — elle ne sera plus affichée ensuite.

```ini
MICROSOFT_CLIENT_ID="..."
MICROSOFT_CLIENT_SECRET="..."
MICROSOFT_TENANT="common"
```

`MICROSOFT_TENANT` vaut `common` pour accepter tout le monde. Remplacez-le par
l'identifiant de votre annuaire pour restreindre l'accès à votre organisation.

> Les secrets Microsoft **expirent** (24 mois au maximum). Notez la date : le
> jour venu, les connexions cesseront de fonctionner sans autre avertissement.

---

## Facebook

1. [Meta for Developers](https://developers.facebook.com/apps) → **Créer une
   application** → type *Consommateur*.
2. Ajoutez le produit **Connexion Facebook** → *Web*.
3. *Connexion Facebook → Paramètres* → dans *URI de redirection OAuth valides*,
   collez l'URL de rappel `facebook`.
4. *Paramètres → Général* pour relever l'identifiant et la clé secrète.

```ini
FACEBOOK_CLIENT_ID="..."
FACEBOOK_CLIENT_SECRET="..."
```

L'application doit être passée en mode **Live** pour accepter d'autres comptes
que ceux des développeurs déclarés.

---

## TikTok

1. [TikTok for Developers](https://developers.tiktok.com/apps) → **Connect an
   app**.
2. Ajoutez le produit **Login Kit**.
3. Demandez la permission **`user.info.basic`**.
4. Dans *Redirect URI*, collez l'URL de rappel `tiktok`.

```ini
TIKTOK_CLIENT_KEY="aw..."
TIKTOK_CLIENT_SECRET="..."
```

TikTok appelle son identifiant **client key** et non *client id* — le code en
tient compte.

> **TikTok ne transmet aucune adresse e-mail**, quelle que soit la permission
> demandée. Après la connexion, l'internaute est donc redirigé vers une page
> qui lui demande son adresse, indispensable pour les confirmations de
> commande. Aucune adresse factice n'est inventée.

---

## Apple

C'est le fournisseur le plus exigeant. Il réclame un compte développeur payant.

1. [Apple Developer](https://developer.apple.com/account/resources/identifiers/list)
   → *Identifiers* → **App ID** avec la capacité *Sign in with Apple*.
2. Créez ensuite un **Services ID** : c'est lui qui sert de `client_id`.
3. Sur ce Services ID, activez *Sign in with Apple* → **Configure** :
   - *Domains* : `pravia.my-officeapps.com`
   - *Return URLs* : l'URL de rappel `apple`
4. *Keys* → **nouvelle clé** avec *Sign in with Apple* activé. Téléchargez le
   fichier `.p8` : **il n'est téléchargeable qu'une seule fois**.

```ini
APPLE_CLIENT_ID="com.votre-domaine.pravia"   # le Services ID
APPLE_TEAM_ID="ABCDE12345"                   # en haut à droite du portail
APPLE_KEY_ID="XYZ9876543"                    # identifiant de la clé
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGT...\n-----END PRIVATE KEY-----"
```

Deux particularités traitées par le code :

- Apple **n'accepte pas de secret statique** : il faut lui présenter un jeton
  signé en ES256 avec la clé `.p8`. Il est fabriqué à chaque échange.
- Apple répond en **POST** (`form_post`) et non en GET, et ne transmet le nom
  de l'utilisateur qu'à la toute première autorisation.

Pour tester à nouveau comme un nouvel utilisateur, retirez l'autorisation
depuis *Réglages → Identifiant Apple → Connexion et sécurité → Connexion avec
Apple*.

---

## Comment les comptes sont rattachés

| Situation | Comportement |
| --- | --- |
| La liaison existe déjà | Connexion immédiate |
| Adresse **vérifiée** par le fournisseur, correspondant à un compte | Liaison automatique au compte existant |
| Adresse non vérifiée, ou déjà prise sans vérification | Aucun rattachement : une autre adresse est demandée |
| Aucune adresse transmise (TikTok) | Page de finalisation demandant l'adresse |
| Aucune correspondance | Création d'un compte |

Le rattachement automatique **exige une adresse vérifiée**. Sans cette
précaution, quiconque créerait un compte externe portant l'adresse d'un de vos
clients prendrait la main sur son compte Pravia.

Un client peut lier plusieurs fournisseurs depuis **Mon compte → Mes
informations**, et en retirer — sauf s'il s'agit de sa seule méthode de
connexion et qu'il n'a pas défini de mot de passe.

---

## Sécurité du flux

- **`state`** aléatoire, conservé dans un cookie signé et comparé au retour :
  bloque les requêtes forgées par un tiers.
- **PKCE** (S256) sur Google, Microsoft, Facebook et TikTok. Apple ne le prend
  pas en charge sur le flux web.
- **`nonce`** vérifié dans le jeton d'identité.
- **Signature des jetons** contrôlée auprès des clés publiques du fournisseur.
- Les cookies du flux expirent en 10 minutes et sont détruits dès leur lecture :
  un code d'autorisation ne sert qu'une fois, son état non plus.
- Les erreurs détaillées vont dans les journaux du serveur ; l'internaute ne
  voit qu'un message générique.

---

## En cas de problème

| Message | Cause |
| --- | --- |
| `redirect_uri_mismatch` | L'URL déclarée diffère de celle attendue. Comparez-la avec celle affichée dans `/admin/connexions` |
| `erreur=non-configure` | Les variables du fournisseur sont absentes de l'environnement |
| `erreur=session-expiree` | Plus de 10 minutes entre le départ et le retour, ou cookies bloqués |
| `erreur=etat-invalide` | Le `state` ne correspond pas — souvent un aller-retour entamé dans un autre onglet |
| `erreur=echec-fournisseur` | Voir les journaux du serveur : le détail y figure |
| `invalid_client` chez Apple | Clé `.p8`, `APPLE_TEAM_ID` ou `APPLE_KEY_ID` incorrects |
| Apple refuse l'URL | Apple exige HTTPS et rejette `localhost` |

Après toute modification des variables d'environnement, redémarrez
l'application :

```powershell
Restart-WebAppPool PraviaPool
```
