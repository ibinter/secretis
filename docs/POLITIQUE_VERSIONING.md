# Politique de Versioning — IBIG SECRETIS

**Version du document :** 1.0
**Date :** 2026-07-23
**Auteur :** Équipe Engineering IBIG Soft
**Statut :** Applicable à partir de la version 2.1.0

---

## 1. Schéma de versioning

IBIG SECRETIS suit le [Semantic Versioning 2.0.0](https://semver.org/lang/fr/) avec le format :

```
MAJOR.MINOR.PATCH
```

### MAJOR (version majeure)

Incrémentée lorsqu'une modification est incompatible avec les versions précédentes :

- Rupture de compatibilité de l'API REST (suppression ou changement de signature d'endpoints existants)
- Migration de données lourde nécessitant une intervention manuelle ou une fenêtre de maintenance prolongée
- Changement de stack technique majeur (ex. passage PHP 8.x → 9.x, changement d'ORM)
- Suppression d'un module entier ou d'une fonctionnalité annoncée depuis ≥ 6 mois
- Refonte complète du modèle de données (restructuration de tables fondamentales)

Exemples : `1.0.0 → 2.0.0`, `2.0.0 → 3.0.0`

### MINOR (version mineure)

Incrémentée lorsqu'une fonctionnalité nouvelle est ajoutée de manière rétro-compatible :

- Nouveau module métier
- Nouveau endpoint API (non breaking)
- Nouveau provider paiement ou connecteur marketplace
- Nouvelle langue ou nouvelle région géographique
- Fonctionnalité majeure au sein d'un module existant (ex. Report Builder, PWA)
- Nouvelles commandes artisan

Exemples : `1.0.0 → 1.5.0`, `2.0.0 → 2.1.0`

### PATCH (version de correction)

Incrémentée pour des corrections et améliorations mineures rétro-compatibles :

- Correction de bug (fix)
- Amélioration de performance sans changement d'interface
- Correction de traduction ou de typo dans l'interface
- Mise à jour de dépendance de sécurité (sans changement fonctionnel)
- Correction d'un index de base de données manquant
- Ajustement CSS ou d'accessibilité mineur

Exemples : `2.1.0 → 2.1.1`, `2.1.3 → 2.1.4`

---

## 2. Numérotation des pré-releases

Pour les versions en cours de développement ou de test :

| Suffixe | Signification | Exemple |
|---|---|---|
| `-alpha.N` | Développement en cours, instable | `2.2.0-alpha.1` |
| `-beta.N` | Fonctionnalités complètes, tests en cours | `2.2.0-beta.2` |
| `-rc.N` | Release Candidate, validation finale | `2.2.0-rc.1` |

Les pré-releases ne sont jamais déployées en production client. Elles ciblent l'environnement de staging et les bêta-testeurs désignés.

---

## 3. Branches Git

### Modèle de branches

```
main ─────────────────────────────────────────── production stable
  │
  ├── develop ──────────────────────────────── intégration continue
  │     │
  │     ├── feature/sara-v3-memory ─────────── nouvelle fonctionnalité
  │     ├── feature/module-stock ─────────────── nouveau module
  │     └── feature/lang-yoruba ──────────────── nouvelle langue
  │
  ├── release/2.2.0 ───────────────────────── branche de release
  │
  └── hotfix/rate-limit-bypass ─────────────── correction urgente production
```

### Règles par branche

**`main`**
- Code de production uniquement — toujours en état déployable
- Protégée : aucun push direct, merge via Pull Request uniquement
- Chaque commit sur `main` correspond à un tag de version signé
- CI/CD déclenche le déploiement automatique sur staging, puis production après approbation

**`develop`**
- Branche d'intégration — état stable mais pas nécessairement prêt pour la production
- Toutes les branches `feature/*` et `fix/*` mergent ici via Pull Request
- CI/CD complet obligatoire (lint + tests + build) avant merge
- Déployée automatiquement sur l'environnement de développement

**`feature/*`**
- Convention de nommage : `feature/description-courte-en-minuscules` (ex. `feature/module-stock`, `feature/sara-memory`)
- Branchée depuis `develop`
- Durée de vie maximale recommandée : 2 semaines (éviter les longues branches divergentes)
- Pull Request vers `develop` avec au moins 1 revue de code et 0 test en échec

**`fix/*`**
- Convention de nommage : `fix/description-courte` (ex. `fix/export-pdf-encoding`)
- Branchée depuis `develop`
- Pour les corrections non-urgentes — urgentes → voir `hotfix/*`

**`release/X.Y.Z`**
- Branchée depuis `develop` au moment du feature freeze
- Seules les corrections de bugs peuvent être mergées dans cette branche (pas de nouvelles fonctionnalités)
- Mergée dans `main` ET dans `develop` après validation complète
- Supprimée après le merge

**`hotfix/*`**
- Convention de nommage : `hotfix/description-courte` (ex. `hotfix/rate-limit-bypass`)
- Branchée depuis `main` (pas depuis `develop`)
- Uniquement pour les bugs critiques en production : faille de sécurité, perte de données, panne totale
- Mergée dans `main` ET dans `develop` après correction
- Incrémente la version PATCH (ex. `2.1.0 → 2.1.1`)
- Déploiement en production dans l'heure après validation

---

## 4. Processus de release

### Étapes séquentielles

**1. Feature freeze**
- Annonce en interne (Slack `#engineering`) : aucune nouvelle fonctionnalité dans `develop` à partir de cette date
- Durée typique entre feature freeze et release : 5 jours ouvrés

**2. Création de la branche de release**
```bash
git checkout develop
git pull origin develop
git checkout -b release/2.2.0
git push origin release/2.2.0
```

**3. Tests de recette complets**
- Exécuter la suite Pest complète : `php artisan test --coverage --min=85`
- Exécuter les 47 scénarios Playwright : `npx playwright test`
- Exécuter k6 smoke + load : `k6 run load-tests/release-validation.js`
- Audit d'accessibilité : Lighthouse Accessibilité > 95
- Audit de sécurité : `php artisan secretis:security-audit` → 0 critique
- Revue manuelle des fonctionnalités nouvelles par le Product Owner

**4. Mise à jour du CHANGELOG**
- Compléter `CHANGELOG.md` selon le format Keep a Changelog
- Chaque fonctionnalité listée sous `### Ajouté`, `### Modifié`, `### Corrigé`, `### Supprimé`, `### Sécurité`, `### Déprécié`
- Vérifier que chaque entrée est compréhensible par un utilisateur non-technique

**5. Bump de version**
```bash
# Mettre à jour la version dans les fichiers concernés
# composer.json → "version": "2.2.0"
# package.json → "version": "2.2.0"
# config/app.php → 'version' => '2.2.0'
# mobile/app.json → "version": "2.2.0", "ios.buildNumber", "android.versionCode"

git add composer.json package.json config/app.php mobile/app.json CHANGELOG.md
git commit -m "chore: bump version to 2.2.0"
```

**6. Tag git signé**
```bash
git tag -s v2.2.0 -m "Release v2.2.0 — [résumé en une phrase]"
git push origin v2.2.0
```

**7. Build Docker et push registry**
```bash
docker build -t ghcr.io/ibigsoft/secretis-app:2.2.0 -f docker/Dockerfile.prod .
docker build -t ghcr.io/ibigsoft/secretis-app:latest -f docker/Dockerfile.prod .
docker push ghcr.io/ibigsoft/secretis-app:2.2.0
docker push ghcr.io/ibigsoft/secretis-app:latest
```

**8. Déploiement staging**
- GitHub Actions déclenche automatiquement le déploiement sur `staging.ibig-secretis.com` à la création du tag
- Validation humaine sur staging pendant 24 heures minimum (72h pour les versions MAJOR)
- Critères de validation staging : 0 erreur Sentry, Lighthouse Performance > 80, smoke test k6 OK

**9. Déploiement production (blue/green)**
- Approbation manuelle dans GitHub Actions (deux approbateurs requis pour MAJOR)
- Déploiement progressif : 10% du trafic pendant 30 min → 50% pendant 30 min → 100%
- Rollback automatique si taux d'erreur HTTP 5xx > 1% pendant le déploiement progressif

**10. Post-déploiement**
- Annonce in-app type `Info` : « Nouvelle version 2.2.0 disponible — Voir les nouveautés »
- Email aux clients Enterprise : résumé des changements les concernant
- Mise à jour du changelog public `/changelog` (automatique via seeder)
- Post LinkedIn IBIG Soft (si MINOR ou MAJOR)
- Archivage de la branche de release

---

## 5. Compatibilité et support

### API REST
- **Versionnement** : `/api/v1`, `/api/v2` — chaque version majeure introduit potentiellement une nouvelle version d'API
- **Période de support** : une version d'API est supportée pendant **18 mois** après l'introduction de la version suivante
- **Dépréciation** : 6 mois de préavis avant la fin de support d'une version API (header `Sunset` dans les réponses, annonce dans le changelog)
- **Breaking changes** : jamais dans une version MINOR ou PATCH — uniquement en MAJOR avec migration guide fourni

### Base de données
- **Principes** : jamais de `DROP COLUMN` ou `DROP TABLE` sans version MAJOR
- **Colonnes** : renommage via colonne temporaire (copie + migration de données + suppression de l'ancienne dans la MAJOR suivante)
- **Migrations** : toujours réversibles (`down()` implémentée) pour les PATCH et MINOR
- **Index** : ajout d'index toujours concurrentiels (`CREATE INDEX CONCURRENTLY`) pour ne pas bloquer la production

### Application mobile
- SECRETIS Mobile supporte les **2 versions majeures précédentes** du serveur
- Exemple : si la plateforme est en v3.x, les apps compilées pour v2.x et v1.x restent fonctionnelles
- Au-delà, un message d'invitation à mettre à jour l'app est affiché

### Mises à jour obligatoires
Les mises à jour contenant des corrections de sécurité critiques (CVE) sont classées `SECURITY` dans le CHANGELOG et les clients sont notifiés par email avec un délai de mise à jour recommandé de 72h maximum.

---

## 6. Convention de commits

SECRETIS suit la convention [Conventional Commits 1.0.0](https://www.conventionalcommits.org/fr/).

### Format
```
<type>(<scope>): <description courte>

[corps optionnel — explication du "pourquoi"]

[pied de page optionnel — BREAKING CHANGE, Closes #123]
```

### Types
| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité (incrémente MINOR) |
| `fix` | Correction de bug (incrémente PATCH) |
| `perf` | Amélioration de performance sans changement fonctionnel |
| `refactor` | Refactoring sans changement fonctionnel ni correction |
| `test` | Ajout ou correction de tests |
| `docs` | Documentation uniquement |
| `chore` | Tâches de maintenance (bump de version, CI, dépendances) |
| `style` | Formatage, espaces, virgules — pas de changement de logique |
| `ci` | Changements CI/CD |
| `security` | Correction de sécurité (toujours mentionné dans le CHANGELOG) |

### Scopes fréquents
`auth`, `sara`, `billing`, `accounting`, `hr`, `ged`, `crm`, `projects`, `quality`, `fleet`, `mobile`, `api`, `pwa`, `i18n`, `a11y`, `cache`, `queue`

### Exemple complet
```
feat(sara): add multi-provider fallback with Anthropic and OpenAI

SARA now automatically falls back to Anthropic Claude Haiku if Groq
is unavailable, then to OpenAI GPT-4o-mini as a last resort.
Response times and provider usage are logged for monitoring.

Closes #847
```

---

## 7. Tags de release et signatures

Chaque release est taguée avec un tag git annoté et signé par GPG :

```bash
# Configuration GPG (une seule fois par développeur)
git config --global user.signingkey IBIG_SOFT_GPG_KEY_ID
git config --global commit.gpgsign true
git config --global tag.gpgsign true

# Création du tag signé
git tag -s v2.2.0 -m "Release IBIG SECRETIS v2.2.0

Phase X — Résumé en une phrase

Highlights:
- Fonctionnalité 1
- Fonctionnalité 2
- N corrections de bugs

Voir CHANGELOG.md pour le détail complet."
```

La clé GPG publique IBIG Soft est disponible sur `https://keyserver.ibigsoft.com` et dans le fichier `KEYS` à la racine du dépôt.

---

*Document Engineering IBIG Soft — Applicable à partir de la version 2.1.0*
*Révision planifiée tous les 6 mois ou à chaque changement de processus majeur*
