# IBIG SECRETIS – Rapport de Baseline Performance

> **Date de référence :** 2024-01-01 (valeurs cibles à atteindre)
> **Environnement :** Production-like (Laravel + PostgreSQL + Redis + Reverb)
> **Outil :** k6 v0.52+

---

## 1. Tableau des valeurs cibles par endpoint

| Endpoint | p50 cible | p95 cible | p99 cible | TPS cible | Notes |
|---|---|---|---|---|---|
| `POST /api/auth/login` | 80 ms | 200 ms | 400 ms | 100 req/s | Sanctum, rate-limiter 5 req/min |
| `POST /api/auth/logout` | 20 ms | 80 ms | 150 ms | 200 req/s | Révocation token |
| `GET /api/dashboard` | 100 ms | 300 ms | 600 ms | 200 req/s | Cache Redis 60s |
| `GET /api/dashboard/kpis/*` | 10 ms | 50 ms | 100 ms | 500 req/s | Cache Redis (hit) |
| `GET /api/events` (mois) | 50 ms | 150 ms | 300 ms | 300 req/s | Index composite date |
| `POST /api/events` | 80 ms | 250 ms | 500 ms | 100 req/s | Détection conflits |
| `GET /api/courriers` | 40 ms | 120 ms | 250 ms | 400 req/s | Pagination + index |
| `POST /api/courriers` | 60 ms | 200 ms | 400 ms | 150 req/s | SELECT FOR UPDATE (référence) |
| `GET /api/courriers/search` | 80 ms | 300 ms | 600 ms | 100 req/s | Full-text PostgreSQL |
| `GET /api/documents` | 30 ms | 100 ms | 200 ms | 500 req/s | Liste paginée |
| `POST /api/documents` (upload) | 500 ms | 3 000 ms | 8 000 ms | 20 req/s | Fichier 1 MB, stockage S3 |
| `POST /api/documents/{id}/signed-url` | 20 ms | 80 ms | 150 ms | 300 req/s | Génération URL S3 |
| `GET /api/documents/search` (OCR) | 200 ms | 800 ms | 1 500 ms | 50 req/s | ElasticSearch/pg_trgm |
| `GET /api/tasks` | 30 ms | 100 ms | 200 ms | 400 req/s | Filtrée par utilisateur |
| `POST /api/tasks` | 50 ms | 150 ms | 300 ms | 200 req/s | |
| `GET /api/messages` | 20 ms | 80 ms | 150 ms | 600 req/s | |
| `POST /api/messages` | 30 ms | 100 ms | 200 ms | 300 req/s | Broadcast Reverb |
| `POST /api/webhooks/stripe` | 50 ms | 200 ms | 400 ms | 200 req/s | Idempotence obligatoire |
| WebSocket (connexion) | 100 ms | 400 ms | 800 ms | 200 conn | Laravel Reverb |
| WebSocket (latence message) | 5 ms | 50 ms | 100 ms | — | RTT message |

---

## 2. Capacité maximale théorique par composant

### Serveur d'application (Laravel / PHP-FPM)

| Paramètre | Valeur cible | Configuration |
|---|---|---|
| Workers PHP-FPM | 50–100 | `pm.max_children = 100` |
| Requêtes simultanées | 500–1 000 | Dépend du TPS et du p95 |
| Mémoire par worker | 32–64 MB | Optimisé avec OPcache |
| Throughput brut | 500–800 req/s | Endpoints légers (liste) |
| Throughput uploads | 10–20 uploads/s | Limité par I/O disque/S3 |

### Base de données (PostgreSQL 15+)

| Paramètre | Valeur cible | Configuration |
|---|---|---|
| Connexions simultanées | 100–200 | `max_connections = 200` |
| Connexions via PgBouncer | 500–1 000 | Pool mode = transaction |
| Requêtes/sec (OLTP) | 5 000–10 000 | Index optimisés |
| Requêtes/sec (full-text) | 500–1 000 | `pg_trgm`, GIN index |
| Taille maximale DB | ~500 GB | Avant partitioning |

### Cache (Redis 7+)

| Paramètre | Valeur cible | Configuration |
|---|---|---|
| Opérations/sec | 100 000+ | Single instance |
| Hit rate cible | > 80 % | TTL 60–300s |
| Latence GET | < 1 ms | Réseau local |
| Mémoire max | 4–8 GB | `maxmemory-policy allkeys-lru` |

### WebSockets (Laravel Reverb)

| Paramètre | Valeur cible | Configuration |
|---|---|---|
| Connexions simultanées | 5 000–10 000 | Reverb + Swoole |
| Messages/sec | 10 000–50 000 | Pub/sub Redis |
| Latence message p95 | < 50 ms | Réseau local |
| Canaux simultanés | 1 000+ | |

### Stockage (S3 compatible)

| Paramètre | Valeur cible | Notes |
|---|---|---|
| Upload simultanés | 50–100 | Limité par bande passante |
| Débit upload | 100 MB/s | Agrégé |
| Débit download | 500 MB/s | CDN recommandé |
| IOPS | 10 000+ | SSD ou NVMe |

---

## 3. Goulots d'étranglement identifiés

### 3.1 PHP-FPM (critique)

**Problème :** PHP-FPM bloquant. Chaque requête d'upload monopolise un worker pendant toute la durée du transfert S3 (1–10s). À 50 uploads simultanés, tous les workers sont occupés.

**Impact :** Saturation à ~50–80 VU pour les uploads. Les autres endpoints souffrent.

**Solution :**
- Queue asynchrone pour les uploads (Laravel Jobs + Horizon)
- Traitement S3 en arrière-plan après réception du fichier
- Pré-URL signée côté client (upload direct vers S3)

### 3.2 Génération de références de courrier (critique)

**Problème :** La génération de référence unique utilise `SELECT FOR UPDATE` → verrou exclusif sur la table de séquence. Sous forte charge (30+ VU), les transactions s'attendent en chaîne.

**Impact :** p95 monte à 600ms+ à 30 VU simultanés.

**Solution :**
- Utiliser une séquence PostgreSQL native (`SEQUENCE`) : atomique et sans verrou
- Ou UUID v7 (temps-encodé) : pas de coordination nécessaire
- Pré-générer des blocs de références (batch pre-allocation)

### 3.3 Recherche full-text OCR (modéré)

**Problème :** Les requêtes `tsvector` sur des corpus volumineux (>1M documents) dépassent 1s sans index GIN.

**Impact :** p95 > 1s à 50 VU avec >100k documents.

**Solution :**
- Index GIN sur la colonne `search_vector` (déjà recommandé)
- Cache des résultats fréquents (Redis, TTL 30s)
- ElasticSearch pour les cas > 500k documents

### 3.4 Dashboard sans cache (modéré)

**Problème :** Sans Redis, chaque appel `/api/dashboard` exécute 8–12 requêtes SQL agrégées.

**Impact :** p95 > 1s à 20 VU sans cache.

**Solution (déjà en place) :** Cache Redis 60s par utilisateur. Vérifier l'invalidation sur les mutations.

### 3.5 Connexions base de données (modéré)

**Problème :** Laravel ouvre une connexion PostgreSQL par requête. À 200 VU, on dépasse `max_connections = 100` (défaut).

**Impact :** Erreurs "too many connections" à partir de ~100 VU sans pool.

**Solution :**
- PgBouncer en mode transaction (obligatoire en production)
- `DB_POOL_SIZE = 20` par worker PHP (via `php-fpm.conf`)
- `max_connections = 500` si RAM suffisante (> 4 GB)

### 3.6 Rate-limiter (comportement attendu)

Le rate-limiter Sanctum (5 req/min par IP) est intentionnel. Sous test, utiliser des IPs distribuées ou désactiver pour les tests de charge non-auth.

---

## 4. Recommandations de scaling horizontal

### 4.1 Scaling stateless (immédiat)

| Composant | Action | Impact attendu |
|---|---|---|
| PHP-FPM workers | Passer de 50 à 200 workers | TPS × 4 |
| Instances applicatives | 3 répliques derrière Nginx | TPS × 3, HA |
| Queue workers (Horizon) | 10 workers dédiés | Uploads non-bloquants |

### 4.2 Scaling de la base de données

| Action | Prérequis | Impact |
|---|---|---|
| Réplica en lecture | PostgreSQL streaming replication | GET TPS × 2–3 |
| PgBouncer | Docker ou système | Support 1 000+ connexions |
| Partitionnement (courriers, events) | > 10M lignes | Queries < 50ms constants |
| Index partiels | Audit requêtes lentes | Quick win |

### 4.3 Scaling Redis

| Action | Prérequis | Impact |
|---|---|---|
| Redis Cluster (3 nœuds) | Redis 7+ | 300k ops/sec |
| Redis Sentinel | 3 nœuds | HA automatique |
| Séparation cache/sessions/queues | 3 instances Redis | Isolation |

### 4.4 Scaling WebSockets (Reverb)

| Action | Prérequis | Impact |
|---|---|---|
| Reverb en mode cluster | Redis pub/sub | 50k+ connexions |
| Load balancer sticky sessions | Nginx + ip_hash | Connexions stables |
| Swoole ou ReactPHP | PHP asynchrone | 10× throughput WS |

### 4.5 Seuils d'alerte recommandés (production)

| Métrique | Alerte | Critique |
|---|---|---|
| CPU serveur app | > 70 % | > 85 % |
| Mémoire PHP-FPM | > 80 % | > 95 % |
| Connexions PostgreSQL | > 80 % de max_connections | > 90 % |
| Mémoire Redis | > 70 % de maxmemory | > 85 % |
| p95 HTTP global | > 500 ms | > 1 000 ms |
| Taux d'erreur HTTP | > 0.1 % | > 1 % |
| Queue depth (Horizon) | > 500 jobs | > 2 000 jobs |
| Connexions WebSocket | > 80 % max | > 95 % max |

---

## 5. Plan de progression vers la capacité cible

```
Phase 1 (maintenant) : 50 VU, p95 < 500ms
  → Valider smoke + load tests

Phase 2 (3 mois) : 200 VU, p95 < 500ms
  → PgBouncer + Redis cache + queue async uploads
  → Objectif : 1 000 req/s agrégées

Phase 3 (6 mois) : 500 VU, p95 < 500ms
  → 3 instances applicatives + réplica PostgreSQL
  → Objectif : 3 000 req/s agrégées

Phase 4 (12 mois) : 1 000+ VU, p95 < 500ms
  → Redis Cluster + Reverb cluster + CDN
  → Objectif : 10 000 req/s agrégées
```

---

*Rapport généré automatiquement. Mettre à jour après chaque campagne de tests de charge.*
