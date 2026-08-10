# Guide de contribution — IBIG SECRETIS ERP

Merci de votre intérêt pour contribuer à IBIG SECRETIS ! Ce guide décrit le processus pour participer au développement du projet, qu'il s'agisse de corrections de bugs, de nouvelles fonctionnalités, d'améliorations de la documentation ou de traductions.

**Contact contribution :** contribution@ibigsoft.com

---

## Table des matières

1. [Code de conduite](#1-code-de-conduite)
2. [Comment contribuer](#2-comment-contribuer)
3. [Style de code](#3-style-de-code)
4. [Gestion des branches](#4-gestion-des-branches)
5. [Convention de commits](#5-convention-de-commits)
6. [Pull Request — processus](#6-pull-request--processus)
7. [Tests obligatoires](#7-tests-obligatoires)
8. [Contribuer aux traductions](#8-contribuer-aux-traductions)
9. [Contribuer à la documentation](#9-contribuer-à-la-documentation)
10. [Contact et support](#10-contact-et-support)

---

## 1. Code de conduite

IBIG Soft s'engage à maintenir un environnement inclusif, respectueux et professionnel pour tous les contributeurs. En participant à ce projet, vous acceptez de :

- Utiliser un langage accueillant et inclusif
- Respecter les différents points de vue et expériences
- Accepter les critiques constructives avec bienveillance
- Vous concentrer sur ce qui est le mieux pour la communauté et le projet
- Faire preuve d'empathie envers les autres contributeurs

Les comportements inacceptables (harcèlement, insultes, discrimination) sont à signaler à contribution@ibigsoft.com. Toute plainte sera étudiée et traitée de manière confidentielle.

---

## 2. Comment contribuer

### Signaler un bug

1. Vérifier que le bug n'est pas déjà signalé dans les [Issues GitHub](https://github.com/ibigsoft/secretis-erp/issues)
2. Créer une nouvelle Issue avec le label `bug`
3. Inclure obligatoirement :
   - Version de SECRETIS concernée
   - Etapes pour reproduire le bug
   - Comportement attendu vs comportement observé
   - Screenshots ou logs si pertinents
   - Environnement : OS, navigateur, version PHP

### Proposer une fonctionnalité

1. Ouvrir une Issue avec le label `enhancement`
2. Décrire la fonctionnalité, son cas d'usage et la valeur apportée
3. Attendre la validation de l'équipe IBIG Soft avant de commencer le développement
4. Les grandes fonctionnalités font l'objet d'un ADR (Architecture Decision Record)

### Contribuer du code

1. Forker le dépôt
2. Créer une branche depuis `develop` (voir [Gestion des branches](#4-gestion-des-branches))
3. Implémenter vos changements en suivant les conventions du projet
4. Ecrire ou mettre à jour les tests
5. Soumettre une Pull Request vers `develop`

---

## 3. Style de code

### Backend — PHP (PSR-12)

SECRETIS suit le standard **PSR-12** pour tout le code PHP.

```bash
# Vérifier le style de code
./vendor/bin/pint --test

# Corriger automatiquement
./vendor/bin/pint
```

**Règles spécifiques au projet :**

```php
// Toujours utiliser des types stricts
declare(strict_types=1);

// Typer tous les paramètres, valeurs de retour et propriétés
class CreateEventAction
{
    public function execute(CreateEventData $data): Event
    {
        // Corps de la méthode
    }
}

// Utiliser les Data Transfer Objects (Spatie Laravel-Data)
class CreateEventData extends Data
{
    public function __construct(
        public readonly string $title,
        public readonly Carbon $startAt,
        public readonly Carbon $endAt,
        public readonly ?string $description = null,
    ) {}
}

// Pas de logique métier dans les Controllers — déléguer aux Actions
class EventController extends Controller
{
    public function store(CreateEventRequest $request, CreateEventAction $action): Response
    {
        $event = $action->execute(CreateEventData::from($request->validated()));
        return Inertia::render('Agenda/Show', ['event' => EventResource::make($event)]);
    }
}

// Nommage : snake_case pour les variables/méthodes, PascalCase pour les classes
// Pas de méthodes de plus de 30 lignes — extraire dans des méthodes privées
// Pas de commentaires évidents — le code doit se lire seul
// PHPDoc uniquement pour les types complexes ou les méthodes publiques d'API
```

### Frontend — TypeScript / React (ESLint + Prettier)

```bash
# Vérifier le style
npm run lint

# Corriger automatiquement
npm run lint:fix

# Formater avec Prettier
npm run format
```

**Règles spécifiques :**

```typescript
// Toujours typer les props des composants
interface EventCardProps {
  event: Event;
  onEdit: (id: string) => void;
  className?: string;
}

// Utiliser des composants fonctionnels avec flèches
const EventCard: React.FC<EventCardProps> = ({ event, onEdit, className }) => {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      {/* Contenu */}
    </div>
  );
};

// Exporter les types séparément des implémentations
export type { EventCardProps };
export { EventCard };
export default EventCard;

// Hooks personnalisés : préfixe "use"
const useAgendaEvents = (filters: EventFilters) => {
  // ...
};

// Pas de "any" — utiliser "unknown" si le type est vraiment inconnu
// Les composants ne dépassent pas 150 lignes — décomposer si nécessaire
```

### Base de données — Migrations

```php
// Nommage des migrations : verbe_table_colonne
// Exemple : add_priority_to_letters_table

// Toujours inclure la méthode down()
public function down(): void
{
    Schema::table('letters', function (Blueprint $table) {
        $table->dropColumn('priority');
    });
}

// Indices obligatoires sur toutes les colonnes de recherche et de jointure
Schema::create('events', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('tenant_id')->index();  // Index obligatoire
    $table->foreignUuid('created_by')->constrained('users');
    $table->string('title');
    $table->timestamp('start_at')->index();  // Index obligatoire
    $table->timestamps();
    $table->softDeletes();

    // Index composite pour les requêtes multi-tenant
    $table->index(['tenant_id', 'start_at']);
});
```

---

## 4. Gestion des branches

```
main          ← Production (tags de release : v1.0.0, v1.1.0)
  │
develop       ← Intégration continue (branche de base pour les PRs)
  │
  ├── feature/agenda-google-calendar-sync     ← Nouvelle fonctionnalité
  ├── feature/hr-leave-mobile-notifications   ← Nouvelle fonctionnalité
  ├── fix/courrier-ocr-timeout                ← Correction de bug
  ├── fix/agenda-room-conflict-detection      ← Correction de bug
  └── hotfix/security-xss-notes-service       ← Correctif de sécurité urgent (depuis main)
```

**Règles :**

| Branche | Base | Merge vers | Utilisation |
|---|---|---|---|
| `main` | — | — | Code de production uniquement |
| `develop` | `main` | `main` (release) | Intégration des features |
| `feature/*` | `develop` | `develop` | Nouvelles fonctionnalités |
| `fix/*` | `develop` | `develop` | Corrections de bugs non urgents |
| `hotfix/*` | `main` | `main` + `develop` | Correctifs de sécurité urgents |
| `release/*` | `develop` | `main` + `develop` | Préparation d'une release |

**Nommage des branches :** `type/description-courte-en-kebab-case`

```bash
# Créer une branche de fonctionnalité
git checkout develop
git pull origin develop
git checkout -b feature/agenda-google-calendar-sync

# Créer une branche de correction
git checkout develop
git checkout -b fix/courrier-ocr-timeout
```

---

## 5. Convention de commits

SECRETIS suit la spécification **Conventional Commits** (https://www.conventionalcommits.org).

### Format

```
type(scope): description courte en français

[Corps optionnel — explication du "pourquoi"]

[Footer optionnel — références, breaking changes]
```

### Types autorisés

| Type | Description | Exemple |
|---|---|---|
| `feat` | Nouvelle fonctionnalité | `feat(agenda): ajouter sync Google Calendar` |
| `fix` | Correction de bug | `fix(courrier): corriger le timeout OCR sur PDF larges` |
| `docs` | Documentation uniquement | `docs(api): ajouter exemples curl module RH` |
| `style` | Formatage, pas de changement logique | `style(frontend): reformater composants Agenda` |
| `refactor` | Refactoring sans bug fix ni feature | `refactor(missions): extraire MissionService` |
| `test` | Ajout ou modification de tests | `test(courrier): couvrir workflow validation 3 niveaux` |
| `perf` | Amélioration de performance | `perf(dashboard): ajouter index composite sur events` |
| `ci` | Changements CI/CD | `ci: ajouter job de tests de charge k6` |
| `chore` | Maintenance (dépendances, config) | `chore: mettre à jour Laravel 11.15` |
| `security` | Correctif de sécurité | `security(auth): corriger timing attack sur MFA` |

### Scopes autorisés

`agenda`, `courrier`, `reunions`, `personnel`, `notes`, `patrimoine`, `missions`, `biblio`, `protocole`, `dashboard`, `compta`, `budget`, `achats`, `parc-auto`, `qualite`, `elearning`, `sso`, `marketplace`, `sara`, `rgpd`, `auth`, `tenant`, `api`, `frontend`, `mobile`, `docker`, `docs`, `tests`, `ci`

### Exemples de commits valides

```bash
git commit -m "feat(agenda): ajouter la synchronisation bidirectionnelle Google Calendar

La sync est déclenchée à la connexion OAuth et toutes les 15 minutes via un Job.
Les conflits de plage horaire sont résolus avec last-write-wins.

Closes #234"

git commit -m "fix(courrier): corriger le timeout OCR sur les PDF supérieurs à 10 MB

Le timeout PHP-FPM de 30s était insuffisant pour les gros fichiers.
Augmenté à 120s pour les jobs OCR et déplacé en tâche asynchrone.

Fixes #412"

git commit -m "security(auth): corriger l'exposition du token dans les logs

Le token Bearer était écrit dans laravel.log en mode DEBUG.
Remplacé par une version masquée (****) dans tous les drivers de log.

BREAKING CHANGE: Aucun — correction transparente."
```

---

## 6. Pull Request — processus

### Avant de soumettre

- [ ] Le code respecte PSR-12 (PHP) et ESLint/Prettier (TypeScript)
- [ ] Tous les tests existants passent : `php artisan test && npm run test`
- [ ] Des tests sont ajoutés pour le nouveau code
- [ ] La couverture de tests ne diminue pas (objectif : > 80%)
- [ ] La PR ne dépasse pas 400 lignes modifiées (décomposer si nécessaire)
- [ ] La description de la PR est complète
- [ ] La PR est liée à une Issue

### Template de Pull Request

Lors de la création de votre PR, utilisez ce template :

```markdown
## Description
<!-- Décrivez brièvement les changements apportés -->

## Type de changement
- [ ] Bug fix (correction non cassante)
- [ ] Nouvelle fonctionnalité (ajout non cassant)
- [ ] Breaking change (fix ou feature qui casse l'API existante)
- [ ] Documentation uniquement
- [ ] Refactoring

## Issue(s) liée(s)
Closes #XXX

## Checklist
- [ ] Mon code suit les conventions du projet
- [ ] J'ai relu mon propre code
- [ ] J'ai commenté les parties complexes
- [ ] J'ai mis à jour la documentation si nécessaire
- [ ] Mes changements ne génèrent pas de nouveaux warnings
- [ ] J'ai ajouté des tests qui prouvent que mon fix/feature fonctionne
- [ ] Tous les tests (nouveaux et existants) passent
- [ ] Les migrations incluent la méthode down()
- [ ] Pas de données de test ou de clés API dans le code

## Screenshots (si applicable)
<!-- Ajouter des captures d'écran pour les changements UI -->

## Notes pour le reviewer
<!-- Informations supplémentaires utiles pour la revue -->
```

### Processus de revue

1. Toute PR requiert au minimum **1 approbation** d'un membre de l'équipe IBIG Soft
2. Les PRs touchant la sécurité ou l'authentification requièrent **2 approbations**
3. Les reviewers peuvent demander des modifications — répondez à chaque commentaire
4. Une fois approuvée, la PR est mergée par l'équipe IBIG Soft (squash merge vers develop)

---

## 7. Tests obligatoires

### Couverture requise

Toute nouvelle fonctionnalité doit inclure :

**Backend (Pest PHP) :**
- Tests unitaires des Actions et Services
- Tests d'intégration des Controllers (via HTTP)
- Tests des règles de validation
- Tests des politiques d'accès (authorization)

```php
// Exemple de test Pest
test('un agent peut créer un événement dans son tenant', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->for($tenant)->create()->assignRole('agent');

    actingAs($user)
        ->post('/api/v1/agenda/events', [
            'title' => 'Réunion DG',
            'start_at' => '2026-08-01T09:00:00Z',
            'end_at' => '2026-08-01T10:00:00Z',
        ])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Réunion DG');
});

test('un agent ne peut pas accéder aux événements d\'un autre tenant', function () {
    $tenantA = Tenant::factory()->create();
    $tenantB = Tenant::factory()->create();
    $event = Event::factory()->for($tenantB)->create();
    $user = User::factory()->for($tenantA)->create()->assignRole('agent');

    actingAs($user)
        ->get("/api/v1/agenda/events/{$event->id}")
        ->assertNotFound();
});
```

**Frontend (Vitest + Testing Library) :**
- Tests des composants avec rendering
- Tests des hooks personnalisés
- Tests des formulaires (soumission, validation)

```typescript
// Exemple de test composant
describe('EventCard', () => {
  it('affiche le titre et les horaires de l\'événement', () => {
    const event = createEventFixture({ title: 'Réunion DG' });
    render(<EventCard event={event} onEdit={vi.fn()} />);
    expect(screen.getByText('Réunion DG')).toBeInTheDocument();
  });
});
```

**E2E (Playwright) :**
Pour les parcours critiques (authentification, création de courrier, validation de PV) :

```typescript
test('création d\'un courrier entrant complet', async ({ page }) => {
  await loginAs(page, 'secretaire@demo.ci');
  await page.goto('/courrier/nouveau');
  await page.fill('[name="subject"]', 'Test courrier E2E');
  await page.selectOption('[name="type"]', 'entrant');
  await page.click('[type="submit"]');
  await expect(page.getByText('Courrier enregistré avec succès')).toBeVisible();
});
```

---

## 8. Contribuer aux traductions

SECRETIS est disponible en 5 langues. Les fichiers de traduction se trouvent dans :

```
lang/
├── fr/           ← Français (référence, NE PAS MODIFIER sans validation)
├── en/           ← Anglais
├── ar/           ← Arabe (RTL)
├── pt/           ← Portugais
└── es/           ← Espagnol
```

### Processus de traduction

1. Copier le fichier français correspondant
2. Traduire uniquement les valeurs (pas les clés)
3. Respecter les variables : `:name`, `:count`, `:date`
4. Pour l'arabe : vérifier la direction RTL et les pluriels (singulier/duel/pluriel)
5. Soumettre une PR avec le label `translation`

```php
// Exemple — lang/fr/agenda.php
return [
    'event_created' => 'L\'événement ":title" a été créé avec succès.',
    'event_count' => ':count événement|:count événements',
    'no_events_today' => 'Aucun événement aujourd\'hui.',
];

// lang/en/agenda.php
return [
    'event_created' => 'Event ":title" has been created successfully.',
    'event_count' => ':count event|:count events',
    'no_events_today' => 'No events today.',
];
```

**Etat des traductions (v1.0.0) :**

| Langue | Couverture | Contributeurs bienvenus |
|---|---|---|
| Français | 100% | Référence — contact contribution@ibigsoft.com |
| Anglais | 95% | Oui |
| Arabe | 78% | Oui — priorité P1 |
| Portugais | 60% | Oui |
| Espagnol | 60% | Oui |

---

## 9. Contribuer à la documentation

La documentation se trouve dans le dossier `docs/`. Les fichiers sont en Markdown.

**Types de contributions documentaires bienvenues :**
- Correction de fautes d'orthographe ou d'inexactitudes
- Ajout d'exemples de code manquants
- Traduction de la documentation
- Nouveaux guides d'utilisation des modules
- Guides d'intégration avec des outils tiers

**Processus :**
1. Editer le fichier Markdown directement sur GitHub (bouton "Edit this file")
2. Ou cloner, modifier localement, et soumettre une PR
3. Les modifications de documentation ne requièrent qu'**une seule approbation**

---

## 10. Contact et support

| Besoin | Contact |
|---|---|
| Questions sur les contributions | contribution@ibigsoft.com |
| Signalement de bug | Issues GitHub |
| Proposition de fonctionnalité | Issues GitHub + contribution@ibigsoft.com |
| Vulnérabilité de sécurité | security@ibigsoft.com (confidentiel) |
| Support utilisateur | support@ibigsoft.com |
| Questions commerciales | commercial@ibigsoft.com |

**Canal Discord (communauté) :** https://discord.gg/ibigsoft-secretis

Nous répondons aux contributions dans un délai de **5 jours ouvrables**.

---

*Guide de contribution IBIG SECRETIS — Copyright (c) 2025-2026 IBIG SARL*
