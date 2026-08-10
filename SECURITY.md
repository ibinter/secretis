# Politique de sécurité — IBIG SECRETIS ERP

**Editeur :** IBIG SARL
**Contact sécurité :** security@ibigsoft.com
**Chiffrement PGP :** Disponible sur request à security@ibigsoft.com
**Dernière mise à jour :** 22 juillet 2026

---

## Versions supportées

Seules les versions suivantes d'IBIG SECRETIS reçoivent des mises à jour de sécurité :

| Version | Support sécurité | Support maintenance | Fin de vie |
|---|---|---|---|
| **1.0.x** | Oui (actuelle) | Oui | Juillet 2027 |
| 0.9.x (bêta) | Non | Non | Terminé |
| 0.8.x (alpha) | Non | Non | Terminé |

**Note pour les clients On-Premise :** Les correctifs de sécurité sont distribués en priorité via le portail de licences IBIG Soft. Il est fortement recommandé d'appliquer les mises à jour de sécurité dans les **72 heures** suivant leur publication.

---

## Comment signaler une vulnérabilité

### Processus de divulgation responsable

IBIG Soft est engagé dans une politique de **divulgation responsable** (Responsible Disclosure). Si vous découvrez une vulnérabilité dans IBIG SECRETIS, nous vous demandons de nous en informer de manière confidentielle avant toute divulgation publique.

### Etapes à suivre

1. **Rédiger un rapport** incluant :
   - Description détaillée de la vulnérabilité
   - Etapes pour reproduire le problème
   - Impact potentiel (données exposées, comptes compromis, etc.)
   - Version de SECRETIS concernée
   - Preuve de concept (PoC) si disponible
   - Vos coordonnées pour le suivi

2. **Envoyer le rapport** à : **security@ibigsoft.com**
   - Objet : `[SECURITE] Description brève de la vulnérabilité`
   - Pour les vulnérabilités critiques, vous pouvez demander notre clé PGP pour chiffrer votre e-mail

3. **Ne pas divulguer publiquement** la vulnérabilité tant qu'un correctif n'a pas été déployé ou qu'un accord de divulgation coordonnée n'a pas été établi avec notre équipe.

### Ce que vous pouvez faire pendant la recherche

- Tests sur un compte de démonstration SECRETIS que vous avez créé vous-même
- Tests sur votre propre instance SECRETIS (SaaS ou On-Premise)
- Fuzzing, analyse statique et revue de code sur le code source accessible

### Ce qui est hors scope

Les activités suivantes sont **strictement interdites** et ne seront pas récompensées :

- Tests sur la plateforme de démonstration publique `demo.ibig-secretis.com`
- Tests sur les instances de production de nos clients
- Attaques de déni de service (DoS/DDoS)
- Ingénierie sociale sur les employés IBIG Soft
- Attaques physiques sur nos infrastructures
- Accès non autorisé aux systèmes de nos clients
- Scan de ports sur nos serveurs sans autorisation préalable
- Exploitation effective de la vulnérabilité au-delà de la démonstration de faisabilité

---

## Délais de réponse

| Etape | Délai |
|---|---|
| Accusé de réception | **48 heures** |
| Confirmation de la vulnérabilité | **5 jours ouvrables** |
| Estimation du correctif | **10 jours ouvrables** |
| Déploiement du correctif (critique) | **72 heures** après confirmation |
| Déploiement du correctif (haute) | **7 jours** après confirmation |
| Déploiement du correctif (moyenne/basse) | **30 jours** après confirmation |
| Notification aux clients | Simultané au déploiement du correctif |

---

## Classification des vulnérabilités

Nous utilisons le système **CVSS v3.1** pour classifier la sévérité :

| Sévérité | Score CVSS | Description | Exemple |
|---|---|---|---|
| Critique | 9.0 – 10.0 | Exécution de code à distance, RCE | Injection SQL permettant un accès admin |
| Haute | 7.0 – 8.9 | Contournement d'authentification, accès cross-tenant | Lecture de données d'un autre tenant |
| Moyenne | 4.0 – 6.9 | Elévation de privilèges, XSS stocké | XSS dans le champ "notes" d'un courrier |
| Basse | 0.1 – 3.9 | Fuite d'informations mineures, CSRF faible | Enumération des noms d'utilisateurs |

---

## Notre engagement

En retour de votre divulgation responsable, IBIG Soft s'engage à :

- **Accuser réception** de votre rapport dans les 48 heures
- **Travailler avec vous** pour comprendre et reproduire la vulnérabilité
- **Vous tenir informé** de l'avancement du correctif
- **Vous créditer** dans les notes de sécurité (si vous le souhaitez)
- **Ne pas engager d'action légale** contre vous si vous avez respecté ce processus de divulgation responsable
- **Potentiellement récompenser** les découvertes significatives (programme de bug bounty en développement pour 2027)

---

## Hall of Fame — Contributeurs sécurité

Nous remercions chaleureusement les chercheurs en sécurité qui ont contribué à améliorer IBIG SECRETIS :

*Cette section sera alimentée dès la première divulgation responsable reçue.*

| Chercheur | Organisation | Vulnérabilité | Date | Sévérité |
|---|---|---|---|---|
| — | — | — | — | — |

Pour figurer dans ce Hall of Fame, votre rapport doit être confirmé comme une vulnérabilité valide et vous devez avoir suivi le processus de divulgation responsable décrit dans ce document.

---

## Mesures de sécurité en place

### OWASP Top 10 (v1.0.0)

| Risque OWASP | Mesure implémentée |
|---|---|
| A01 Broken Access Control | Policies Spatie par ressource, vérification tenant_id systématique, RLS PostgreSQL |
| A02 Cryptographic Failures | TLS 1.3 obligatoire, bcrypt (cost=12) pour les mots de passe, AES-256 pour les données au repos |
| A03 Injection | ORM Eloquent avec requêtes préparées, validation stricte des inputs, échappement des sorties |
| A04 Insecure Design | Architecture DDD, principe du moindre privilège, revues de conception |
| A05 Security Misconfiguration | Headers de sécurité (HSTS, CSP, X-Frame-Options, CORP), configuration durcée PHP-FPM |
| A06 Vulnerable Components | Dependabot activé, audit npm/composer hebdomadaire, dépendances mises à jour en continu |
| A07 Auth Failures | MFA obligatoire (TOTP/SMS), rate limiting sur /login, tokens rotatifs Sanctum, blocage après 5 échecs |
| A08 Software Integrity | Signatures SHA-256 des releases, SBOM généré, vérification des intégrités lors des builds |
| A09 Logging Failures | Logs structurés vers Sentry, audit logs immuables (Spatie Auditing), alertes sur anomalies |
| A10 SSRF | Validation et liste d'autorisation des URLs dans les intégrations, sandbox réseau pour les webhooks |

### Tests de sécurité automatisés

- SAST (Static Application Security Testing) : Psalm, PHPStan (niveau max), ESLint security plugin
- DAST (Dynamic Application Security Testing) : OWASP ZAP sur chaque release candidate
- Analyse des dépendances : Snyk + GitHub Dependabot
- Secrets scanning : Git-secrets + TruffleHog dans le pipeline CI

### Certifications et conformité

- **ISO 27001:2022** : 89% des contrôles implémentés — certification prévue Q1 2027
- **RGPD** : conforme — DPO désigné, registre des traitements, droits des personnes implémentés
- **OHADA/ARTCI** : conforme aux réglementations locales ivoiriennes et africaines

---

## Mises à jour de sécurité passées

| Version | Date | Description |
|---|---|---|
| v1.0.0 | 22 juillet 2026 | Release initiale — base de sécurité complète |

---

## Contact

**Email principal :** security@ibigsoft.com
**Email de secours :** direction@ibigsoft.com
**Délai de réponse garanti :** 48 heures

**Adresse postale :**
IBIG SARL
[Adresse siège social]
Abidjan, Côte d'Ivoire

---

*Politique de sécurité IBIG SECRETIS — Copyright (c) 2025-2026 IBIG SARL*
*Ce document est revu et mis à jour à chaque release majeure.*
