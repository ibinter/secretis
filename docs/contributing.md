# Guide de contribution — IBIG SECRETIS

Merci de votre intérêt pour IBIG SECRETIS. Ce guide décrit comment contribuer au projet de manière efficace et en respectant nos standards de qualité.

> SECRETIS est un logiciel propriétaire d'IBIG Soft. Les contributions externes sont acceptées sous forme de Pull Requests sur invitation ou dans le cadre du programme partenaires. Contactez dev@ibigsoft.com pour rejoindre le programme.

---

## Table des matières

1. [Signaler un bug](#signaler-un-bug)
2. [Proposer une fonctionnalité](#proposer-une-fonctionnalité)
3. [Standards de code PHP](#standards-de-code-php)
4. [Standards de code JavaScript](#standards-de-code-javascript)
5. [Processus de Pull Request](#processus-de-pull-request)
6. [Tests requis](#tests-requis)
7. [Variables d'environnement pour le développement local](#variables-denvironnement-pour-le-développement-local)

---

## Signaler un bug

1. **Vérifier** que le bug n'est pas déjà signalé dans les [issues GitHub](https://github.com/ibigsoft/secretis/issues).
2. **Ouvrir une nouvelle issue** avec le label `bug`.
3. **Remplir le template** fourni, qui inclut :
   - Description claire et concise du bug
   - Étapes pour reproduire (numérotées)
   - Comportement attendu vs comportement observé
   - Captures d'écran ou logs si pertinent
   - Environnement : OS, navigateur, version SECRETIS, rôle utilisateur
4. **Ne pas inclure** de données personnelles réelles ou d'identifiants de connexion dans le rapport.

**Template de rapport de bug :**

```markdown
## Description
[Description claire du bug]

## Étapes pour reproduire
1. Se connecter avec le rôle [rôle]
2. Naviguer vers [module]
3. Effectuer [action]
4. Observer [erreur]

## Comportement attendu
[Ce qui devrait se passer]

## Comportement observé
[Ce qui se passe réellement]

## Environnement
- Version SECRETIS : 1.0.x
- Navigateur : Chrome 126 / Firefox 127
- OS : Windows 11 / macOS 14 / Ubuntu 22.04
- Rôle utilisateur : secretary / admin_org

## Logs pertinents
[Coller les logs sans données sensibles]
```

---

## Proposer une fonctionnalité

1. **Vérifier** la [roadmap](roadmap.md) — la fonctionnalité est peut-être déjà planifiée.
2. **Ouvrir une issue** avec le label `enhancement`.
3. **Décrire** :
   - Le problème métier que la fonctionnalité résout
   - La solution proposée (fonctionnalité, flux utilisateur)
   - Les modules impactés
   - L'impact sur les performances ou la sécurité si applicable
4. **Attendre** le retour de l'équipe produit IBIG Soft avant de commencer le développement.

---

## Standards de code PHP

### PSR-12

Tout le code PHP doit respecter [PSR-12](https://www.php-fig.org/psr/psr-12/). Utiliser PHP CS Fixer pour la vérification automatique :

```bash
./vendor/bin/php-cs-fixer fix --config=.php-cs-fixer.php
```

### Conventions de nommage

```php
// Classes → PascalCase
class CreateEventAction {}

// Méthodes → camelCase
public function getForOrganization(int $orgId): Collection {}

// Variables → camelCase
$currentTenant = app('currentTenant');

// Constantes → SCREAMING_SNAKE_CASE
const STATUS_EXPIRED = 'expired';

// Tables → snake_case pluriel
// → mail_attachments, audit_logs, room_reservations

// Colonnes → snake_case
// → organization_id, created_at, is_active
```

### Architecture DDD obligatoire

Chaque nouvelle fonctionnalité métier doit suivre le pattern Action/Service/Repository :

```php
// Toujours créer une Action dédiée pour chaque opération métier
// NE PAS mettre la logique métier dans les Controllers
class CreateCourrierAction
{
    public function __construct(
        private CourrierRepositoryInterface $repository,
        private AuditService $audit,
    ) {}

    public function execute(CourrierData $data): Courrier
    {
        // 1. Validation métier
        // 2. Persistance via Repository
        // 3. Émission d'événement
        // 4. Audit log
    }
}
```

### Docblocs OpenAPI

Toutes les méthodes des controllers API doivent avoir un docbloc PHPDoc avec annotations OpenAPI :

```php
/**
 * @OA\Post(
 *     path="/api/v1/agenda/events",
 *     summary="Créer un événement",
 *     tags={"Agenda"},
 *     security={{"sanctum": {}}},
 *     ...
 * )
 */
public function store(StoreEventRequest $request): JsonResponse {}
```

---

## Standards de code JavaScript

### ESLint + Prettier

```bash
# Vérification
npm run lint

# Correction automatique
npm run lint:fix

# Formatage
npm run format
```

### Conventions React

```jsx
// Composants → PascalCase, fichier .jsx
// Un composant par fichier
const DataTable = ({ data, columns, onRowClick }) => {
    // Hooks en premier
    const [loading, setLoading] = useState(false);
    const { can } = usePermission();

    // Handlers préfixés "handle"
    const handleRowClick = (row) => { ... };

    // JSX retourné en dernier
    return <table>...</table>;
};

export default DataTable;
```

### Hooks personnalisés

```js
// Prefixe "use", un hook par fichier dans resources/js/Hooks/
export const usePermission = () => {
    const { auth } = usePage().props;
    return {
        can: (permission) => auth.user?.permissions?.includes(permission) ?? false,
    };
};
```

---

## Processus de Pull Request

### Branches

```
main          → Production (déploiements uniquement depuis CI)
develop       → Branche de développement principale
feature/xxx   → Nouvelle fonctionnalité
fix/xxx       → Correction de bug
hotfix/xxx    → Correction urgente en production
refactor/xxx  → Refactoring sans changement de comportement
docs/xxx      → Documentation uniquement
```

### Workflow complet

```bash
# 1. Mettre à jour develop
git checkout develop && git pull origin develop

# 2. Créer la branche de travail
git checkout -b feature/ma-fonctionnalite

# 3. Développer + commits atomiques
git add app/Domain/Agenda/Actions/CreateEventAction.php
git commit -m "feat(agenda): add CreateEventAction with conflict detection"

# 4. Pousser et ouvrir la PR
git push origin feature/ma-fonctionnalite
# → Ouvrir PR sur GitHub vers develop
```

### Format des commits (Conventional Commits)

```
type(scope): description courte en impératif

[body optionnel : contexte, pourquoi ce changement]

[footer : BREAKING CHANGE, Closes #123]
```

**Types autorisés :**
- `feat` : nouvelle fonctionnalité
- `fix` : correction de bug
- `refactor` : refactoring sans changement comportemental
- `test` : ajout ou modification de tests
- `docs` : documentation uniquement
- `perf` : amélioration des performances
- `chore` : tâches de maintenance (dépendances, CI)
- `security` : correction de sécurité

### Checklist avant de soumettre une PR

- [ ] Code respecte PSR-12 (PHP) et ESLint/Prettier (JS)
- [ ] Tests ajoutés pour la nouvelle fonctionnalité ou la correction
- [ ] Tous les tests existants passent (`php artisan test`)
- [ ] Pas de données de test en dur (factories uniquement)
- [ ] Migrations réversibles (`down()` correctement implémenté)
- [ ] Pas de `dd()`, `var_dump()`, `console.log()` laissés dans le code
- [ ] Docbloc OpenAPI mis à jour si endpoint API créé/modifié
- [ ] Clés de traduction ajoutées dans `lang/fr/` ET `lang/en/`
- [ ] Impact sur les permissions RBAC documenté
- [ ] `CHANGELOG.md` mis à jour dans la section `[Unreleased]`

### Revue de code

Chaque PR doit avoir **au minimum 1 approbation** d'un membre de l'équipe IBIG Soft avant d'être fusionnée. La revue vérifie :
- Respect de l'architecture DDD
- Isolation tenant correcte
- Sécurité (injection, autorisation)
- Performance (N+1, index)
- Couverture de tests

---

## Tests requis

### Tests unitaires (Pest PHP)

```php
// tests/Unit/Services/AgendaServiceTest.php
it('détecte les conflits horaires pour un utilisateur', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create([
        'user_id'    => $user->id,
        'starts_at'  => now()->addHour(),
        'ends_at'    => now()->addHours(2),
    ]);

    $conflicts = app(AgendaService::class)->getConflicts(
        $user->id,
        now()->addMinutes(30),
        now()->addHours(3),
    );

    expect($conflicts)->toHaveCount(1)
        ->and($conflicts->first()->id)->toBe($event->id);
});
```

### Tests de fonctionnalités (Feature tests)

```php
// tests/Feature/Agenda/AgendaTest.php
it('crée un événement et notifie les participants', function () {
    $org  = Organization::factory()->create();
    $user = User::factory()->for($org)->withRole('secretary')->create();
    $participant = User::factory()->for($org)->create();

    actingAs($user)
        ->post('/api/v1/agenda/events', [
            'title'        => 'Réunion mensuelle',
            'starts_at'    => now()->addDay()->toISOString(),
            'ends_at'      => now()->addDay()->addHour()->toISOString(),
            'attendees'    => [$participant->id],
        ])
        ->assertCreated()
        ->assertJsonStructure(['data' => ['id', 'title', 'starts_at']]);

    expect(Event::where('title', 'Réunion mensuelle')->exists())->toBeTrue();
    // Vérifier la notification
    Notification::assertSentTo($participant, EventReminderNotification::class);
});
```

### Tests multi-tenancy obligatoires

```php
// tests/Feature/Tenancy/MultiTenancyTest.php
it('interdit à un utilisateur d\'accéder aux données d\'un autre tenant', function () {
    $org1 = Organization::factory()->create();
    $org2 = Organization::factory()->create();
    $user1 = User::factory()->for($org1)->create();
    $event2 = Event::factory()->for($org2)->create();

    actingAs($user1)
        ->get("/api/v1/agenda/events/{$event2->id}")
        ->assertNotFound(); // Scoped → 404, pas 403
});
```

### Lancer les tests

```bash
# Tous les tests
php artisan test

# Tests d'un module spécifique
php artisan test --filter=AgendaTest

# Tests avec couverture de code
php artisan test --coverage --min=80

# Tests en parallèle (rapide)
php artisan test --parallel
```

---

## Variables d'environnement pour le développement local

Copier `.env.example` vers `.env` et configurer :

```env
# Application
APP_NAME="IBIG SECRETIS Dev"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Base de données
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=secretis_dev
DB_USERNAME=root
DB_PASSWORD=

# Redis (obligatoire pour cache, session, queue)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Sessions en Redis (pas de fichier en développement multi-process)
SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis

# WebSocket Reverb (développement)
REVERB_APP_ID=secretis-local
REVERB_APP_KEY=local-key
REVERB_APP_SECRET=local-secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http

# Vite (pour Laravel Echo)
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

# Email (Mailtrap en développement)
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=<votre_username_mailtrap>
MAIL_PASSWORD=<votre_password_mailtrap>
MAIL_FROM_ADDRESS=noreply@secretis-dev.local
MAIL_FROM_NAME="SECRETIS Dev"

# Meilisearch (recherche full-text)
SCOUT_DRIVER=meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=

# Stockage local en développement
FILESYSTEM_DISK=local

# Configuration SECRETIS
SECRETIS_TRIAL_DAYS=14
SECRETIS_MAX_UPLOAD_MB=50
SECRETIS_GRACE_PERIOD_DAYS=7

# Horizon (monitoring queues)
HORIZON_PREFIX=secretis_dev:
```

### Outils de développement recommandés

| Outil | Usage |
|-------|-------|
| [Laravel Herd](https://herd.laravel.com) | Serveur PHP local, vhost automatique |
| [TablePlus](https://tableplus.com) | Interface MySQL |
| [Redis Insight](https://redis.com/redis-enterprise/redis-insight/) | Interface Redis |
| [Mailtrap](https://mailtrap.io) | Capture emails de développement |
| [Meilisearch local](https://www.meilisearch.com/docs/learn/getting_started/installation) | Moteur de recherche local |
| [Bruno](https://www.usebruno.com) | Client API REST (alternative Postman) |
