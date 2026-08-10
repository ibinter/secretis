<?php

namespace App\Services;

use App\Models\Organization;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Accès au référentiel social et fiscal, par pays et par date d'effet.
 *
 * Aucun taux ne vit dans cette classe : elle ne fait que lire
 * `payroll_contribution_rules` et `payroll_tax_brackets`. C'est la condition
 * pour que SECRETIS serve autre chose qu'un seul pays, et pour qu'un changement
 * de loi soit une mise à jour de données, pas un déploiement de code.
 */
class PayrollRuleService
{
    public const CACHE_TTL = 3600;

    /**
     * Levée quand aucun jeu de règles n'existe pour un pays : mieux vaut un
     * refus explicite qu'un calcul appuyé sur les taux d'un autre pays.
     */
    public function assertPaysCouvert(string $codePays, ?Carbon $date = null): void
    {
        $regles = $this->contributionRules($codePays, $date);
        $profil = $this->profil($codePays);
        $nom    = $profil->country_name ?? $codePays;
        $caisse = $profil->social_scheme_code ?? null;

        if ($regles->isEmpty()) {
            throw new \RuntimeException(
                "Aucune règle de cotisation sociale n'est paramétrée pour « {$nom} »"
                . ($caisse ? " ({$caisse})" : '') . '. '
                . "Renseignez les taux dans Paramètres → Paie → Référentiel pays avant "
                . "de produire une déclaration : un calcul appuyé sur les taux d'un autre "
                . "pays serait faux."
            );
        }

        // Des règles existent mais toutes à zéro : c'est un squelette non
        // renseigné. Produire « 0 F de cotisations » serait pire qu'un refus —
        // le chiffre passerait pour un résultat.
        $cumul = $regles->sum(fn ($r) => (float) $r->employer_rate + (float) $r->employee_rate);

        if ($cumul <= 0) {
            throw new \RuntimeException(
                "Les branches de cotisation de « {$nom} » sont déclarées mais leurs taux "
                . "sont à zéro : le référentiel n'a pas encore été renseigné. "
                . "Une déclaration à zéro serait prise pour un résultat."
            );
        }
    }

    /** Fiche pays : caisse, impôt, devise, état de paramétrage. */
    public function profil(string $codePays): ?object
    {
        return Cache::remember(
            'payroll_profile:' . strtoupper($codePays),
            self::CACHE_TTL,
            fn () => DB::table('payroll_country_profiles')
                ->where('country_code', strtoupper($codePays))
                ->first()
        );
    }

    /**
     * État de paramétrage de tous les pays du référentiel — le tableau de bord
     * du déploiement multi-pays.
     */
    public function etatParametrage(): Collection
    {
        $regles = collect(DB::table('payroll_contribution_rules')
            ->selectRaw('country_code, count(*) as branches, sum(employer_rate + employee_rate) as cumul, bool_and(is_verified) as toutes_verifiees')
            ->groupBy('country_code')
            ->get())->keyBy('country_code');

        $baremes = collect(DB::table('payroll_tax_brackets')
            ->selectRaw('country_code, count(*) as tranches')
            ->groupBy('country_code')
            ->get())->keyBy('country_code');

        return collect(DB::table('payroll_country_profiles')
            ->orderBy('economic_zone')
            ->orderBy('country_name')
            ->get())
            ->map(function ($p) use ($regles, $baremes) {
                $r = $regles->get($p->country_code);
                $b = $baremes->get($p->country_code);

                $etat = match (true) {
                    ! $r || (float) $r->cumul <= 0 => 'pending',
                    ! $r->toutes_verifiees        => 'draft',
                    default                        => 'verified',
                };

                return [
                    'country_code'   => $p->country_code,
                    'country_name'   => $p->country_name,
                    'currency'       => $p->currency,
                    'zone'           => $p->economic_zone,
                    'scheme_code'    => $p->social_scheme_code,
                    'scheme_name'    => $p->social_scheme_name,
                    'tax_code'       => $p->income_tax_code,
                    'tax_name'       => $p->income_tax_name,
                    'branches_saisies' => (int) ($r->branches ?? 0),
                    'branches_attendues' => count(json_decode($p->expected_branches ?? '[]', true) ?: []),
                    'tranches_impot' => (int) ($b->tranches ?? 0),
                    'status'         => $etat,
                ];
            });
    }

    /**
     * Cotisations sociales en vigueur dans un pays à une date donnée.
     *
     * @return Collection<int, object>
     */
    public function contributionRules(string $codePays, ?Carbon $date = null): Collection
    {
        $date = $date ?: now();
        $cle  = 'payroll_contrib:' . strtoupper($codePays) . ':' . $date->toDateString();

        return Cache::remember($cle, self::CACHE_TTL, function () use ($codePays, $date) {
            return collect(DB::table('payroll_contribution_rules')
                ->where('country_code', strtoupper($codePays))
                ->whereDate('effective_from', '<=', $date)
                ->where(function ($q) use ($date) {
                    $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $date);
                })
                ->orderBy('scheme_code')
                ->orderBy('branch_code')
                ->get());
        });
    }

    /**
     * Barème d'impôt sur les salaires, tranches ordonnées.
     *
     * @return Collection<int, object>
     */
    public function taxBrackets(string $codePays, ?string $codeImpot = null, ?Carbon $date = null): Collection
    {
        $date = $date ?: now();

        return collect(DB::table('payroll_tax_brackets')
            ->where('country_code', strtoupper($codePays))
            ->when($codeImpot, fn ($q) => $q->where('tax_code', $codeImpot))
            ->whereDate('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $date);
            })
            ->orderBy('lower_bound')
            ->get());
    }

    /**
     * Calcule les cotisations sociales dues sur une assiette, pour un pays.
     *
     * @param  float  $brut       Assiette brute (mensuelle).
     * @param  string $codePays   ISO 3166-1 alpha-2.
     * @return array{scheme:?string, employer:float, employee:float, total:float,
     *               branches:array, is_verified:bool, country:string}
     */
    public function calculerCotisations(
        float $brut,
        string $codePays,
        ?Carbon $date = null,
        ?int $organizationId = null,
    ): array {
        // Contrôle systématique : règles absentes OU squelette à zéro.
        $this->assertPaysCouvert($codePays, $date);

        $regles = $this->contributionRules($codePays, $date);

        $patronale = 0.0;
        $salariale = 0.0;
        $branches  = [];
        $verifie   = true;

        // Taux propres à l'employeur (accidents du travail) : ils priment sur
        // la valeur indicative du référentiel pays.
        $surcharges = $organizationId ? $this->surchargesEmployeur($organizationId, $date) : collect();

        foreach ($regles as $regle) {
            // Assiette par TRANCHE : certaines branches ne portent que sur la
            // part du salaire comprise entre un plancher et un plafond (IPRES
            // cadre au Sénégal : 432 000 → 1 296 000).
            $plancher = (float) ($regle->monthly_floor ?? 0);
            $plafond  = $regle->monthly_ceiling !== null ? (float) $regle->monthly_ceiling : null;

            $assiette = $plafond !== null ? min($brut, $plafond) : $brut;
            $assiette = max(0, $assiette - $plancher);

            // Un taux propre à l'employeur remplace celui du pays.
            $cle = $regle->scheme_code . '|' . $regle->branch_code;
            $tauxPatronal = (float) $regle->employer_rate;
            $tauxSalarial = (float) $regle->employee_rate;
            $surcharge = $surcharges->get($cle);

            if ($surcharge) {
                $tauxPatronal = $surcharge->employer_rate !== null ? (float) $surcharge->employer_rate : $tauxPatronal;
                $tauxSalarial = $surcharge->employee_rate !== null ? (float) $surcharge->employee_rate : $tauxSalarial;
            }

            $partPatronale = round($assiette * $tauxPatronal / 100, 2);
            $partSalariale = round($assiette * $tauxSalarial / 100, 2);

            $patronale += $partPatronale;
            $salariale += $partSalariale;
            $confirmee = (bool) $regle->is_verified
                && (! ($regle->employer_specific ?? false) || $surcharge !== null);
            $verifie = $verifie && $confirmee;

            $branches[] = [
                'scheme'      => $regle->scheme_code,
                'branch'      => $regle->branch_label,
                // Le code court sert d'identifiant technique sur la ligne de
                // bulletin ; le libellé, lui, est fait pour être lu.
                'branch_code' => $regle->branch_code,
                'basis'     => $assiette,
                'floor'     => $plancher ?: null,
                'ceiling'   => $plafond,
                'employer_rate' => $tauxPatronal,
                'employee_rate' => $tauxSalarial,
                // Un taux propre à l'employeur non surchargé reste indicatif :
                // il ne peut pas être tenu pour confirmé.
                'employer_specific' => (bool) ($regle->employer_specific ?? false),
                'overridden'        => $surcharge !== null,
                'employer'  => $partPatronale,
                'employee'  => $partSalariale,
                'verified'  => $confirmee,
                'source'    => $regle->source,
            ];
        }

        return [
            'country'     => strtoupper($codePays),
            'scheme'      => $regles->pluck('scheme_code')->unique()->implode(' + '),
            'employer'    => round($patronale, 2),
            'employee'    => round($salariale, 2),
            'total'       => round($patronale + $salariale, 2),
            'branches'    => $branches,
            // Faux dès qu'UNE branche n'est pas confirmée sur texte officiel.
            'is_verified' => $verifie,
        ];
    }

    /**
     * Impôt sur les salaires par tranches progressives.
     *
     * @return array{tax:float, code:?string, brackets:array, is_verified:bool}
     */
    public function calculerImpot(float $imposable, string $codePays, ?string $codeImpot = null, ?Carbon $date = null): array
    {
        $tranches = $this->taxBrackets($codePays, $codeImpot, $date);

        if ($tranches->isEmpty()) {
            throw new \RuntimeException(
                "Aucun barème d'impôt sur les salaires n'est paramétré pour « {$codePays} »."
            );
        }

        $impot   = 0.0;
        $detail  = [];
        $verifie = true;

        foreach ($tranches as $t) {
            $bas  = (float) $t->lower_bound;
            $haut = $t->upper_bound !== null ? (float) $t->upper_bound : null;

            if ($imposable <= $bas) {
                continue;
            }

            $assiette = ($haut !== null ? min($imposable, $haut) : $imposable) - $bas;
            $part = round($assiette * (float) $t->rate / 100, 2) - (float) $t->fixed_deduction;
            $part = max(0, $part);

            $impot += $part;
            $verifie = $verifie && (bool) $t->is_verified;

            $detail[] = [
                'from'   => $bas,
                'to'     => $haut,
                'rate'   => (float) $t->rate,
                'base'   => $assiette,
                'amount' => $part,
            ];
        }

        return [
            'code'        => $tranches->first()->tax_code ?? $codeImpot,
            'tax'         => round($impot, 2),
            'brackets'    => $detail,
            'is_verified' => $verifie,
        ];
    }

    /**
     * Pays d'une organisation, avec un message clair quand il manque : sans
     * pays, aucune règle sociale ne peut être choisie.
     */
    public function paysDe(Organization $org): string
    {
        $pays = strtoupper(trim((string) $org->country));

        if ($pays === '') {
            throw new \RuntimeException(
                "L'organisation « {$org->name} » n'a pas de pays renseigné : "
                . "les cotisations sociales et l'impôt sur les salaires en dépendent."
            );
        }

        return $pays;
    }

    /**
     * Taux propres à un employeur, indexés « CAISSE|branche ».
     * Concerne surtout les accidents du travail, notifiés entreprise par
     * entreprise selon le risque de l'activité.
     */
    public function surchargesEmployeur(int $organizationId, ?Carbon $date = null): Collection
    {
        $date = $date ?: now();

        return collect(DB::table('payroll_employer_rates')
            ->where('organization_id', $organizationId)
            ->whereDate('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $date);
            })
            ->get())
            ->keyBy(fn ($r) => $r->scheme_code . '|' . $r->branch_code);
    }

    /** Pays effectivement couverts par le référentiel. */
    public function paysCouverts(): array
    {
        return DB::table('payroll_contribution_rules')
            ->select('country_code')
            ->distinct()
            ->orderBy('country_code')
            ->pluck('country_code')
            ->all();
    }
}
