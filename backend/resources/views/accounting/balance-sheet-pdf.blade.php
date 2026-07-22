<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Bilan SYSCOHADA — {{ $fy->name }}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'DejaVu Sans', Arial, sans-serif;
    font-size: 9pt;
    color: #1a1a1a;
    background: #fff;
  }

  /* En-tête */
  .header {
    border-bottom: 3px solid #1A3A5C;
    padding-bottom: 10px;
    margin-bottom: 15px;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .org-name {
    font-size: 13pt;
    font-weight: bold;
    color: #1A3A5C;
  }
  .org-info {
    font-size: 8pt;
    color: #555;
    margin-top: 2px;
  }
  .doc-title {
    text-align: right;
  }
  .doc-title h1 {
    font-size: 14pt;
    font-weight: bold;
    color: #1A3A5C;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .doc-title .subtitle {
    font-size: 8pt;
    color: #777;
    margin-top: 2px;
  }

  /* Métadonnées */
  .meta-bar {
    background: #f5f7fa;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 8px 12px;
    margin-bottom: 12px;
    font-size: 8.5pt;
    display: flex;
    gap: 30px;
  }
  .meta-bar span { color: #555; }
  .meta-bar strong { color: #1A3A5C; }

  /* Layout bilan 2 colonnes */
  .bilan-wrapper {
    display: flex;
    gap: 10px;
    width: 100%;
  }
  .bilan-col {
    flex: 1;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    overflow: hidden;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
  }
  .section-header {
    background: #1A3A5C;
    color: #fff;
    font-size: 8.5pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 6px 8px;
  }
  .col-header {
    background: #e8ecf0;
    font-size: 7.5pt;
    font-weight: bold;
    text-transform: uppercase;
    color: #555;
    padding: 4px 6px;
    border-bottom: 1px solid #d1d5db;
  }
  td {
    padding: 3px 6px;
    vertical-align: top;
    border-bottom: 1px solid #f0f0f0;
  }
  .lbl { font-size: 8.5pt; color: #2d3748; }
  .lbl-indent { padding-left: 16px !important; }
  .lbl-indent2 { padding-left: 28px !important; }
  .num { font-family: 'Courier New', monospace; font-size: 8pt; text-align: right; }
  .num-bold { font-family: 'Courier New', monospace; font-size: 8pt; text-align: right; font-weight: bold; color: #1A3A5C; }
  .row-total {
    background: #f0f4f8;
    border-top: 1px solid #c8d0da;
  }
  .row-total td { font-weight: bold; }
  .row-grand-total {
    background: #1A3A5C;
  }
  .row-grand-total td {
    color: #fff !important;
    font-weight: bold;
    font-size: 9pt;
    padding: 6px 8px;
    border: none;
  }
  .subsection {
    background: #2E86C1;
    color: #fff;
    font-size: 7.5pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .subsection td { color: #fff; padding: 3px 8px; border: none; }

  /* Équilibre */
  .balance-check {
    text-align: center;
    padding: 8px;
    margin-bottom: 12px;
    border-radius: 4px;
    font-size: 9pt;
    font-weight: bold;
  }
  .balanced { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
  .unbalanced { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

  /* Signatures */
  .signatures {
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
  }
  .sig-box {
    flex: 1;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 10px;
    min-height: 70px;
  }
  .sig-title {
    font-size: 8pt;
    font-weight: bold;
    color: #555;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 4px;
    margin-bottom: 4px;
  }

  /* Footer */
  .footer {
    margin-top: 15px;
    border-top: 1px solid #d1d5db;
    padding-top: 6px;
    font-size: 7pt;
    color: #999;
    text-align: center;
  }

  @page { size: A4 landscape; margin: 1cm 1.2cm; }
</style>
</head>
<body>

{{-- En-tête --}}
<div class="header">
  <div class="header-top">
    <div>
      <div class="org-name">{{ $org->name ?? 'Organisation' }}</div>
      <div class="org-info">
        RCCM : {{ $org->rccm ?? '—' }} &nbsp;|&nbsp;
        NIF : {{ $org->nif ?? '—' }} &nbsp;|&nbsp;
        {{ $org->address ?? '' }}
      </div>
    </div>
    <div class="doc-title">
      <h1>Bilan</h1>
      <div class="subtitle">SYSCOHADA Révisé 2017 — Norme OHADA</div>
      <div class="subtitle">Exercice : {{ $fy->name }}</div>
      <div class="subtitle">Arrêté au {{ \Carbon\Carbon::parse($data['period']['end'])->format('d/m/Y') }}</div>
    </div>
  </div>
</div>

{{-- Vérification équilibre --}}
@if($data['is_balanced'])
<div class="balance-check balanced">
  ✓ Bilan équilibré — Total Actif = Total Passif =
  {{ number_format($data['total_actif'], 0, ',', ' ') }} FCFA
</div>
@else
<div class="balance-check unbalanced">
  ⚠ Bilan déséquilibré — Écart : {{ number_format($data['ecart'], 0, ',', ' ') }} FCFA
</div>
@endif

{{-- Corps du bilan : 2 colonnes --}}
<div class="bilan-wrapper">

  {{-- === ACTIF === --}}
  <div class="bilan-col">
    <div class="section-header">ACTIF</div>
    <table>
      <tr>
        <td class="col-header" style="width:45%">Désignation</td>
        <td class="col-header num" style="width:18%">Brut</td>
        <td class="col-header num" style="width:18%">Amort/Prov</td>
        <td class="col-header num" style="width:19%">Net</td>
      </tr>

      @php
        $actif = $data['actif'];
        $fmt = fn($v) => $v > 0 ? number_format($v, 0, ',', ' ') : '—';
      @endphp

      {{-- Actif immobilisé --}}
      <tr class="subsection"><td colspan="4">Actif immobilisé</td></tr>

      <tr>
        <td class="lbl lbl-indent">Immobilisations incorporelles</td>
        <td class="num">{{ $fmt($actif['immobilisations']['incorporelles']['brut']) }}</td>
        <td class="num">{{ $fmt($actif['immobilisations']['incorporelles']['amort']) }}</td>
        <td class="num-bold">{{ $fmt($actif['immobilisations']['incorporelles']['net']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Terrains</td>
        <td class="num">{{ $fmt($actif['immobilisations']['terrains']['brut']) }}</td>
        <td class="num">{{ $fmt($actif['immobilisations']['terrains']['amort']) }}</td>
        <td class="num-bold">{{ $fmt($actif['immobilisations']['terrains']['net']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Bâtiments et ouvrages</td>
        <td class="num">{{ $fmt($actif['immobilisations']['batiments']['brut']) }}</td>
        <td class="num">{{ $fmt($actif['immobilisations']['batiments']['amort']) }}</td>
        <td class="num-bold">{{ $fmt($actif['immobilisations']['batiments']['net']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Autres immob. corporelles</td>
        <td class="num">{{ $fmt($actif['immobilisations']['autres_corporelles']['brut']) }}</td>
        <td class="num">{{ $fmt($actif['immobilisations']['autres_corporelles']['amort']) }}</td>
        <td class="num-bold">{{ $fmt($actif['immobilisations']['autres_corporelles']['net']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Immobilisations financières</td>
        <td class="num">{{ $fmt($actif['immobilisations']['financieres']['brut']) }}</td>
        <td class="num">{{ $fmt($actif['immobilisations']['financieres']['amort']) }}</td>
        <td class="num-bold">{{ $fmt($actif['immobilisations']['financieres']['net']) }}</td>
      </tr>
      <tr class="row-total">
        <td class="lbl">TOTAL ACTIF IMMOBILISÉ</td>
        <td class="num">{{ $fmt($actif['immobilisations']['total_brut']) }}</td>
        <td class="num">{{ $fmt($actif['immobilisations']['total_amort']) }}</td>
        <td class="num-bold">{{ $fmt($actif['immobilisations']['total_net']) }}</td>
      </tr>

      {{-- Actif circulant --}}
      <tr class="subsection"><td colspan="4">Actif circulant</td></tr>
      <tr>
        <td class="lbl lbl-indent">Stocks et encours (30-38)</td>
        <td class="num" colspan="2">{{ $fmt($actif['circulant']['stocks']) }}</td>
        <td class="num-bold">{{ $fmt($actif['circulant']['stocks']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Créances clients (411-416)</td>
        <td class="num" colspan="2">{{ $fmt($actif['circulant']['creances_clients']) }}</td>
        <td class="num-bold">{{ $fmt($actif['circulant']['creances_clients']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Autres créances</td>
        <td class="num" colspan="2">{{ $fmt($actif['circulant']['autres_creances']) }}</td>
        <td class="num-bold">{{ $fmt($actif['circulant']['autres_creances']) }}</td>
      </tr>
      <tr class="row-total">
        <td class="lbl">TOTAL ACTIF CIRCULANT</td>
        <td class="num" colspan="2">{{ $fmt($actif['circulant']['total']) }}</td>
        <td class="num-bold">{{ $fmt($actif['circulant']['total']) }}</td>
      </tr>

      {{-- Trésorerie Actif --}}
      <tr class="subsection"><td colspan="4">Trésorerie-Actif</td></tr>
      <tr>
        <td class="lbl lbl-indent">Banques et caisses (51-57)</td>
        <td class="num" colspan="2">{{ $fmt($actif['tresorerie']) }}</td>
        <td class="num-bold">{{ $fmt($actif['tresorerie']) }}</td>
      </tr>

      {{-- Total général Actif --}}
      <tr class="row-grand-total">
        <td>TOTAL ACTIF</td>
        <td class="num" colspan="2"></td>
        <td class="num-bold" style="color:#fff !important;font-size:10pt">
          {{ number_format($data['total_actif'], 0, ',', ' ') }}
        </td>
      </tr>
    </table>
  </div>

  {{-- === PASSIF === --}}
  <div class="bilan-col">
    <div class="section-header" style="background:#C0392B">PASSIF</div>
    <table>
      <tr>
        <td class="col-header" style="width:55%">Désignation</td>
        <td class="col-header num" style="width:45%">Exercice N</td>
      </tr>

      @php
        $passif = $data['passif'];
      @endphp

      {{-- Capitaux propres --}}
      <tr class="subsection" style="background:#C0392B"><td colspan="2">Capitaux propres et ressources assimilées</td></tr>
      <tr>
        <td class="lbl lbl-indent">Capital social (101)</td>
        <td class="num-bold">{{ $fmt($passif['capitaux_propres']['capital']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Réserves (104-107)</td>
        <td class="num-bold">{{ $fmt($passif['capitaux_propres']['reserves']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Report à nouveau (110-119)</td>
        <td class="num-bold">{{ $fmt($passif['capitaux_propres']['report_nouveau']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Résultat net (120-129)</td>
        <td class="num-bold">{{ $fmt($passif['capitaux_propres']['resultat']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Subventions d'investissement</td>
        <td class="num-bold">{{ $fmt($passif['capitaux_propres']['subventions']) }}</td>
      </tr>
      <tr class="row-total">
        <td class="lbl">TOTAL CAPITAUX PROPRES</td>
        <td class="num-bold">{{ $fmt($passif['capitaux_propres']['total']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Dettes financières (16-17)</td>
        <td class="num-bold">{{ $fmt($passif['dettes_financieres']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Provisions pour risques (15)</td>
        <td class="num-bold">{{ $fmt($passif['provisions']) }}</td>
      </tr>
      <tr class="row-total">
        <td class="lbl">TOTAL RESSOURCES DURABLES</td>
        <td class="num-bold">{{ $fmt($passif['ressources_durables']) }}</td>
      </tr>

      {{-- Passif circulant --}}
      <tr class="subsection" style="background:#C0392B"><td colspan="2">Passif circulant</td></tr>
      <tr>
        <td class="lbl lbl-indent">Fournisseurs (401-408)</td>
        <td class="num-bold">{{ $fmt($passif['passif_circulant']['fournisseurs']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Dettes fiscales et sociales</td>
        <td class="num-bold">{{ $fmt($passif['passif_circulant']['dettes_fiscales']) }}</td>
      </tr>
      <tr>
        <td class="lbl lbl-indent">Autres dettes</td>
        <td class="num-bold">{{ $fmt($passif['passif_circulant']['autres_dettes']) }}</td>
      </tr>
      <tr class="row-total">
        <td class="lbl">TOTAL PASSIF CIRCULANT</td>
        <td class="num-bold">{{ $fmt($passif['passif_circulant']['total']) }}</td>
      </tr>

      {{-- Trésorerie Passif --}}
      <tr class="subsection" style="background:#C0392B"><td colspan="2">Trésorerie-Passif</td></tr>
      <tr>
        <td class="lbl lbl-indent">Crédits de trésorerie (521-522)</td>
        <td class="num-bold">{{ $fmt($passif['tresorerie']) }}</td>
      </tr>

      {{-- Total général Passif --}}
      <tr class="row-grand-total" style="background:#C0392B">
        <td>TOTAL PASSIF</td>
        <td class="num-bold" style="color:#fff !important;font-size:10pt">
          {{ number_format($data['total_passif'], 0, ',', ' ') }}
        </td>
      </tr>
    </table>
  </div>
</div>

{{-- Signatures --}}
<div class="signatures">
  <div class="sig-box">
    <div class="sig-title">Le Directeur Général</div>
    <div style="font-size:8pt;color:#999;margin-top:40px">Signature et cachet</div>
  </div>
  <div class="sig-box">
    <div class="sig-title">L'Expert-Comptable / Commissaire aux comptes</div>
    <div style="font-size:8pt;color:#999;margin-top:40px">Signature et cachet</div>
  </div>
  <div class="sig-box">
    <div class="sig-title">Date d'établissement</div>
    <div style="margin-top:8px;font-size:9pt;font-weight:bold">{{ now()->format('d/m/Y') }}</div>
  </div>
</div>

<div class="footer">
  Bilan établi selon les normes SYSCOHADA Révisé 2017 — Acte Uniforme OHADA relatif au droit comptable et à l'information financière
  | Généré par IBIG SECRETIS ERP le {{ now()->format('d/m/Y à H:i') }}
</div>

</body>
</html>
