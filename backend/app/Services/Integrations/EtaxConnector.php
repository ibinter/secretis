<?php

namespace App\Services\Integrations;

use App\Models\Organization;
use App\Models\TaxDeclaration;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * EtaxConnector — Génération des déclarations fiscales OHADA.
 *
 * Portails supportés :
 *  - Côte d'Ivoire  : DGI e-Impôts    (format XML DGICI)
 *  - Sénégal        : DGID Télétaxe   (format E-Déclaration CSV/XML)
 *  - Cameroun       : DGT DGI Cam     (format XML + PDF)
 *  - Burkina Faso   : DGI-BF          (format CSV)
 *  - Mali           : DGI Mali        (format XML)
 *  - Bénin          : DGE Bénin       (format CSV)
 *
 * Types de déclarations :
 *  - TVA (mensuelle)
 *  - IS  (Impôt sur les Sociétés — annuel)
 *  - IUTS/IRD (Impôt Unique sur les Traitements et Salaires)
 *  - Acomptes IS (trimestriel)
 *  - Droits d'enregistrement
 */
class EtaxConnector
{
    private array $config = [];

    // Taux TVA par pays
    private const TVA_RATES = [
        'CI' => 18.0,  // Côte d'Ivoire
        'SN' => 18.0,  // Sénégal
        'CM' => 19.25, // Cameroun
        'BF' => 18.0,  // Burkina Faso
        'ML' => 18.0,  // Mali
        'BJ' => 18.0,  // Bénin
        'TG' => 18.0,  // Togo
        'NE' => 19.0,  // Niger
    ];

    public function withConfig(array $config): static
    {
        $this->config = $config;
        return $this;
    }

    // ─── Point d'entrée principal ─────────────────────────────────────────────

    /**
     * Génère le fichier de déclaration fiscale au format du pays.
     *
     * @param  Organization $org              Organisation
     * @param  string       $declarationType  tva | is | iuts | acompte_is
     * @param  string       $country          CI | SN | CM | BF | ML | BJ
     * @param  Carbon       $period           Mois/année de la déclaration
     * @return string                         Chemin du fichier généré
     */
    public function generateTaxFile(
        Organization $org,
        string $declarationType,
        string $country,
        Carbon $period
    ): string {
        $country = strtoupper($country);

        $data = $this->collectTaxData($org, $declarationType, $period);

        $content = match ("{$country}_{$declarationType}") {
            'CI_tva'        => $this->generateCITva($org, $data, $period),
            'CI_is'         => $this->generateCIIS($org, $data, $period),
            'CI_iuts'       => $this->generateCIIUTS($org, $data, $period),
            'SN_tva'        => $this->generateSNTva($org, $data, $period),
            'SN_is'         => $this->generateSNIS($org, $data, $period),
            'CM_tva'        => $this->generateCMTva($org, $data, $period),
            'CM_is'         => $this->generateCMIS($org, $data, $period),
            'BF_tva'        => $this->generateBFTva($org, $data, $period),
            default         => $this->generateGenericTax($org, $data, $period, $country, $declarationType),
        };

        $extension = $this->getFileExtension($country, $declarationType);
        $filename  = sprintf(
            '%s_%s_%s_%s.%s',
            $country,
            $declarationType,
            $period->format('Y_m'),
            $org->id,
            $extension
        );

        $path = "etax/{$org->id}/{$filename}";
        Storage::disk('local')->put($path, $content);

        // Enregistrement de la déclaration
        TaxDeclaration::create([
            'organization_id'  => $org->id,
            'country'          => $country,
            'declaration_type' => $declarationType,
            'period'           => $period->format('Y-m'),
            'file_path'        => $path,
            'status'           => 'generated',
            'generated_by'     => auth()->id(),
        ]);

        Log::info("Déclaration fiscale générée", [
            'org'    => $org->id,
            'type'   => $declarationType,
            'pays'   => $country,
            'period' => $period->format('Y-m'),
            'file'   => $path,
        ]);

        return $path;
    }

    // ─── Côte d'Ivoire ────────────────────────────────────────────────────────

    private function generateCITva(Organization $org, array $data, Carbon $period): string
    {
        // Format XML DGI Côte d'Ivoire (e-Impôts DGICI)
        $nif      = $org->tax_id ?? '';
        $rccm      = $org->rccm  ?? '';
        $tvaRate  = self::TVA_RATES['CI'];
        $tvaCollected = $data['tva_collected'] ?? 0;
        $tvaDeductible = $data['tva_deductible'] ?? 0;
        $tvaDue = max(0, $tvaCollected - $tvaDeductible);

        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<DeclarationTVA xmlns="http://www.dgi.gouv.ci/etax/schema/v1.2"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="http://www.dgi.gouv.ci/etax/schema/v1.2 tva_mensuelle.xsd">
  <Entete>
    <TypeDeclaration>TVA_MENSUELLE</TypeDeclaration>
    <Annee>{$period->year}</Annee>
    <Mois>{$period->format('m')}</Mois>
    <DateGeneration>{$this->today()}</DateGeneration>
    <VersionSchema>1.2</VersionSchema>
  </Entete>
  <Contribuable>
    <NIF>{$nif}</NIF>
    <RCCM>{$rccm}</RCCM>
    <RaisonSociale>{$this->xmlEscape($org->name)}</RaisonSociale>
    <Adresse>{$this->xmlEscape($org->address ?? '')}</Adresse>
    <Ville>{$this->xmlEscape($org->city ?? 'Abidjan')}</Ville>
    <Telephone>{$this->xmlEscape($org->phone ?? '')}</Telephone>
    <Email>{$this->xmlEscape($org->email ?? '')}</Email>
  </Contribuable>
  <DeclarationTVADetail>
    <TauxTVA>{$tvaRate}</TauxTVA>
    <!-- A — VENTES ET RECETTES IMPOSABLES -->
    <VentesImposables>
      <VentesExportation>{$this->fmt($data['ventes_export'] ?? 0)}</VentesExportation>
      <VentesLocalesHT>{$this->fmt($data['ca_ht'] ?? 0)}</VentesLocalesHT>
      <VentesLocalesTVA>{$this->fmt($tvaCollected)}</VentesLocalesTVA>
    </VentesImposables>
    <!-- B — ACHATS ET CHARGES DEDUCTIBLES -->
    <AchatsDeductibles>
      <AchatsLocalHT>{$this->fmt($data['achats_ht'] ?? 0)}</AchatsLocalHT>
      <TVADeductibleAchats>{$this->fmt($tvaDeductible)}</TVADeductibleAchats>
    </AchatsDeductibles>
    <!-- C — LIQUIDATION -->
    <Liquidation>
      <TVACollectee>{$this->fmt($tvaCollected)}</TVACollectee>
      <TVADeductible>{$this->fmt($tvaDeductible)}</TVADeductible>
      <TVADue>{$this->fmt($tvaDue)}</TVADue>
      <CreditTVA>{$this->fmt(max(0, $tvaDeductible - $tvaCollected))}</CreditTVA>
    </Liquidation>
  </DeclarationTVADetail>
  <Signature>
    <NomSignataire>{$this->xmlEscape($org->legal_representative ?? '')}</NomSignataire>
    <FonctionSignataire>Directeur Général</FonctionSignataire>
    <DateSignature>{$this->today()}</DateSignature>
  </Signature>
</DeclarationTVA>
XML;
    }

    private function generateCIIS(Organization $org, array $data, Carbon $period): string
    {
        $nif    = $org->tax_id ?? '';
        $result = $data['resultat_fiscal'] ?? 0;
        $isBase = max(0, $result);
        $isRate = 25.0; // Taux IS Côte d'Ivoire
        $isDue  = $isBase * ($isRate / 100);

        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<DeclarationIS xmlns="http://www.dgi.gouv.ci/etax/schema/v1.2">
  <Entete>
    <TypeDeclaration>IMPOT_SOCIETES</TypeDeclaration>
    <Annee>{$period->year}</Annee>
    <DateGeneration>{$this->today()}</DateGeneration>
  </Entete>
  <Contribuable>
    <NIF>{$nif}</NIF>
    <RaisonSociale>{$this->xmlEscape($org->name)}</RaisonSociale>
  </Contribuable>
  <CalculIS>
    <ResultatComptable>{$this->fmt($data['resultat_comptable'] ?? 0)}</ResultatComptable>
    <ReintegrationsExtraCom>{$this->fmt($data['reintegrations'] ?? 0)}</ReintegrationsExtraCom>
    <DeductionsExtraCom>{$this->fmt($data['deductions'] ?? 0)}</DeductionsExtraCom>
    <ResultatFiscal>{$this->fmt($result)}</ResultatFiscal>
    <BaseImposable>{$this->fmt($isBase)}</BaseImposable>
    <TauxIS>{$isRate}</TauxIS>
    <IS_Brut>{$this->fmt($isDue)}</IS_Brut>
    <AcomptesDejaVerses>{$this->fmt($data['acomptes_verses'] ?? 0)}</AcomptesDejaVerses>
    <IS_Net_Du>{$this->fmt(max(0, $isDue - ($data['acomptes_verses'] ?? 0)))}</IS_Net_Du>
  </CalculIS>
</DeclarationIS>
XML;
    }

    private function generateCIIUTS(Organization $org, array $data, Carbon $period): string
    {
        return $this->generateGenericTax($org, $data, $period, 'CI', 'iuts');
    }

    // ─── Sénégal ──────────────────────────────────────────────────────────────

    private function generateSNTva(Organization $org, array $data, Carbon $period): string
    {
        // Format E-Déclaration DGID Sénégal (CSV pipe-separated)
        $lines = [];
        $lines[] = 'DGID;SENEGAL;EDECLARATION;TVA;v2.0';
        $lines[] = implode(';', [
            'NIF'     => $org->tax_id ?? '',
            'NINEA'   => $org->ninea  ?? '',
            'RS'      => $org->name,
            'PERIODE' => $period->format('m/Y'),
            'CA_HT'   => $this->fmt($data['ca_ht'] ?? 0),
            'TVA_COLL' => $this->fmt($data['tva_collected'] ?? 0),
            'TVA_DED'  => $this->fmt($data['tva_deductible'] ?? 0),
            'TVA_DUE'  => $this->fmt(max(0, ($data['tva_collected'] ?? 0) - ($data['tva_deductible'] ?? 0))),
            'DATE_GEN' => $this->today(),
        ]);

        return implode("\n", $lines);
    }

    private function generateSNIS(Organization $org, array $data, Carbon $period): string
    {
        return $this->generateGenericTax($org, $data, $period, 'SN', 'is');
    }

    // ─── Cameroun ─────────────────────────────────────────────────────────────

    private function generateCMTva(Organization $org, array $data, Carbon $period): string
    {
        $tvaRate = self::TVA_RATES['CM'];
        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<DeclarationTVA_CM xmlns="http://www.impots.cm/schema/v1.0">
  <Entete>
    <TypeDeclaration>TVA_MENSUELLE</TypeDeclaration>
    <Periode>{$period->format('m/Y')}</Periode>
    <DateDepot>{$this->today()}</DateDepot>
  </Entete>
  <Contribuable>
    <NIU>{$this->xmlEscape($org->tax_id ?? '')}</NIU>
    <RaisonSociale>{$this->xmlEscape($org->name)}</RaisonSociale>
    <Regime>RSI</Regime>
  </Contribuable>
  <Calcul>
    <TauxTVA>{$tvaRate}</TauxTVA>
    <CA_HT>{$this->fmt($data['ca_ht'] ?? 0)}</CA_HT>
    <TVA_Facturee>{$this->fmt($data['tva_collected'] ?? 0)}</TVA_Facturee>
    <TVA_Deductible>{$this->fmt($data['tva_deductible'] ?? 0)}</TVA_Deductible>
    <TVA_Due>{$this->fmt(max(0, ($data['tva_collected'] ?? 0) - ($data['tva_deductible'] ?? 0)))}</TVA_Due>
  </Calcul>
</DeclarationTVA_CM>
XML;
    }

    private function generateCMIS(Organization $org, array $data, Carbon $period): string
    {
        return $this->generateGenericTax($org, $data, $period, 'CM', 'is');
    }

    // ─── Burkina Faso ─────────────────────────────────────────────────────────

    private function generateBFTva(Organization $org, array $data, Carbon $period): string
    {
        $headers = ['IFU', 'RS', 'MOIS', 'ANNEE', 'CA_HT', 'TVA_COLL', 'TVA_DED', 'TVA_DUE'];
        $row = [
            $org->tax_id ?? '',
            $org->name,
            $period->format('m'),
            $period->year,
            $this->fmt($data['ca_ht'] ?? 0),
            $this->fmt($data['tva_collected'] ?? 0),
            $this->fmt($data['tva_deductible'] ?? 0),
            $this->fmt(max(0, ($data['tva_collected'] ?? 0) - ($data['tva_deductible'] ?? 0))),
        ];

        return implode(';', $headers) . "\n" . implode(';', $row);
    }

    // ─── Format générique ────────────────────────────────────────────────────

    private function generateGenericTax(Organization $org, array $data, Carbon $period, string $country, string $type): string
    {
        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<Declaration>
  <Pays>{$country}</Pays>
  <Type>{$type}</Type>
  <Periode>{$period->format('Y-m')}</Periode>
  <NIF>{$this->xmlEscape($org->tax_id ?? '')}</NIF>
  <RaisonSociale>{$this->xmlEscape($org->name)}</RaisonSociale>
  <CA_HT>{$this->fmt($data['ca_ht'] ?? 0)}</CA_HT>
  <TVA_Collectee>{$this->fmt($data['tva_collected'] ?? 0)}</TVA_Collectee>
  <TVA_Deductible>{$this->fmt($data['tva_deductible'] ?? 0)}</TVA_Deductible>
  <TVA_Due>{$this->fmt(max(0, ($data['tva_collected'] ?? 0) - ($data['tva_deductible'] ?? 0)))}</TVA_Due>
  <DateGeneration>{$this->today()}</DateGeneration>
</Declaration>
XML;
    }

    // ─── Collecte des données comptables ──────────────────────────────────────

    private function collectTaxData(Organization $org, string $type, Carbon $period): array
    {
        $start = $period->copy()->startOfMonth();
        $end   = $period->copy()->endOfMonth();

        $data = [];

        // Chiffre d'affaires HT
        $data['ca_ht'] = \App\Models\Invoice::where('organization_id', $org->id)
            ->where('type', 'vente')
            ->whereBetween('date', [$start, $end])
            ->where('status', 'paid')
            ->sum('amount_ht');

        // TVA collectée
        $data['tva_collected'] = \App\Models\Invoice::where('organization_id', $org->id)
            ->where('type', 'vente')
            ->whereBetween('date', [$start, $end])
            ->sum('tax_amount');

        // TVA déductible (sur achats)
        $data['tva_deductible'] = \App\Models\Invoice::where('organization_id', $org->id)
            ->where('type', 'achat')
            ->whereBetween('date', [$start, $end])
            ->sum('tax_amount');

        // Achats HT
        $data['achats_ht'] = \App\Models\Invoice::where('organization_id', $org->id)
            ->where('type', 'achat')
            ->whereBetween('date', [$start, $end])
            ->sum('amount_ht');

        // Ventes export
        $data['ventes_export'] = \App\Models\Invoice::where('organization_id', $org->id)
            ->where('type', 'vente')
            ->where('is_export', true)
            ->whereBetween('date', [$start, $end])
            ->sum('amount_ht');

        // Résultat comptable (IS)
        if ($type === 'is') {
            $produits = \App\Models\AccountingEntry::where('organization_id', $org->id)
                ->whereBetween('date', [$start->copy()->startOfYear(), $end->copy()->endOfYear()])
                ->where('account_number', 'like', '7%')
                ->sum('credit');

            $charges = \App\Models\AccountingEntry::where('organization_id', $org->id)
                ->whereBetween('date', [$start->copy()->startOfYear(), $end->copy()->endOfYear()])
                ->where('account_number', 'like', '6%')
                ->sum('debit');

            $data['resultat_comptable'] = $produits - $charges;
            $data['reintegrations']     = 0; // À affiner selon règles fiscales locales
            $data['deductions']         = 0;
            $data['resultat_fiscal']    = $data['resultat_comptable'];
            $data['acomptes_verses']    = \App\Models\TaxPayment::where('organization_id', $org->id)
                ->where('type', 'acompte_is')
                ->whereYear('date', $period->year)
                ->sum('amount');
        }

        return $data;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function fmt(float $amount): string
    {
        return number_format($amount, 2, '.', '');
    }

    private function xmlEscape(string $text): string
    {
        return htmlspecialchars($text, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    private function today(): string
    {
        return now()->format('Y-m-d');
    }

    private function getFileExtension(string $country, string $type): string
    {
        return match ("{$country}_{$type}") {
            'SN_tva' => 'csv',
            'BF_tva' => 'csv',
            default  => 'xml',
        };
    }
}
