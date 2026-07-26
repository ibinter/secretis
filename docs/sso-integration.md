# Guide d'intégration SSO — SECRETIS ERP

Ce guide détaille la configuration de l'authentification unique (SSO) pour les organisations utilisant SECRETIS ERP. Il couvre les providers les plus courants : Google Workspace, Azure AD, Okta, ADFS, OpenLDAP et Active Directory.

---

## Sommaire

1. [Vue d'ensemble du flux SSO](#1-vue-densemble)
2. [Google Workspace — SAML](#2-google-workspace--saml)
3. [Azure AD — SAML](#3-azure-ad--saml)
4. [Azure AD — OIDC (recommandé)](#4-azure-ad--oidc-recommandé)
5. [Okta](#5-okta)
6. [ADFS (Active Directory Federation Services)](#6-adfs)
7. [OpenLDAP](#7-openldap)
8. [Active Directory (LDAP direct)](#8-active-directory-ldap-direct)
9. [Mapping des attributs](#9-mapping-des-attributs)
10. [Mapping des rôles](#10-mapping-des-rôles)
11. [Dépannage SSO](#11-dépannage-sso)

---

## 1. Vue d'ensemble

SECRETIS ERP supporte trois protocoles SSO :

| Protocole | Cas d'usage recommandé |
|-----------|------------------------|
| **SAML 2.0** | Google Workspace, Azure AD legacy, ADFS, Okta (entreprises) |
| **OIDC / OAuth2** | Azure AD (v2), Google, Okta, Keycloak (moderne) |
| **LDAP / AD** | Authentification directe sur annuaire interne |

### Flux SAML 2.0

```
Utilisateur → SECRETIS (SP) → [AuthnRequest] → IdP
IdP (validation) → [SAMLResponse] → SECRETIS (callback ACS)
SECRETIS valide la signature → crée/met à jour l'utilisateur → connecte
```

### URLs importantes de SECRETIS

Remplacez `{slug}` par l'identifiant de votre organisation (ex: `acme`).

| URL | Usage |
|-----|-------|
| `https://{slug}.secretis.app/sso/{slug}/login` | Point d'entrée SSO |
| `https://{slug}.secretis.app/sso/{slug}/callback` | ACS (Assertion Consumer Service) — SAML POST |
| `https://{slug}.secretis.app/sso/{slug}/metadata.xml` | SP Metadata XML — à importer dans l'IdP |
| `https://{slug}.secretis.app/sso/oidc/{slug}/callback` | Redirect URI — OIDC |

---

## 2. Google Workspace — SAML

### Dans la console Google Admin

1. Accédez à **Console Admin** → **Applications** → **Applications Web et mobiles**.
2. Cliquez sur **Ajouter une application** → **Ajouter une application SAML personnalisée**.
3. Nommez l'application `SECRETIS ERP`.
4. Téléchargez le **certificat IdP** (fichier `.cer` ou `.pem`) — vous en aurez besoin dans SECRETIS.
5. Copiez l'**URL SSO** (format : `https://accounts.google.com/o/saml2/idp?idpid=...`).
6. Sur l'écran "Détails du fournisseur de services" :
   - **ACS URL** : `https://{slug}.secretis.app/sso/{slug}/callback`
   - **Entity ID** : `https://{slug}.secretis.app/sso/{slug}/metadata.xml`
   - **Format NameID** : Email
7. Sur l'écran "Mappage des attributs", configurez :
   - `Adresse e-mail principale` → `email`
   - `Prénom` → `firstName`
   - `Nom` → `lastName`
   - `Groupes` → `groups` (si vous utilisez le mapping de rôles)
8. Activez l'application pour les unités organisationnelles concernées.

### Dans SECRETIS ERP

1. Allez dans **Paramètres → SSO → Onglet SAML**.
2. Renseignez :
   - **URL SSO de l'IdP** : l'URL copiée à l'étape 5
   - **Certificat IdP** : contenu du fichier `.cer` téléchargé
3. Mapping des attributs (Google) :

   | Champ SECRETIS | Attribut Google |
   |----------------|-----------------|
   | email     | `email` |
   | firstName | `firstName` |
   | lastName  | `lastName` |
   | groups    | `groups` |

4. Cliquez **Tester la connexion** puis **Enregistrer**.

---

## 3. Azure AD — SAML

### Dans le portail Azure

1. Accédez à **Azure Active Directory** → **Applications d'entreprise** → **Nouvelle application**.
2. Choisissez **Créer votre propre application** → nommez-la `SECRETIS ERP` → **Intégrer toute autre application hors galerie**.
3. Allez dans **Authentification unique** → **SAML**.
4. Section **Configuration SAML de base** :
   - **Identifier (Entity ID)** : `https://{slug}.secretis.app/sso/{slug}/metadata.xml`
   - **Reply URL (ACS)** : `https://{slug}.secretis.app/sso/{slug}/callback`
   - **Sign on URL** : `https://{slug}.secretis.app/sso/{slug}/login`
5. Section **Attributs et revendications** :
   - `emailaddress` → `user.mail`
   - `givenname` → `user.givenname`
   - `surname` → `user.surname`
   - Ajoutez une revendication de groupe : **Groupes affectés à l'application**
6. Téléchargez le **Certificat (Base64)** depuis la section **Certificat de signature SAML**.
7. Copiez l'**URL du service d'authentification unique SAML**.

### Dans SECRETIS ERP

Mapping des attributs (Azure AD) :

| Champ SECRETIS | URI de revendication Azure |
|----------------|---------------------------|
| email     | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` |
| firstName | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname` |
| lastName  | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname` |
| groups    | `http://schemas.microsoft.com/ws/2008/06/identity/claims/groups` |

---

## 4. Azure AD — OIDC (recommandé)

Le flux OIDC est plus simple et plus moderne que SAML pour Azure AD.

### Dans le portail Azure

1. **Azure Active Directory** → **Inscriptions d'applications** → **Nouvelle inscription**.
2. Nommez l'application `SECRETIS ERP`.
3. **URI de redirection** : `https://{slug}.secretis.app/sso/oidc/{slug}/callback` (type : Web).
4. Dans **Certificats et secrets** → **Nouveau secret client** → copiez la valeur (visible une seule fois).
5. Dans **Vue d'ensemble** → copiez l'**ID d'application (client)** et l'**ID de l'annuaire (locataire)**.

### Dans SECRETIS ERP — Onglet OIDC

- **Discovery URL** : `https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration`
- **Client ID** : ID d'application copié
- **Client Secret** : secret copié
- **Scopes** : `openid email profile`

> **Note :** Pour inclure les groupes dans le token, configurez dans Azure AD :
> **Token configuration** → **Add groups claim** → **Security groups**.

---

## 5. Okta

### Protocole SAML

1. Dans Okta Admin : **Applications** → **Create App Integration** → **SAML 2.0**.
2. **Single sign-on URL** : `https://{slug}.secretis.app/sso/{slug}/callback`
3. **Audience URI (SP Entity ID)** : `https://{slug}.secretis.app/sso/{slug}/metadata.xml`
4. **Name ID format** : `EmailAddress`
5. **Attribute Statements** :
   - `email` → `user.email`
   - `firstName` → `user.firstName`
   - `lastName` → `user.lastName`
6. **Group Attribute Statements** : `groups` → Matches regex `.*`
7. Téléchargez le certificat depuis **Sign On → View IdP metadata**.

### Protocole OIDC (alternative)

- **Discovery URL** : `https://{votre-domaine}.okta.com/.well-known/openid-configuration`
- Créez une **Web Application** dans Okta → copiez Client ID et Client Secret.

---

## 6. ADFS

### Configuration dans ADFS Manager

1. **Relying Party Trusts** → **Add Relying Party Trust** → **Claims aware**.
2. Importez les métadonnées SP depuis l'URL : `https://{slug}.secretis.app/sso/{slug}/metadata.xml`
3. **Configure Claim Issuance Policy** → **Add Rule** → **Send LDAP Attributes as Claims** :

   | Attribut LDAP | Type de revendication sortante |
   |---------------|-------------------------------|
   | E-Mail-Addresses | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` |
   | Given-Name | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname` |
   | Surname | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname` |
   | Token-Groups - Unqualified Names | `http://schemas.microsoft.com/ws/2008/06/identity/claims/groups` |

4. Récupérez l'URL SSO ADFS : `https://adfs.entreprise.com/adfs/ls/` (généralement).
5. Exportez le certificat de signature ADFS depuis **Certificates → Token-signing**.

### Remarque sécurité ADFS

ADFS utilise par défaut SHA-256 pour la signature. SECRETIS valide automatiquement avec `OPENSSL_ALGO_SHA256`.

---

## 7. OpenLDAP

### Prérequis

- Serveur OpenLDAP accessible en réseau depuis les serveurs SECRETIS
- Compte de service (bind DN) avec droits de lecture sur l'arbre
- Recommandé : LDAPS (port 636) ou STARTTLS activé

### Configuration dans SECRETIS — Onglet LDAP

| Champ | Exemple |
|-------|---------|
| Serveur | `ldap.entreprise.com` |
| Port | `389` (LDAP) ou `636` (LDAPS) |
| STARTTLS | Activé (recommandé si pas de LDAPS) |
| Base DN | `dc=entreprise,dc=com` |
| Bind DN | `cn=svc-secretis,ou=ServiceAccounts,dc=entreprise,dc=com` |
| Filtre utilisateur | `(&(objectClass=inetOrgPerson)(mail=*))` |
| Filtre de sync | `(&(objectClass=inetOrgPerson)(mail=*)(memberOf=cn=secretis-users,ou=Groups,dc=...))` |

### Mapping des attributs OpenLDAP

| Attribut LDAP | Correspondance SECRETIS |
|---------------|-------------------------|
| `mail` | Email |
| `givenName` | Prénom |
| `sn` | Nom |
| `memberOf` | Groupes (pour le mapping de rôles) |
| `dn` | Identifiant externe SSO |

---

## 8. Active Directory (LDAP direct)

Utilisez le mode LDAP quand vous ne voulez pas déployer ADFS.

| Champ | Exemple AD |
|-------|-----------|
| Port | `389` ou `636` (LDAPS recommandé) |
| Base DN | `DC=entreprise,DC=local` |
| Bind DN | `CN=svc-secretis,OU=Service Accounts,DC=entreprise,DC=local` |
| Filtre utilisateur (auth) | `(&(objectClass=user)(sAMAccountName={username}))` |
| Filtre de sync | `(&(objectClass=user)(mail=*)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))` |

> Le filtre de sync exclut les comptes désactivés (flag `userAccountControl` bit 2).

### Synchronisation automatique

La commande `php artisan secretis:sync-ldap` est planifiée quotidiennement à 1h du matin.

Pour déclencher une sync manuelle : **Paramètres → SSO → Onglet LDAP → Synchroniser maintenant**.

---

## 9. Mapping des attributs

Par défaut, SECRETIS utilise les claims Microsoft standard. Pour d'autres providers, ajustez dans l'interface :

### Google Workspace (SAML)

```json
{
  "email":     "email",
  "firstName": "firstName",
  "lastName":  "lastName",
  "groups":    "groups"
}
```

### Azure AD (SAML — claims courts)

```json
{
  "email":     "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  "firstName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
  "lastName":  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
  "groups":    "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"
}
```

### Okta (custom attributes)

```json
{
  "email":     "email",
  "firstName": "firstName",
  "lastName":  "lastName",
  "groups":    "groups"
}
```

---

## 10. Mapping des rôles

Vous pouvez mapper des groupes IdP vers des rôles SECRETIS dans la configuration :

```json
{
  "CN=SECRETIS-Admins,OU=Groups,DC=acme,DC=com": "admin",
  "CN=SECRETIS-Managers,OU=Groups,DC=acme,DC=com": "manager",
  "CN=All-Staff,OU=Groups,DC=acme,DC=com": "employee"
}
```

**Hiérarchie des rôles SECRETIS :**

| Rôle | Niveau | Description |
|------|--------|-------------|
| `employee` | 1 | Accès standard (défaut) |
| `manager` | 2 | Gestion d'équipe, approbations |
| `admin` | 3 | Administration de l'organisation |

Si un utilisateur appartient à plusieurs groupes, le rôle le plus élevé est attribué.

---

## 11. Dépannage SSO

### Erreur : "SAMLResponse invalide : base64 corrompu"

- Vérifiez que votre IdP envoie bien une réponse `application/x-www-form-urlencoded` en POST.
- Certains IdP encodent en URL le champ SAMLResponse — SECRETIS gère `urldecode` automatiquement.

### Erreur : "signature XML invalide"

- Le certificat IdP configuré dans SECRETIS est peut-être périmé ou incorrect.
- Retéléchargez le certificat depuis la console de votre IdP.
- Vérifiez l'empreinte SHA-256 affichée dans SECRETIS correspond au certificat de votre IdP.

### Erreur : "assertion expirée (NotOnOrAfter)"

- Décalage d'horloge (NTP) entre le serveur SECRETIS et l'IdP.
- SECRETIS tolère ±60 secondes. Au-delà, synchronisez NTP sur les deux serveurs.

### Erreur : "Audience ne correspond pas"

- L'Entity ID configuré dans l'IdP ne correspond pas à l'URL de metadata SECRETIS.
- Vérifiez : **Entity ID dans l'IdP** = `https://{slug}.secretis.app/sso/{slug}/metadata.xml`

### Erreur : "attribut email manquant"

- Vérifiez le mapping des attributs dans l'interface SECRETIS.
- Dans Google Workspace, vérifiez que l'attribut "Adresse e-mail principale" est bien mappé.
- Dans Azure AD, vérifiez que `user.mail` (et non `user.userprincipalname`) est envoyé.

### LDAP : "Connexion LDAP échouée"

- Vérifiez la connectivité réseau : `telnet ldap.entreprise.com 389`.
- Si LDAPS : vérifiez le certificat TLS du serveur LDAP (autorité de certification reconnue).
- Vérifiez le Bind DN et le mot de passe du service account.

### LDAP : "Recherche utilisateur échouée"

- Vérifiez le `base_dn` : il doit pointer vers la racine ou la branche contenant les utilisateurs.
- Testez le filtre directement avec `ldapsearch -H ldap://... -D "bind_dn" -W -b "base_dn" "(filtre)"`.

### OIDC : "state invalide — possible attaque CSRF"

- La session PHP a expiré entre l'initiation et le callback. Augmentez `SESSION_LIFETIME` ou vérifiez la config Redis/session.
- Vérifiez que les cookies de session sont bien transmis (SameSite=Lax minimum, Secure si HTTPS).

### OIDC : "discovery échouée"

- L'URL de découverte doit être accessible depuis le serveur SECRETIS.
- Pour Azure AD : remplacez `common` par votre tenant ID si vous avez des problèmes de validation de l'issuer.

---

## Support

Pour toute question non couverte par ce guide, contactez l'équipe IBIG :

- **Email technique** : support@ibig-secretis.com
- **Documentation API SSO** : `https://docs.secretis.app/sso`
