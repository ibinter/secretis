<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Compte de résultat SYSCOHADA — {{ $fy->name }}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'DejaVu Sans', Arial, sans-serif;
    font-size: 9pt;
    color: #1a1a1a;
    background: #fff;
  }

  .header {
    border-bottom: 3px solid #1A3A5C;
    padding-bottom: 10px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .org-name { font-size: 13pt; font-weight: bold; color: #1A3A5C; }
  .org-info { font-size: 8pt; color: #555; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h1 {
    font-size: 14pt;
    font-weight: bold;
    color: #1A3A5C;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .doc-subtitle { font-size: 8pt; color: #777; margin-top: 2px; }

  table {
    width: 100%;
    border-collapse: collapse;
  }
  .main-table {
    border: 1px solid #d1d5db;
    border-radius: 4px;
    overflow: hidden;
  }
  .th {
    background: #e8ecf0;
    font-size: 8pt;
    font-weight: bold;
    text-transform: uppercase;
    color: #555;
    padding: 5px 8px;
    border-bottom: 1px solid #d1d5db;
  }
  .th-r { text-align: right; }

  td { padding: 3.5px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
  .lbl { font-size: 8.5pt; color: #2d3748; }
  .lbl-i1 { padding-left: 20px !important; }
  .lbl-i2 { padding-left: 36px !important; }
  .num { font-family: 'Courier New', monospace; font-size: 8pt; text-align: right; }
  .num-r { font-family: 'Courier New', monospace; font-size: 8pt; text-align: right; color: #555; }
  .pct { font-size: 7pt; text-align: right; color: #999; font-family: 'Courier New', monospace; }

  /* Sections */
  .section-hdr {
    background: #1A3A5C;
    color: #fff;
    font-size: 8.5pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .section-hdr td { padding: 5px 8px; border: none; color: #fff; }

  .subsection-hdr {
    background: #2E86C1;
    color: #fff;
  }
  .subsection-hdr td { padding: 4px 8px; border: none; color: #fff; font-size: 8pt; font-weight: bold; text-transform: uppercase; }

  /* Totaux */
  .row-subtotal {
    background: #f0f4f8;
    border-top: 1px solid #c8d0da;
    border-bottom: 1px solid #c8d0da;
  }
  .row-subtotal td { font-weight: bold; }

  .row-sig { background: #e8f0fe; }
  .row-sig td { font-weight: bold; color: #1A3A5C; padding: 5px 8px; }

  .row-final {
    background: #1A3A5C;
  }
  .row-final td {
    color: #fff;
    font-weight: bold;
    font-size: 10pt;
    padding: 8px;
    border: none;
  }
  .row-final .num-r { color: #fff; font-size: 10pt; }

  /* SIG bloc */
  .sig-bloc {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    margin-bottom: 12px;
  }
  .kpi-box {
    flex: 1;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 8px;
    text-align: center;
  }
  .kpi-label { font-size: 7pt; color: #777; text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi-value { font-size: 11pt; font-weight: bold; font-family: 'Courier New', monospace; color: #1A3A5C; margin-top: 2px; }
  .kpi-pct { font-size: 7pt; color: #999; margin-top: 1px; }

  .signatures {
    margin-top: 20px;
    display: flex;
    gap: 20px;
    justify-content: space-between;
  }
  .sig-box {
    flex: 1;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 10px;
    min-height: 70px;
  }
  .sig-title { font-size: 8pt; font-weight: bold; color: #555; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }

  .footer {
    margin-top: 15px;
    border-top: 1px solid #d1d5db;
    padding-top: 6px;
    font-size: 7pt;
    color: #999;
    text-align: center;
  }

  @page { size: A4 portrait; margin: 1.2cm 1.5cm; }
</style>
</head>
<body>

{{-- En-tête --}}
<div class="header">
  <div>
    <div class="org-name">{{ $org->name ?? 'Organisation' }}</div>
    <div class="org-info">RCCM : {{ $org->rccm ?? '—' }} | NIF : {{ $org->nif ?? '—' }}</div>
    <div class="org-info">{{ $org->address ?? '' }}</div>
  </div>
  <div class="doc-title">
    <h1>Compte de Résultat</h1>
    <div class="doc-subtitle">SYSCOHADA Révisé 2017 (BCEAO)</div>
    <div class="doc-subtitle">Exercice : {{ $fy->name }}</div>
    <div class="doc-subtitle">Du {{ \Carbon\Carbon::parse($data['period']['start'])->format('d/m/Y') }}
      au {{ \Carbon\Carbon::parse($data['period']['end'])->format('d/m/Y') }}</div>
  </div>
</div>

{{-- KPI Soldes intermédiaires --}}
@php
  $fmt = fn($v) => ($v == 0) ? '—' : number_format(abs($v), 0, ',', ' ') . ' FCFA';
  $pct = fn($v, $b) => ($b && $b != 0) ? number_format(abs($v / $b) * 100, 1) . '%' : '—';
  $ca  = $data['chiffre_affaires'];
@endphp

<div class="sig-bloc">
  <div class="kpi-box">
    <div class="kpi-label">Chiffre d'affaires</div>
    <div class="kpi-value" style="font-size:9pt">{{ $fmt($data['chiffre_affaires']) }}</div>
  </div>
  <div class="kpi-box">
    <div class="kpi-label">Valeur ajoutée</div>
    <div class="kpi-value" style="color:#6366f1">{{ $fmt($data['valeur_ajoutee']) }}</div>
    <div class="kpi-pct">{{ $pct($data['valeur_ajoutee'], $ca) }} du CA</div>
  </div>
  <div class="kpi-box">
    <div class="kpi-label">EBE</div>
    <div class="kpi-value" style="color:#7c3aed">{{ $fmt($data['ebe']) }}</div>
    <div class="kpi-pct">{{ $pct($data['ebe'], $ca) }} du CA</div>
  </div>
  <div class="kpi-box">
    <div class="kpi-label">Résultat net</div>
    <div class="kpi-value" style="color:{{ $data['resultat_net'] >= 0 ? '#059669' : '#dc2626' }}">
      {{ $fmt($data['resultat_net']) }}
    </div>
    <div class="kpi-pct">{{ $pct($data['resultat_net'], $ca) }} du CA</div>
  </div>
</div>

{{-- Tableau compte de résultat --}}
<table class="main-table">
  <thead>
    <tr>
      <td class="th" style="width:55%">INTITULÉ</td>
      <td class="th th-r" style="width:25%">EXERCICE N</td>
      <td class="th th-r" style="width:20%">% CA</td>
    </tr>
  </thead>
  <tbody>

    {{-- Produits --}}
    <tr class="section-hdr"><td colspan="3">Produits d'activités ordinaires</td></tr>
    <tr>
      <td class="lbl lbl-i1">Ventes et services (701–707)</td>
      <td class="num">{{ $fmt($data['chiffre_affaires']) }}</td>
      <td class="pct">{{ $pct($data['chiffre_affaires'], $ca) }}</td>
    </tr>
    <tr>
      <td class="lbl lbl-i1">Autres produits (71, 72, 75)</td>
      <td class="num">{{ $fmt($data['autres_produits']) }}</td>
      <td class="pct">{{ $pct($data['autres_produits'], $ca) }}</td>
    </tr>
    <tr class="row-subtotal">
      <td class="lbl">Production de l'exercice</td>
      <td class="num">{{ $fmt($data['production_exercice']) }}</td>
      <td class="pct">{{ $pct($data['production_exercice'], $ca) }}</td>
    </tr>

    {{-- Charges --}}
    <tr class="section-hdr"><td colspan="3">Charges d'activités ordinaires</td></tr>
    <tr>
      <td class="lbl lbl-i1">Achats de marchandises (601–608)</td>
      <td class="num">{{ $fmt($data['achats_consommes']) }}</td>
      <td class="pct">{{ $pct($data['achats_consommes'], $ca) }}</td>
    </tr>
    <tr>
      <td class="lbl lbl-i1">Transports (611–618)</td>
      <td class="num">{{ $fmt($data['transports']) }}</td>
      <td class="pct">{{ $pct($data['transports'], $ca) }}</td>
    </tr>
    <tr>
      <td class="lbl lbl-i1">Services extérieurs A (621–628)</td>
      <td class="num">{{ $fmt($data['services_ext_a']) }}</td>
      <td class="pct">{{ $pct($data['services_ext_a'], $ca) }}</td>
    </tr>
    <tr>
      <td class="lbl lbl-i1">Services extérieurs B (631–638)</td>
      <td class="num">{{ $fmt($data['services_ext_b']) }}</td>
      <td class="pct">{{ $pct($data['services_ext_b'], $ca) }}</td>
    </tr>
    <tr class="row-subtotal">
      <td class="lbl">Consommations intermédiaires</td>
      <td class="num">{{ $fmt($data['consommations_intermediaires']) }}</td>
      <td class="pct">{{ $pct($data['consommations_intermediaires'], $ca) }}</td>
    </tr>

    {{-- SIG --}}
    <tr class="row-sig"><td colspan="3" style="font-size:8pt;letter-spacing:1px">SOLDES INTERMÉDIAIRES DE GESTION</td></tr>

    <tr class="row-sig">
      <td class="lbl">VALEUR AJOUTÉE (VA = Production − Consommations)</td>
      <td class="num">{{ $fmt($data['valeur_ajoutee']) }}</td>
      <td class="pct">{{ $pct($data['valeur_ajoutee'], $ca) }}</td>
    </tr>
    <tr>
      <td class="lbl lbl-i1">Charges de personnel (661–668)</td>
      <td class="num">{{ $fmt($data['charges_personnel']) }}</td>
      <td class="pct">{{ $pct($data['charges_personnel'], $ca) }}</td>
    </tr>
    <tr>
      <td class="lbl lbl-i1">Impôts et taxes (641–648)</td>
      <td class="num">{{ $fmt($data['impots_taxes']) }}</td>
      <td class="pct">{{ $pct($data['impots_taxes'], $ca) }}</td>
    </tr>
    <tr class="row-sig">
      <td class="lbl">EXCÉDENT BRUT D'EXPLOITATION (EBE)</td>
      <td class="num">{{ $fmt($data['ebe']) }}</td>
      <td class="pct">{{ $pct($data['ebe'], $ca) }}</td>
    </tr>
    <tr>
      <td class="lbl lbl-i1">Reprises amortissements (781–782)</td>
      <td class="num">{{ $fmt($data['reprises']) }}</td>
      <td class="pct">{{ $pct($data['reprises'], $ca) }}</td>
    </tr>
    <tr>
      <td class="lbl lbl-i1">Dotations amortissements (681–682)</td>
      <td class="num">{{ $fmt($data['dotations_amort']) }}</td>
      <td class="pct">{{ $pct($data['dotations_amort'], $ca) }}</td>
    </tr>
    <tr>
      <td class="lbl lbl-i1">Autres charges (651–658)</td>
      <td class="num">{{ $fmt($data['autres_charges']) }}</td>
      <td class="pct">{{ $pct($data['autres_charges'], $ca) }}</td>
    </tr>
    <tr class="row-sig">
      <td class="lbl">RÉSULTAT D'EXPLOITATION (REX)</td>
      <td class="num">{{ $fmt($data['rex']) }}</td>
      <td class="pct">{{ $pct($data['rex'], $ca) }}</td>
    </tr>

    {{-- Financier --}}
    <tr class="subsection-hdr"><td colspan="3">Résultat financier</td></tr>
    <tr>
      <td class="lbl lbl-i1">Revenus financiers (771–778)</td>
      <td class="num">{{ $fmt($data['produits_financiers']) }}</td>
      <td class="pct">{{ $pct($data['produits_financiers'], $ca) }}</td>
    </tr>
    <tr>
      <td class="lbl lbl-i1">Frais financiers (671–678)</td>
      <td class="num">{{ $fmt($data['charges_financieres']) }}</td>
      <td class="pct">{{ $pct($data['charges_financieres'], $ca) }}</td>
    </tr>
    <tr class="row-sig">
      <td class="lbl">RÉSULTAT FINANCIER</td>
      <td class="num">{{ $fmt($data['resultat_financier']) }}</td>
      <td class="pct">{{ $pct($data['resultat_financier'], $ca) }}</td>
    </tr>

    <tr class="row-sig" style="background:#dbeafe">
      <td class="lbl" style="font-size:9pt;color:#1e40af">RÉSULTAT DES ACTIVITÉS ORDINAIRES (RAO)</td>
      <td class="num" style="font-size:9pt;color:#1e40af">{{ $fmt($data['rao']) }}</td>
      <td class="pct">{{ $pct($data['rao'], $ca) }}</td>
    </tr>

    {{-- HAO --}}
    <tr class="subsection-hdr"><td colspan="3">Éléments hors activités ordinaires (HAO)</td></tr>
    <tr>
      <td class="lbl lbl-i1">Produits HAO (82, 84, 86, 88)</td>
      <td class="num">{{ $fmt($data['produits_hao']) }}</td>
      <td class="pct">{{ $pct($data['produits_hao'], $ca) }}</td>
    </tr>
    <tr>
      <td class="lbl lbl-i1">Charges HAO (81, 83, 85, 87)</td>
      <td class="num">{{ $fmt($data['charges_hao']) }}</td>
      <td class="pct">{{ $pct($data['charges_hao'], $ca) }}</td>
    </tr>
    <tr>
      <td class="lbl">Résultat HAO</td>
      <td class="num">{{ $fmt($data['resultat_hao']) }}</td>
      <td class="pct">{{ $pct($data['resultat_hao'], $ca) }}</td>
    </tr>

    <tr>
      <td class="lbl">Impôts sur le résultat (695)</td>
      <td class="num">{{ $fmt($data['impots_sur_resultat']) }}</td>
      <td class="pct">{{ $pct($data['impots_sur_resultat'], $ca) }}</td>
    </tr>

    {{-- Résultat net --}}
    <tr class="row-final">
      <td>RÉSULTAT NET DE L'EXERCICE</td>
      <td class="num-r" style="color:#fff !important;font-size:11pt">
        {{ ($data['resultat_net'] >= 0 ? '' : '(') . $fmt($data['resultat_net']) . ($data['resultat_net'] >= 0 ? '' : ')') }}
      </td>
      <td class="pct" style="color:#ccc">{{ $pct($data['resultat_net'], $ca) }}</td>
    </tr>
  </tbody>
</table>

{{-- Signatures --}}
<div class="signatures">
  <div class="sig-box">
    <div class="sig-title">Le Directeur Général</div>
    <div style="font-size:8pt;color:#999;margin-top:42px">Signature et cachet</div>
  </div>
  <div class="sig-box">
    <div class="sig-title">L'Expert-Comptable</div>
    <div style="font-size:8pt;color:#999;margin-top:42px">Signature et cachet</div>
  </div>
  <div class="sig-box">
    <div class="sig-title">Date d'arrêté des comptes</div>
    <div style="margin-top:8px;font-size:10pt;font-weight:bold">{{ now()->format('d/m/Y') }}</div>
  </div>
</div>

<div class="footer">
  Compte de résultat établi selon les normes SYSCOHADA Révisé 2017 — Acte Uniforme OHADA relatif au droit comptable
  | Généré par IBIG SECRETIS ERP le {{ now()->format('d/m/Y à H:i') }}
</div>

</body>
</html>
