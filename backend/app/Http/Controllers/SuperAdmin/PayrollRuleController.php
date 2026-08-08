<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\PayrollRuleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Référentiel social et fiscal par pays — écran de paramétrage.
 *
 * Les taux de cotisation et les barèmes d'impôt sur les salaires sont de la
 * matière légale : ils changent chaque année et diffèrent à chaque frontière.
 * Ils n'ont donc rien à faire dans le code. Cet écran est le seul endroit où on
 * les saisit, avec leur date d'effet et la référence du texte officiel.
 *
 * `is_verified` n'est pas décoratif : tant qu'une branche n'est pas confirmée
 * sur texte, toute déclaration qui s'y appuie porte un avertissement visible.
 */
class PayrollRuleController extends Controller
{
    public function __construct(private PayrollRuleService $referentiel) {}

    public function index(Request $request): Response|JsonResponse
    {
        $etat = $this->referentiel->etatParametrage();
        $pays = strtoupper((string) $request->query('pays', ''));

        $detail = null;

        if ($pays !== '') {
            $profil = $this->referentiel->profil($pays);

            $detail = [
                'profil'   => $profil,
                'branches' => json_decode($profil->expected_branches ?? '[]', true) ?: [],
                'rules'    => DB::table('payroll_contribution_rules')
                    ->where('country_code', $pays)
                    ->orderBy('scheme_code')->orderBy('branch_code')->orderByDesc('effective_from')
                    ->get(),
                'brackets' => DB::table('payroll_tax_brackets')
                    ->where('country_code', $pays)
                    ->orderBy('tax_code')->orderBy('lower_bound')
                    ->get(),
            ];
        }

        $donnees = [
            'countries' => $etat->values(),
            'detail'    => $detail,
            'resume'    => [
                'total'    => $etat->count(),
                'pending'  => $etat->where('status', 'pending')->count(),
                'draft'    => $etat->where('status', 'draft')->count(),
                'verified' => $etat->where('status', 'verified')->count(),
            ],
        ];

        if ($request->expectsJson()) {
            return response()->json($donnees);
        }

        return Inertia::render('SuperAdmin/Payroll/CountryRules', $donnees);
    }

    // ─── Cotisations ────────────────────────────────────────────────────────

    public function storeRule(Request $request): JsonResponse
    {
        $valide = $this->validerRegle($request);

        $id = DB::table('payroll_contribution_rules')->insertGetId(
            $valide + ['created_at' => now(), 'updated_at' => now()]
        );

        $this->oublierCache($valide['country_code']);

        return response()->json([
            'success' => true,
            'message' => 'Branche de cotisation enregistrée.',
            'id'      => $id,
        ], 201);
    }

    public function updateRule(Request $request, int $id): JsonResponse
    {
        $regle = DB::table('payroll_contribution_rules')->find($id);

        if (! $regle) {
            return response()->json(['message' => 'Règle introuvable.'], 404);
        }

        $valide = $this->validerRegle($request, partiel: true);

        DB::table('payroll_contribution_rules')
            ->where('id', $id)
            ->update($valide + ['updated_at' => now()]);

        $this->oublierCache($regle->country_code);

        return response()->json(['success' => true, 'message' => 'Branche mise à jour.']);
    }

    public function destroyRule(int $id): JsonResponse
    {
        $regle = DB::table('payroll_contribution_rules')->find($id);

        if (! $regle) {
            return response()->json(['message' => 'Règle introuvable.'], 404);
        }

        DB::table('payroll_contribution_rules')->where('id', $id)->delete();
        $this->oublierCache($regle->country_code);

        return response()->json(['success' => true, 'message' => 'Branche supprimée.']);
    }

    /**
     * Confirme une branche sur texte officiel. La référence du texte est
     * obligatoire : une validation sans source ne vaut rien.
     */
    public function verifyRule(Request $request, int $id): JsonResponse
    {
        $valide = $request->validate([
            'source' => ['required', 'string', 'min:10', 'max:255'],
        ]);

        $regle = DB::table('payroll_contribution_rules')->find($id);

        if (! $regle) {
            return response()->json(['message' => 'Règle introuvable.'], 404);
        }

        DB::table('payroll_contribution_rules')->where('id', $id)->update([
            'is_verified' => true,
            'source'      => $valide['source'],
            'updated_at'  => now(),
        ]);

        $this->oublierCache($regle->country_code);

        return response()->json(['success' => true, 'message' => 'Branche confirmée sur texte officiel.']);
    }

    // ─── Barèmes d'impôt ────────────────────────────────────────────────────

    public function storeBracket(Request $request): JsonResponse
    {
        $valide = $request->validate([
            'country_code'    => ['required', 'string', 'size:2'],
            'tax_code'        => ['required', 'string', 'max:20'],
            'tax_name'        => ['required', 'string', 'max:255'],
            'lower_bound'     => ['required', 'numeric', 'min:0'],
            'upper_bound'     => ['nullable', 'numeric', 'gt:lower_bound'],
            'rate'            => ['required', 'numeric', 'min:0', 'max:100'],
            'fixed_deduction' => ['nullable', 'numeric', 'min:0'],
            'currency'        => ['nullable', 'string', 'size:3'],
            'period'          => ['required', 'in:monthly,yearly'],
            'effective_from'  => ['required', 'date'],
            'effective_to'    => ['nullable', 'date', 'after:effective_from'],
            'source'          => ['nullable', 'string', 'max:255'],
            'notes'           => ['nullable', 'string', 'max:2000'],
        ]);

        $valide['country_code']    = strtoupper($valide['country_code']);
        $valide['fixed_deduction'] = $valide['fixed_deduction'] ?? 0;
        $valide['is_verified']     = false;

        $id = DB::table('payroll_tax_brackets')->insertGetId(
            $valide + ['created_at' => now(), 'updated_at' => now()]
        );

        return response()->json(['success' => true, 'message' => 'Tranche enregistrée.', 'id' => $id], 201);
    }

    public function destroyBracket(int $id): JsonResponse
    {
        DB::table('payroll_tax_brackets')->where('id', $id)->delete();

        return response()->json(['success' => true, 'message' => 'Tranche supprimée.']);
    }

    /**
     * Simulation : vérifier un paramétrage sur un salaire d'essai AVANT de
     * l'utiliser en production. C'est le seul moyen de repérer une virgule mal
     * placée sans attendre un bulletin faux.
     */
    public function simulate(Request $request): JsonResponse
    {
        $valide = $request->validate([
            'country_code' => ['required', 'string', 'size:2'],
            'gross'        => ['required', 'numeric', 'min:0'],
        ]);

        try {
            $cotisations = $this->referentiel->calculerCotisations(
                (float) $valide['gross'],
                $valide['country_code']
            );
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $impot = null;

        try {
            // L'assiette imposable retire la part salariale : convention la plus
            // répandue en zone franc, à confirmer pays par pays.
            $impot = $this->referentiel->calculerImpot(
                (float) $valide['gross'] - $cotisations['employee'],
                $valide['country_code']
            );
        } catch (\Throwable) {
            // Barème non renseigné : la simulation des cotisations reste utile.
        }

        return response()->json([
            'contributions' => $cotisations,
            'tax'           => $impot,
            'net_estimate'  => $impot
                ? round((float) $valide['gross'] - $cotisations['employee'] - $impot['tax'], 2)
                : null,
        ]);
    }

    // ─── Utilitaires ────────────────────────────────────────────────────────

    private function validerRegle(Request $request, bool $partiel = false): array
    {
        $r = fn (array $regles) => $partiel ? array_merge(['sometimes'], $regles) : $regles;

        $valide = $request->validate([
            'country_code'    => $r(['required', 'string', 'size:2']),
            'scheme_code'     => $r(['required', 'string', 'max:20']),
            'scheme_name'     => $r(['required', 'string', 'max:255']),
            'branch_code'     => $r(['required', 'string', 'max:40']),
            'branch_label'    => $r(['required', 'string', 'max:255']),
            'employer_rate'   => $r(['required', 'numeric', 'min:0', 'max:100']),
            'employee_rate'   => $r(['required', 'numeric', 'min:0', 'max:100']),
            'basis'           => $r(['required', 'in:gross_salary,capped_salary']),
            'monthly_ceiling' => ['nullable', 'numeric', 'min:0'],
            'currency'        => ['nullable', 'string', 'size:3'],
            'effective_from'  => $r(['required', 'date']),
            'effective_to'    => ['nullable', 'date', 'after:effective_from'],
            'source'          => ['nullable', 'string', 'max:255'],
            'notes'           => ['nullable', 'string', 'max:2000'],
        ]);

        if (isset($valide['country_code'])) {
            $valide['country_code'] = strtoupper($valide['country_code']);
        }

        // Toute saisie ou modification repasse en « non confirmé » : un taux
        // modifié après validation n'est plus le taux qui avait été validé.
        $valide['is_verified'] = false;

        return $valide;
    }

    private function oublierCache(string $pays): void
    {
        Cache::forget('payroll_profile:' . strtoupper($pays));
        // Les règles sont mises en cache par date : on purge largement plutôt
        // que de laisser un taux périmé servir une déclaration.
        Cache::flush();
    }
}
