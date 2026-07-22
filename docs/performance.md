# Guide de Performance — SECRETIS ERP

## Résultats cibles

| Métrique | Objectif | Mesure |
|----------|----------|--------|
| TTFB (Time to First Byte) | < 200 ms | Lighthouse / GTmetrix |
| FCP (First Contentful Paint) | < 1,5 s | Lighthouse |
| LCP (Largest Contentful Paint) | < 2,5 s | Lighthouse |
| TTI (Time to Interactive) | < 3 s | Lighthouse |
| CLS (Cumulative Layout Shift) | < 0,1 | Lighthouse |
| FID (First Input Delay) | < 100 ms | Lighthouse |

### Scores Lighthouse cibles

| Catégorie | Objectif |
|-----------|----------|
| Performance | > 90 |
| Accessibility | > 95 |
| Best Practices | > 95 |
| SEO | > 90 |

---

## Architecture du cache par couche

```
Requête HTTP
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  L0 — CDN / Nginx (assets statiques)                 │
│  Headers: Cache-Control: public, max-age=31536000    │
│  TTL: 1 an (cache busting via hash dans le nom)      │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  L1 — Cache PHP mémoire (CacheService->l1Cache)     │
│  Scope: durée de la request courante uniquement       │
│  TTL: implicite (GC en fin de request)               │
│  Usage: évite les double-appels Redis dans 1 request │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  L2 — Redis (CacheService via Cache::tags)          │
│  TTL selon le type de donnée :                       │
│    Permissions user     : 5 min                      │
│    KPIs dashboard       : 5 min                      │
│    Événements agenda    : 1 min                      │
│    Tâches               : 2 min                      │
│    Référentiels          : 1 h                       │
│    Settings organisation : 1 h                       │
│  Invalidation par tags (org:{id}, user:{id})        │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  L3 — PostgreSQL (requêtes optimisées)               │
│  Indexes sur : organization_id, status, due_date...  │
│  Connection pooling via PgBouncer (recommandé prod)  │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  Frontend — TanStack Query (React)                   │
│  staleTime par type : 30s (notifs) → 1h (référentiels)│
│  gcTime : 10 min (données en mémoire hors usage)     │
│  Prefetching des pages adjacentes                    │
└─────────────────────────────────────────────────────┘
```

---

## Checklist avant mise en production

### Backend Laravel

- [ ] `APP_ENV=production` et `APP_DEBUG=false` dans `.env`
- [ ] `php artisan config:cache` — cache de la configuration
- [ ] `php artisan route:cache` — cache des routes
- [ ] `php artisan view:cache` — cache des vues Blade
- [ ] `php artisan event:cache` — cache des listeners d'événements
- [ ] `composer install --no-dev --optimize-autoloader` — autoloader optimisé
- [ ] Redis configuré comme driver de cache (`CACHE_DRIVER=redis`)
- [ ] Redis configuré comme driver de queue (`QUEUE_CONNECTION=redis`)
- [ ] `QUEUE_DRIVER=redis` et workers de queue démarrés (`php artisan queue:work`)
- [ ] Indexes base de données appliqués (`database-indexes.sql`)
- [ ] Vérifier que `CacheInvalidationObserver` est enregistré dans `AppServiceProvider`
- [ ] Vérifier que `OptimizeResponse` middleware est enregistré pour le groupe `api`
- [ ] Vérifier que `QueryOptimizationServiceProvider` est dans `bootstrap/providers.php`
- [ ] Configurer le canal de log `slow_queries` dans `config/logging.php`
- [ ] Activer OPcache PHP (`opcache.enable=1`, `opcache.preload`)
- [ ] Configurer Horizon pour la supervision des queues (optionnel mais recommandé)

### Frontend React

- [ ] `npm run build` — bundle de production généré
- [ ] Vérifier que les fichiers `.br` et `.gz` sont générés (vite-plugin-compression)
- [ ] Configurer Nginx pour servir `.br` en priorité (`brotli_static on`)
- [ ] Vérifier les headers `Cache-Control` sur les assets (Network tab DevTools)
- [ ] Vérifier que le code splitting fonctionne (Network tab : chunks séparés)
- [ ] Lancer l'analyse du bundle : `ANALYZE=true npm run build`
- [ ] Vérifier que les images utilisent `<LazyImage>` partout où applicable
- [ ] Vérifier que les listes longues (>100 items) utilisent `<VirtualTable>`
- [ ] S'assurer que les composants lourds (Calendrier, Charts) sont lazy-loadés

### Infrastructure

- [ ] CDN configuré (CloudFlare, AWS CloudFront…) pour les assets statiques
- [ ] SSL/TLS actif (HTTP/2 ou HTTP/3 pour le multiplexing)
- [ ] Compression Brotli activée au niveau Nginx/CDN
- [ ] Monitoring des performances activé (Sentry Performance, Datadog, New Relic…)
- [ ] Alertes sur les temps de réponse > 500ms
- [ ] Health check endpoint disponible pour le load balancer

---

## Commandes de profiling Laravel

### Laravel Telescope (développement)

```bash
# Installer Telescope
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate

# Accéder au dashboard : /telescope
# Sections utiles :
#   Requests  → voir le nombre de requêtes DB par request
#   Queries   → identifier les requêtes lentes et dupliquées
#   Cache     → voir les hits/miss du cache Redis
```

### Laravel Debugbar (développement)

```bash
composer require barryvdh/laravel-debugbar --dev

# La barre de debug apparaît en bas de chaque page HTML
# Pour les réponses JSON (API) : activer le header X-Debug-Bar
```

### Profiling manuel des requêtes

```bash
# Afficher les requêtes DB d'une route dans tinker
php artisan tinker

>>> DB::enableQueryLog();
>>> app()->call([\App\Http\Controllers\AgendaController::class, 'index']);
>>> dd(DB::getQueryLog());
```

### Analyse du cache Redis

```bash
# Voir toutes les clés SECRETIS dans Redis
redis-cli KEYS "secretis:*" | head -50

# Voir la taille d'une clé spécifique
redis-cli MEMORY USAGE "secretis:org:1:dashboard.kpis"

# Vider le cache d'une organisation
php artisan tinker
>>> app(\App\Services\CacheService::class)->invalidateOrganizationCache(1);

# Stats globales Redis
redis-cli INFO stats | grep -E "hit|miss"
```

### Profiling des performances mémoire PHP

```bash
# Surveiller la mémoire consommée par request
# Ajouter dans un middleware :
\Log::debug('Memory peak', ['mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2)]);

# Ou via PHP-FPM slow log :
# slowlog = /var/log/php-fpm/slow.log
# request_slowlog_timeout = 2s
```

---

## Commandes de profiling Frontend

```bash
# Analyse du bundle Vite (ouvre un treemap interactif)
ANALYZE=true npm run build

# Rapport de performance Lighthouse (requires Chromium)
npx lighthouse http://localhost:8000 --output=html --output-path=./lighthouse-report.html

# Analyser la taille des chunks
ls -lh public/build/assets/*.js | sort -k5 -rh | head -20

# Vérifier la compression
ls -lh public/build/assets/*.br | sort -k5 -rh | head -10
```

---

## Règles de nommage des clés Redis

Format : `secretis:{scope}:{id}:{sous-clé}`

| Exemple | Description |
|---------|-------------|
| `secretis:org:42:dashboard.kpis` | KPIs dashboard de l'org 42 |
| `secretis:org:42:calendar.events.20260101_20260131` | Événements de janvier 2026 |
| `secretis:user:7:permissions` | Permissions de l'user 7 |
| `secretis:org:42:tasks.kanban.proj-123` | Kanban du projet 123 |

Tags Redis pour l'invalidation groupée :
- `org:{id}` — invalide tous les caches d'une organisation
- `user:{id}` — invalide tous les caches d'un utilisateur
- `kpis` — invalide tous les KPIs (toutes organisations)
- `org:{id}:calendar` — invalide uniquement le calendrier de l'org

---

## Patterns anti-performance à éviter

### Backend

1. **Requête N+1** : ne jamais charger des relations dans une boucle
   ```php
   // MAUVAIS — N requêtes pour N tâches
   foreach ($tasks as $task) {
       echo $task->creator->name; // requête par itération
   }

   // BON — 2 requêtes en tout
   $tasks = Task::with('creator')->get();
   ```

2. **Select * en production** : toujours sélectionner les colonnes nécessaires
   ```php
   // MAUVAIS
   Task::all();

   // BON
   Task::select('id', 'title', 'status', 'due_date')->get();
   ```

3. **Compter via count() sur collection chargée** : utiliser les scopes DB
   ```php
   // MAUVAIS
   $task->subtasks->count(); // si subtasks déjà chargé → OK, sinon N+1

   // BON (si on a juste besoin du count)
   $task->subtasks()->count(); // 1 requête COUNT SQL
   ```

### Frontend

1. **Recréation d'objets dans le JSX** : toujours mémoïser
   ```jsx
   // MAUVAIS — nouvel objet à chaque rendu, déclenche des re-rendus
   <Component config={{ key: 'value' }} />

   // BON
   const config = useMemo(() => ({ key: 'value' }), []);
   <Component config={config} />
   ```

2. **Callbacks non stables** : utiliser useCallback
   ```jsx
   // MAUVAIS — nouveau callback à chaque rendu
   <Button onClick={() => handleClick(id)} />

   // BON
   const handleClick = useCallback(() => doClick(id), [id]);
   <Button onClick={handleClick} />
   ```

3. **Dépendances TanStack Query mal définies** : toujours inclure toutes les variables dans la query key
   ```jsx
   // MAUVAIS — ne se met pas à jour si orgId change
   useQuery({ queryKey: ['tasks'], queryFn: () => fetchTasks(orgId) });

   // BON
   useQuery({ queryKey: ['tasks', orgId, filters], queryFn: () => fetchTasks(orgId, filters) });
   ```
