<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * SECRETIS ERP — GlobalSearchController (section 31)
 *
 * Recherche globale multi-entités scopée à l'organisation de l'utilisateur.
 * - Respect strict des permissions (Gate) par type de ressource
 * - Jamais de résultats cross-organisation
 * - Max 5 résultats par catégorie
 * - Sanitisation de la requête (protection XSS/injection)
 * - Rate-limiting via middleware throttle:60,1
 */
class GlobalSearchController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'throttle:60,1']);
    }

    /**
     * GET /api/v1/search?q=...
     */
    public function search(Request $request): JsonResponse
    {
        $query = $request->validate([
            'q' => 'required|string|min:2|max:100',
        ])['q'];

        // Sanitisation — supprime tout caractère dangereux avant usage en LIKE
        $query = strip_tags($query);
        $query = htmlspecialchars($query, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $orgId = auth()->user()->organization_id;

        // Recherche parallèle (chaque méthode vérifie ses permissions)
        $results = [
            'events'    => $this->searchEvents($query, $orgId),
            'documents' => $this->searchDocuments($query, $orgId),
            'contacts'  => $this->searchContacts($query, $orgId),
            'tasks'     => $this->searchTasks($query, $orgId),
            'visitors'  => $this->searchVisitors($query, $orgId),
            'suppliers' => $this->searchSuppliers($query, $orgId),
            'users'     => $this->searchUsers($query, $orgId),
            'help'      => $this->searchHelpArticles($query),
        ];

        // Filtrer les catégories vides
        $filtered = array_filter($results, fn($r) => count($r) > 0);

        $total = collect($results)->flatten(1)->count();

        return response()->json([
            'query'   => $query,
            'results' => $filtered,
            'total'   => $total,
        ]);
    }

    // ── Méthodes de recherche par entité ─────────────────────────────────────

    private function searchEvents(string $q, int $orgId): array
    {
        if (! Gate::allows('view.events')) {
            return [];
        }

        $userId = auth()->id();
        $like   = '%' . $this->likeEscape($q) . '%';

        try {
            return DB::table('events')
                ->where('organization_id', $orgId)
                ->where(fn($query) =>
                    // L'utilisateur voit ses propres événements ou ceux auxquels il est invité
                    $query->where('user_id', $userId)
                          ->orWhereExists(fn($sub) =>
                              $sub->select(DB::raw(1))
                                  ->from('event_attendees')
                                  ->whereColumn('event_attendees.event_id', 'events.id')
                                  ->where('event_attendees.user_id', $userId)
                          )
                )
                ->where(fn($query) =>
                    $query->where('title',       'LIKE', $like)
                          ->orWhere('description','LIKE', $like)
                          ->orWhere('location',   'LIKE', $like)
                )
                ->orderByDesc('start_at')
                ->limit(5)
                ->get(['id', 'title', 'start_at', 'location'])
                ->map(fn($e) => [
                    'id'       => $e->id,
                    'title'    => $e->title,
                    'subtitle' => $e->location ? "{$e->location} · {$e->start_at}" : $e->start_at,
                    'url'      => "/agenda/{$e->id}",
                    'type'     => 'events',
                ])
                ->toArray();
        } catch (\Throwable) {
            return [];
        }
    }

    private function searchDocuments(string $q, int $orgId): array
    {
        if (! Gate::allows('view.documents')) {
            return [];
        }

        $like = '%' . $this->likeEscape($q) . '%';

        try {
            return DB::table('documents')
                ->where('organization_id', $orgId)
                ->where(fn($query) =>
                    $query->where('name',       'LIKE', $like)
                          ->orWhere('description','LIKE', $like)
                          ->orWhere('tags',       'LIKE', $like)
                )
                ->orderByDesc('created_at')
                ->limit(5)
                ->get(['id', 'name', 'mime_type', 'created_at'])
                ->map(fn($d) => [
                    'id'       => $d->id,
                    'title'    => $d->name,
                    'subtitle' => $d->mime_type . ' · ' . $d->created_at,
                    'url'      => "/ged/{$d->id}",
                    'type'     => 'documents',
                ])
                ->toArray();
        } catch (\Throwable) {
            return [];
        }
    }

    private function searchContacts(string $q, int $orgId): array
    {
        if (! Gate::allows('view.contacts')) {
            return [];
        }

        $like = '%' . $this->likeEscape($q) . '%';

        try {
            return DB::table('contacts')
                ->where('organization_id', $orgId)
                ->where(fn($query) =>
                    $query->where('first_name', 'LIKE', $like)
                          ->orWhere('last_name',  'LIKE', $like)
                          ->orWhere('email',       'LIKE', $like)
                          ->orWhere('company',     'LIKE', $like)
                )
                ->limit(5)
                ->get(['id', 'first_name', 'last_name', 'email', 'company'])
                ->map(fn($c) => [
                    'id'       => $c->id,
                    'title'    => trim("{$c->first_name} {$c->last_name}"),
                    'subtitle' => $c->company ? "{$c->company} · {$c->email}" : $c->email,
                    'url'      => "/contacts/{$c->id}",
                    'type'     => 'contacts',
                ])
                ->toArray();
        } catch (\Throwable) {
            return [];
        }
    }

    private function searchTasks(string $q, int $orgId): array
    {
        if (! Gate::allows('view.tasks')) {
            return [];
        }

        $like = '%' . $this->likeEscape($q) . '%';

        try {
            return DB::table('tasks')
                ->where('organization_id', $orgId)
                ->where(fn($query) =>
                    $query->where('title',      'LIKE', $like)
                          ->orWhere('description','LIKE', $like)
                )
                ->orderByDesc('created_at')
                ->limit(5)
                ->get(['id', 'title', 'status', 'due_date'])
                ->map(fn($t) => [
                    'id'       => $t->id,
                    'title'    => $t->title,
                    'subtitle' => "{$t->status}" . ($t->due_date ? " · Échéance : {$t->due_date}" : ''),
                    'url'      => "/taches/{$t->id}",
                    'type'     => 'tasks',
                ])
                ->toArray();
        } catch (\Throwable) {
            return [];
        }
    }

    private function searchVisitors(string $q, int $orgId): array
    {
        if (! Gate::allows('view.visitors')) {
            return [];
        }

        $like = '%' . $this->likeEscape($q) . '%';

        try {
            return DB::table('visitors')
                ->where('organization_id', $orgId)
                ->where(fn($query) =>
                    $query->where('first_name', 'LIKE', $like)
                          ->orWhere('last_name',  'LIKE', $like)
                          ->orWhere('company',    'LIKE', $like)
                          ->orWhere('badge_code', 'LIKE', $like)
                )
                ->orderByDesc('check_in_at')
                ->limit(5)
                ->get(['id', 'first_name', 'last_name', 'company', 'check_in_at'])
                ->map(fn($v) => [
                    'id'       => $v->id,
                    'title'    => trim("{$v->first_name} {$v->last_name}"),
                    'subtitle' => ($v->company ?? '') . " · {$v->check_in_at}",
                    'url'      => "/accueil/visitors/{$v->id}",
                    'type'     => 'visitors',
                ])
                ->toArray();
        } catch (\Throwable) {
            return [];
        }
    }

    private function searchSuppliers(string $q, int $orgId): array
    {
        if (! Gate::allows('view.suppliers')) {
            return [];
        }

        $like = '%' . $this->likeEscape($q) . '%';

        try {
            return DB::table('suppliers')
                ->where('organization_id', $orgId)
                ->where(fn($query) =>
                    $query->where('name',  'LIKE', $like)
                          ->orWhere('email','LIKE', $like)
                          ->orWhere('phone','LIKE', $like)
                )
                ->limit(5)
                ->get(['id', 'name', 'email', 'category'])
                ->map(fn($s) => [
                    'id'       => $s->id,
                    'title'    => $s->name,
                    'subtitle' => ($s->category ?? '') . ($s->email ? " · {$s->email}" : ''),
                    'url'      => "/fournisseurs/{$s->id}",
                    'type'     => 'suppliers',
                ])
                ->toArray();
        } catch (\Throwable) {
            return [];
        }
    }

    private function searchUsers(string $q, int $orgId): array
    {
        // Réservé aux administrateurs
        if (! auth()->user()?->hasRole(['admin', 'superadmin_ibig'])) {
            return [];
        }

        $like = '%' . $this->likeEscape($q) . '%';

        try {
            return DB::table('users')
                ->where('organization_id', $orgId)
                ->where(fn($query) =>
                    $query->where('first_name', 'LIKE', $like)
                          ->orWhere('last_name',  'LIKE', $like)
                          ->orWhere('email',      'LIKE', $like)
                )
                ->limit(5)
                ->get(['id', 'first_name', 'last_name', 'email'])
                ->map(fn($u) => [
                    'id'       => $u->id,
                    'title'    => trim("{$u->first_name} {$u->last_name}"),
                    'subtitle' => $u->email,
                    'url'      => "/parametres/utilisateurs/{$u->id}",
                    'type'     => 'users',
                ])
                ->toArray();
        } catch (\Throwable) {
            return [];
        }
    }

    private function searchHelpArticles(string $q): array
    {
        $like = '%' . $this->likeEscape($q) . '%';

        try {
            return DB::table('help_articles')
                ->where('is_published', true)
                ->where(fn($query) =>
                    $query->where('title',  'LIKE', $like)
                          ->orWhere('content','LIKE', $like)
                          ->orWhere('tags',   'LIKE', $like)
                )
                ->orderByDesc('views_count')
                ->limit(5)
                ->get(['id', 'title', 'slug', 'category'])
                ->map(fn($a) => [
                    'id'       => $a->id,
                    'title'    => $a->title,
                    'subtitle' => $a->category ?? 'Aide',
                    'url'      => "/help/articles/{$a->slug}",
                    'type'     => 'help',
                ])
                ->toArray();
        } catch (\Throwable) {
            return [];
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Échappe les caractères spéciaux SQL LIKE (%, _, \).
     * Protège contre les injections par wildcard.
     */
    private function likeEscape(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $value);
    }
}
