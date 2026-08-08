<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Crm\CrmActivity;
use App\Models\Crm\CrmContact;
use App\Models\Crm\CrmDeal;
use App\Models\Crm\CrmEmailLog;
use App\Models\Crm\CrmEmailTemplate;
use App\Models\Crm\CrmPipelineStage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CRM commercial d'IBIG Soft (prospection SECRETIS), côté SuperAdmin.
 *
 * ⚠️ Ce contrôleur était un mannequin de 35 lignes, avec deux défauts sérieux :
 *
 *  1. `contacts()` interrogeait la table **`contacts`** — celle des carnets
 *     d'adresses DES CLIENTS — au lieu de `crm_contacts`. L'écran de prospection
 *     d'IBIG affichait donc les contacts métier de toutes les organisations
 *     locataires : une fuite inter-tenants doublée d'une donnée fausse.
 *  2. `pipeline()` groupait `crm_prospects`, table qui **n'existe pas** ; le
 *     garde `Schema::hasTable()` renvoyait toujours false et le pipeline restait
 *     désespérément vide. Les vraies tables sont `crm_deals` + `crm_pipeline_stages`.
 *
 * Par ailleurs les deux écrans rechargent leurs données en axios (JSON) après le
 * premier rendu : chaque méthode de liste répond donc en Inertia OU en JSON.
 */
class CrmController extends Controller
{
    /** Valeurs admises par les contraintes CHECK de `crm_contacts` et `crm_deals`. */
    private const SOURCES = ['web', 'referral', 'partner', 'event', 'cold', 'social', 'inbound'];
    private const STATUTS = ['new', 'contacted', 'qualified', 'demo', 'proposal', 'negotiation', 'won', 'lost', 'inactive'];
    private const TYPES   = ['prospect', 'client', 'partner', 'lead'];
    private const PLANS   = ['starter', 'pro', 'enterprise'];
    /** `crm_activities.type` est lui aussi sous contrainte CHECK. */
    private const TYPES_ACTIVITE = ['call', 'email', 'meeting', 'demo', 'proposal', 'follow_up', 'note', 'task'];

    // =========================================================================
    // Pipeline
    // =========================================================================

    public function pipeline(Request $request): Response|JsonResponse
    {
        $etapes = CrmPipelineStage::orderBy('order')->get();

        $affaires = CrmDeal::with(['contact:id,company_name,contact_name,email,phone', 'assignedUser:id,name'])
            ->when($request->filled('assigned_to'), fn ($q) => $q->where('assigned_to', $request->input('assigned_to')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $terme = '%' . $request->input('search') . '%';
                $q->where(fn ($s) => $s->where('title', 'ilike', $terme)
                    ->orWhereHas('contact', fn ($c) => $c->where('company_name', 'ilike', $terme)));
            })
            ->orderByDesc('updated_at')
            ->get();

        $parEtape = $affaires->groupBy('stage_id');

        $donnees = [
            'stages' => $etapes->map(fn ($e) => [
                'id'          => $e->id,
                'name'        => $e->name,
                'color'       => $e->color,
                'probability' => $e->probability_percent,
                'is_won'      => $e->is_closed_won,
                'is_lost'     => $e->is_closed_lost,
                'deals'       => ($parEtape[$e->id] ?? collect())->map(fn ($d) => $this->ligneAffaire($d))->values(),
                'total_value' => (int) ($parEtape[$e->id] ?? collect())->sum('value'),
                'count'       => ($parEtape[$e->id] ?? collect())->count(),
            ])->values(),
            'totals' => [
                'deals'    => $affaires->count(),
                'value'    => (int) $affaires->sum('value'),
                'weighted' => (int) $affaires->sum(fn ($d) => $d->value * ($d->probability ?? 0) / 100),
            ],
        ];

        if ($request->expectsJson()) {
            return response()->json($donnees);
        }

        return Inertia::render('SuperAdmin/Crm/Pipeline', [
            'initialData' => $donnees,
            'commerciaux' => $this->commerciaux(),
        ]);
    }

    /**
     * POST /superadmin/crm/deals/{id}/stage — déplacement par glisser-déposer.
     */
    public function moveDealStage(Request $request, int $id): JsonResponse
    {
        $valide = $request->validate([
            'stage_id' => ['required', 'integer', 'exists:crm_pipeline_stages,id'],
        ]);

        $affaire = CrmDeal::findOrFail($id);
        $ancienne = $affaire->stage_id;
        $etape = CrmPipelineStage::findOrFail($valide['stage_id']);

        DB::transaction(function () use ($affaire, $etape, $ancienne) {
            $affaire->stage_id = $etape->id;
            // La probabilité suit l'étape, sauf si elle a été forcée à la main.
            $affaire->probability = $etape->probability_percent;

            if ($etape->is_closed_won || $etape->is_closed_lost) {
                $affaire->close_date_actual = now()->toDateString();
            }

            $affaire->save();

            CrmActivity::create([
                'contact_id' => $affaire->contact_id,
                'deal_id'    => $affaire->id,
                // `type` est contraint en base : un changement d'étape se
                // consigne comme une note, pas comme un type inventé.
                'type'       => 'note',
                'subject'    => "Étape : {$etape->name}",
                'notes'      => "Affaire déplacée vers « {$etape->name} » (étape précédente : #{$ancienne}).",
                'created_by' => auth()->id(),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => "Affaire déplacée vers « {$etape->name} ».",
            'deal'    => $this->ligneAffaire($affaire->fresh(['contact', 'assignedUser'])),
        ]);
    }

    // =========================================================================
    // Contacts
    // =========================================================================

    public function contacts(Request $request): Response|JsonResponse
    {
        $requete = CrmContact::with('assignedUser:id,name')
            ->withCount('deals')
            ->when($request->filled('search'), function ($q) use ($request) {
                $terme = '%' . $request->input('search') . '%';
                $q->where(fn ($s) => $s->where('company_name', 'ilike', $terme)
                    ->orWhere('contact_name', 'ilike', $terme)
                    ->orWhere('email', 'ilike', $terme));
            })
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->input('type')))
            ->when($request->filled('assigned_to'), fn ($q) => $q->where('assigned_to', $request->input('assigned_to')))
            ->orderByDesc('created_at');

        $contacts = $requete->limit(200)->get()->map(fn ($c) => $this->ligneContact($c));

        if ($request->expectsJson()) {
            return response()->json(['data' => $contacts]);
        }

        return Inertia::render('SuperAdmin/Crm/Contacts', [
            'contacts'    => $contacts,
            'commerciaux' => $this->commerciaux(),
            'referentiel' => [
                'sources' => self::SOURCES,
                'statuts' => self::STATUTS,
                'types'   => self::TYPES,
            ],
        ]);
    }

    /**
     * GET /superadmin/crm/contacts/create
     * La création se fait dans une modale de la liste : on y renvoie.
     */
    public function createContact(): RedirectResponse
    {
        return redirect()->route('superadmin.crm.contacts', ['nouveau' => 1]);
    }

    public function storeContact(Request $request): JsonResponse
    {
        $contact = CrmContact::create($this->valider($request));

        return response()->json([
            'success' => true,
            'message' => 'Contact enregistré.',
            'data'    => $this->ligneContact($contact),
        ], 201);
    }

    public function showContact(Request $request, int $id): Response|JsonResponse
    {
        $contact = CrmContact::with([
            'assignedUser:id,name',
            'deals.stage:id,name,color',
            'activities' => fn ($q) => $q->orderByDesc('created_at')->limit(50),
        ])->findOrFail($id);

        $donnees = $this->ligneContact($contact) + [
            'notes'      => $contact->notes,
            'deals'      => $contact->deals->map(fn ($d) => $this->ligneAffaire($d))->values(),
            'activities' => $contact->activities->map(fn ($a) => [
                'id'         => $a->id,
                'type'       => $a->type,
                'subject'    => $a->subject,
                'notes'      => $a->notes,
                'created_at' => optional($a->created_at)->format('d/m/Y H:i'),
            ])->values(),
        ];

        if ($request->expectsJson()) {
            return response()->json(['data' => $donnees]);
        }

        return Inertia::render('SuperAdmin/Crm/ContactDetail', [
            'contact'     => $donnees,
            'commerciaux' => $this->commerciaux(),
        ]);
    }

    public function updateContact(Request $request, int $id): JsonResponse
    {
        $contact = CrmContact::findOrFail($id);
        $contact->update($this->valider($request, partiel: true));

        return response()->json([
            'success' => true,
            'message' => 'Contact mis à jour.',
            'data'    => $this->ligneContact($contact->fresh('assignedUser')),
        ]);
    }

    public function destroyContact(int $id): JsonResponse
    {
        $contact = CrmContact::withCount('deals')->findOrFail($id);

        if ($contact->deals_count > 0) {
            return response()->json([
                'message' => "Ce contact porte {$contact->deals_count} affaire(s) : archivez-les avant de le supprimer.",
            ], 422);
        }

        $contact->delete();

        return response()->json(['success' => true, 'message' => 'Contact supprimé.']);
    }

    /**
     * POST /superadmin/crm/contacts/import — import CSV.
     * Colonnes attendues (en-tête, séparateur « ; » ou « , ») :
     * company_name, contact_name, email, phone, country, city, sector, source.
     */
    public function importContacts(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $chemin = $request->file('file')->getRealPath();
        $flux   = fopen($chemin, 'r');

        if (! $flux) {
            return response()->json(['message' => 'Fichier illisible.'], 422);
        }

        // Le séparateur se déduit de la première ligne : les exports Excel
        // francophones utilisent « ; », les autres « , ».
        $premiere  = fgets($flux);
        $separateur = substr_count($premiere, ';') >= substr_count($premiere, ',') ? ';' : ',';
        rewind($flux);

        $entetes = array_map(
            fn ($h) => strtolower(trim(str_replace("\xEF\xBB\xBF", '', $h))),
            fgetcsv($flux, 0, $separateur) ?: []
        );

        $connues = ['company_name', 'contact_name', 'email', 'phone', 'country', 'city', 'sector', 'source', 'notes'];
        $importes = 0;
        $ignorees = [];
        $ligne = 1;

        while (($donnees = fgetcsv($flux, 0, $separateur)) !== false) {
            $ligne++;
            $brut = array_combine(
                array_slice($entetes, 0, count($donnees)),
                array_slice($donnees, 0, count($entetes))
            ) ?: [];

            $attributs = array_intersect_key($brut, array_flip($connues));
            $attributs = array_filter($attributs, fn ($v) => $v !== null && trim((string) $v) !== '');

            // `company_name`, `contact_name` et `email` sont NOT NULL : sans
            // l'un des trois, la ligne est inexploitable. On complète le nom du
            // contact par celui de la société plutôt que de perdre la ligne.
            if (empty($attributs['company_name']) || empty($attributs['email'])) {
                $ignorees[] = "ligne {$ligne} : société ou email manquant";
                continue;
            }

            $attributs['contact_name'] = $attributs['contact_name'] ?? $attributs['company_name'];

            // Dédoublonnage sur l'email quand il est fourni.
            if (! empty($attributs['email'])
                && CrmContact::where('email', $attributs['email'])->exists()) {
                $ignorees[] = "ligne {$ligne} : {$attributs['email']} déjà présent";
                continue;
            }

            // `source` porte une contrainte CHECK : toute valeur libre du CSV
            // ferait échouer l'insertion. On retombe sur « inbound ».
            $source = strtolower(trim((string) ($attributs['source'] ?? '')));
            $attributs['source'] = in_array($source, self::SOURCES, true) ? $source : 'inbound';

            CrmContact::create($attributs + [
                'type'   => 'prospect',
                'status' => 'new',
            ]);
            $importes++;
        }

        fclose($flux);

        return response()->json([
            'success'  => true,
            'message'  => "{$importes} contact(s) importé(s)."
                          . (count($ignorees) ? ' ' . count($ignorees) . ' ligne(s) ignorée(s).' : ''),
            'imported' => $importes,
            'skipped'  => array_slice($ignorees, 0, 20),
        ]);
    }

    /**
     * POST /superadmin/crm/contacts/{id}/convert — transformer en affaire.
     */
    public function convertContact(Request $request, int $id): JsonResponse
    {
        $valide = $request->validate([
            'title'       => ['nullable', 'string', 'max:255'],
            'value'       => ['nullable', 'integer', 'min:0'],
            'plan'        => ['nullable', 'in:' . implode(',', self::PLANS)],
            'users_count' => ['nullable', 'integer', 'min:1'],
            'close_date_expected' => ['nullable', 'date'],
        ]);

        $contact = CrmContact::findOrFail($id);
        $premiere = CrmPipelineStage::orderBy('order')->first();

        if (! $premiere) {
            return response()->json(['message' => 'Aucune étape de pipeline configurée.'], 422);
        }

        $affaire = CrmDeal::create([
            'contact_id'  => $contact->id,
            'stage_id'    => $premiere->id,
            'title'       => $valide['title'] ?? ('Opportunité — ' . ($contact->company_name ?: $contact->contact_name)),
            'value'       => $valide['value'] ?? 0,
            // IBIG Soft vend hors zone XOF : la devise de l'affaire suit le
            // pays du prospect plutôt qu'un repli ivoirien.
            'currency'    => $contact->country
                ? (app(\App\Services\CurrencyService::class)->currencyForCountry($contact->country) ?? 'XOF')
                : 'XOF',
            'plan'        => $valide['plan'] ?? null,
            'users_count' => $valide['users_count'] ?? null,
            'probability' => $premiere->probability_percent,
            'close_date_expected' => $valide['close_date_expected'] ?? now()->addMonth()->toDateString(),
            'assigned_to' => $contact->assigned_to ?? auth()->id(),
        ]);

        $contact->update(['status' => 'qualified', 'last_contact_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Affaire créée dans le pipeline.',
            'data'    => $this->ligneAffaire($affaire->fresh('contact')),
        ], 201);
    }

    /**
     * POST /superadmin/crm/activities — consigner un échange.
     */
    public function storeActivity(Request $request): JsonResponse
    {
        $valide = $request->validate([
            'contact_id' => ['required', 'integer', 'exists:crm_contacts,id'],
            'deal_id'    => ['nullable', 'integer', 'exists:crm_deals,id'],
            'type'       => ['required', 'in:' . implode(',', self::TYPES_ACTIVITE)],
            'subject'    => ['required', 'string', 'max:255'],
            'notes'      => ['nullable', 'string', 'max:5000'],
        ]);

        $activite = CrmActivity::create($valide + ['created_by' => auth()->id()]);

        // Un échange consigné vaut prise de contact.
        CrmContact::whereKey($valide['contact_id'])->update(['last_contact_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Échange consigné.',
            'data'    => [
                'id'         => $activite->id,
                'type'       => $activite->type,
                'subject'    => $activite->subject,
                'notes'      => $activite->notes,
                'created_at' => $activite->created_at->format('d/m/Y H:i'),
            ],
        ], 201);
    }

    public function analytics(Request $request): Response
    {
        $etapes = CrmPipelineStage::orderBy('order')->get();
        $affaires = CrmDeal::get(['stage_id', 'value', 'probability', 'created_at', 'close_date_actual']);

        return Inertia::render('SuperAdmin/Crm/Analytics', [
            'stats' => [
                'contacts'      => CrmContact::count(),
                'deals'         => $affaires->count(),
                'pipeline_value'=> (int) $affaires->sum('value'),
                'weighted_value'=> (int) $affaires->sum(fn ($d) => $d->value * ($d->probability ?? 0) / 100),
                'won'           => $affaires->whereIn('stage_id', $etapes->where('is_closed_won', true)->pluck('id'))->count(),
                'lost'          => $affaires->whereIn('stage_id', $etapes->where('is_closed_lost', true)->pluck('id'))->count(),
                'par_etape'     => $etapes->map(fn ($e) => [
                    'name'  => $e->name,
                    'count' => $affaires->where('stage_id', $e->id)->count(),
                    'value' => (int) $affaires->where('stage_id', $e->id)->sum('value'),
                ])->values(),
            ],
        ]);
    }

    // ─── Utilitaires ────────────────────────────────────────────────────────

    private function valider(Request $request, bool $partiel = false): array
    {
        $regle = fn (array $r) => $partiel ? array_merge(['sometimes'], $r) : $r;

        return $request->validate([
            // NOT NULL en base : les rendre facultatifs produisait une 500
            // au lieu d'un message de formulaire lisible.
            'company_name'   => $regle(['required', 'string', 'max:255']),
            'contact_name'   => $regle(['required', 'string', 'max:255']),
            'email'          => $regle(['required', 'email', 'max:255']),
            'phone'          => $regle(['nullable', 'string', 'max:40']),
            'country'        => $regle(['nullable', 'string', 'max:80']),
            'city'           => $regle(['nullable', 'string', 'max:120']),
            'sector'         => $regle(['nullable', 'string', 'max:120']),
            'employee_count' => $regle(['nullable', 'integer', 'min:0']),
            'annual_revenue' => $regle(['nullable', 'integer', 'min:0']),
            // Ces trois colonnes portent une contrainte CHECK en base : valider
            // en `string` laissait passer des valeurs que PostgreSQL rejetait
            // ensuite par une 500 illisible.
            'source'         => $regle(['nullable', 'in:' . implode(',', self::SOURCES)]),
            'status'         => $regle(['nullable', 'in:' . implode(',', self::STATUTS)]),
            'type'           => $regle(['nullable', 'in:' . implode(',', self::TYPES)]),
            'assigned_to'    => $regle(['nullable', 'integer', 'exists:users,id']),
            'notes'          => $regle(['nullable', 'string', 'max:5000']),
            'bant_score'     => $regle(['nullable', 'integer', 'min:0', 'max:100']),
            'tags'           => $regle(['nullable', 'array']),
        ]);
    }

    private function ligneContact(CrmContact $c): array
    {
        return [
            'id'             => $c->id,
            'type'           => $c->type,
            'company_name'   => $c->company_name,
            'contact_name'   => $c->contact_name,
            'email'          => $c->email,
            'phone'          => $c->phone,
            'country'        => $c->country,
            'city'           => $c->city,
            'sector'         => $c->sector,
            'employee_count' => $c->employee_count,
            'annual_revenue' => $c->annual_revenue,
            'source'         => $c->source,
            'status'         => $c->status,
            'bant_score'     => $c->bant_score,
            'tags'           => $c->tags ?? [],
            'assigned_to'    => $c->assigned_to,
            'assignee_name'  => $c->assignedUser->name ?? null,
            'deals_count'    => $c->deals_count ?? null,
            'last_contact_at'=> optional($c->last_contact_at)->format('d/m/Y'),
            'created_at'     => optional($c->created_at)->format('d/m/Y'),
        ];
    }

    private function ligneAffaire(CrmDeal $d): array
    {
        return [
            'id'          => $d->id,
            'title'       => $d->title,
            'value'       => (int) $d->value,
            'currency'    => $d->currency ?: 'XOF',
            'plan'        => $d->plan,
            'stage_id'    => $d->stage_id,
            'probability' => $d->probability,
            'close_date_expected' => optional($d->close_date_expected)->format('d/m/Y'),
            'assignee_name' => $d->assignedUser->name ?? null,
            'contact'     => $d->relationLoaded('contact') && $d->contact ? [
                'id'           => $d->contact->id,
                'company_name' => $d->contact->company_name,
                'contact_name' => $d->contact->contact_name,
                'email'        => $d->contact->email,
                'phone'        => $d->contact->phone,
            ] : null,
        ];
    }

    /** Les comptes IBIG susceptibles de porter un dossier commercial. */
    private function commerciaux(): array
    {
        return User::whereHas('roles', fn ($q) => $q->whereIn('name', ['super_admin', 'commercial', 'admin']))
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])
            ->all();
    }

    // =========================================================================
    // Modèles d'email & envois
    // =========================================================================

    /** Catégories admises par la contrainte CHECK de `crm_email_templates`. */
    private const CATEGORIES_EMAIL = ['outreach', 'follow_up', 'demo', 'proposal', 'onboarding', 'churn_prevention'];

    public function emailTemplates(Request $request): Response|JsonResponse
    {
        $modeles = CrmEmailTemplate::where('is_active', true)
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->input('category')))
            ->orderBy('name')
            ->get(['id', 'name', 'subject', 'body_html', 'body_text', 'category', 'variables']);

        if ($request->expectsJson()) {
            return response()->json(['data' => $modeles, 'categories' => self::CATEGORIES_EMAIL]);
        }

        return Inertia::render('SuperAdmin/Crm/EmailTemplates', [
            'templates'  => $modeles,
            'categories' => self::CATEGORIES_EMAIL,
        ]);
    }

    public function storeEmailTemplate(Request $request): JsonResponse
    {
        $valide = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'subject'   => ['required', 'string', 'max:255'],
            'body_html' => ['required', 'string'],
            'body_text' => ['nullable', 'string'],
            'category'  => ['required', 'in:' . implode(',', self::CATEGORIES_EMAIL)],
            'variables' => ['nullable', 'array'],
        ]);

        $modele = CrmEmailTemplate::create($valide + [
            'created_by' => auth()->id(),
            'is_active'  => true,
        ]);

        return response()->json(['success' => true, 'message' => 'Modèle enregistré.', 'data' => $modele], 201);
    }

    public function updateEmailTemplate(Request $request, int $id): JsonResponse
    {
        $valide = $request->validate([
            'name'      => ['sometimes', 'required', 'string', 'max:255'],
            'subject'   => ['sometimes', 'required', 'string', 'max:255'],
            'body_html' => ['sometimes', 'required', 'string'],
            'body_text' => ['nullable', 'string'],
            'category'  => ['sometimes', 'required', 'in:' . implode(',', self::CATEGORIES_EMAIL)],
            'variables' => ['nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $modele = CrmEmailTemplate::findOrFail($id);
        $modele->update($valide);

        return response()->json(['success' => true, 'message' => 'Modèle mis à jour.', 'data' => $modele->fresh()]);
    }

    /**
     * POST /superadmin/crm/emails/send — envoi d'un email à un contact.
     *
     * L'envoi est journalisé dans `crm_email_logs` AVANT d'être tenté : un
     * message parti sans trace vaut moins qu'une trace sans message, la
     * relance commerciale s'appuyant sur cet historique.
     */
    public function sendEmail(Request $request): JsonResponse
    {
        $valide = $request->validate([
            'contact_id'  => ['required', 'integer', 'exists:crm_contacts,id'],
            'template_id' => ['nullable', 'integer', 'exists:crm_email_templates,id'],
            'subject'     => ['required', 'string', 'max:255'],
            'body'        => ['required', 'string'],
        ]);

        $contact = CrmContact::findOrFail($valide['contact_id']);

        // Substitution des variables du modèle par les données du contact.
        $substitutions = [
            '{{company_name}}' => $contact->company_name ?: '',
            '{{contact_name}}' => $contact->contact_name ?: '',
            '{{city}}'         => $contact->city ?: '',
            '{{sector}}'       => $contact->sector ?: '',
        ];
        $objet = strtr($valide['subject'], $substitutions);
        $corps = strtr($valide['body'], $substitutions);

        $journal = CrmEmailLog::create([
            'contact_id'  => $contact->id,
            'template_id' => $valide['template_id'] ?? null,
            'subject'     => $objet,
            'to_email'    => $contact->email,
        ]);

        try {
            Mail::html($corps, function ($message) use ($contact, $objet) {
                $message->to($contact->email, $contact->contact_name)->subject($objet);
            });

            $journal->update(['sent_at' => now()]);
        } catch (\Throwable $e) {
            $journal->update(['bounced_at' => now(), 'bounce_reason' => substr($e->getMessage(), 0, 500)]);

            return response()->json([
                'message' => "L'envoi a échoué : " . $e->getMessage(),
            ], 502);
        }

        CrmActivity::create([
            'contact_id' => $contact->id,
            'type'       => 'email',
            'subject'    => $objet,
            'notes'      => 'Email envoyé à ' . $contact->email,
            'created_by' => auth()->id(),
        ]);

        $contact->update(['last_contact_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => "Email envoyé à {$contact->email}.",
            'data'    => ['id' => $journal->id, 'sent_at' => $journal->fresh()->sent_at],
        ], 201);
    }
}
