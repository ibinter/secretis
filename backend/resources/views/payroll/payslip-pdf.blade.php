{{--
    Bulletin de paie — document remis au salarié.

    Variables : bulletin, lignes, periode, organization, profil.

    Deux exigences ont guidé la mise en page :
      1. Un bulletin doit se lire sans explication : brut, retenues, net à payer
         dans cet ordre, avec le net détaché du reste.
      2. Il doit être VÉRIFIABLE : chaque ligne porte son assiette et son taux,
         et la part patronale figure séparément — elle ne se retranche pas du
         net mais montre le coût réel de l'emploi.

    ⚠️ Ne jamais coller une directive Blade à un caractère de mot
    (du texte suivi immédiatement d'une directive) : la règle `\B` de la regex
    Blade ne la compile pas, et la directive de fermeture provoque alors une
    erreur de syntaxe.
--}}
@php
    $devise = $bulletin->currency ?: 'XOF';
    $fmt    = fn ($m) => number_format((float) $m, 0, ',', ' ');

    $parCategorie = collect($lignes)->groupBy('category');
    $gains        = $parCategorie->get('earning', collect());
    $cotisations  = $parCategorie->get('contribution', collect());
    $impots       = $parCategorie->get('tax', collect());
    $retenues     = $parCategorie->get('deduction', collect());
    $patronales   = $parCategorie->get('employer_contribution', collect());

    $coutEmployeur = (float) $bulletin->gross_salary + (float) $bulletin->employer_contributions;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Bulletin {{ $bulletin->reference }}</title>
<style>
    @page { margin: 18mm 15mm; }
    body  { font-family: DejaVu Sans, Arial, sans-serif; font-size: 10px; color: #1f2937; }
    h1    { font-size: 15px; margin: 0 0 2px; color: #9333EA; }
    table { width: 100%; border-collapse: collapse; }
    .entete td { vertical-align: top; padding: 0; }
    .bloc { border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 10px; }
    .titre-section { font-size: 10px; font-weight: bold; text-transform: uppercase;
                     letter-spacing: .04em; color: #6b7280; margin: 14px 0 4px; }
    .lignes th { background: #faf5ff; text-align: left; padding: 5px 7px; font-size: 9px;
                 text-transform: uppercase; letter-spacing: .03em; color: #6b7280;
                 border-bottom: 1px solid #e9d5ff; }
    .lignes td { padding: 5px 7px; border-bottom: 1px solid #f3f4f6; }
    .num  { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .net  { background: #9333EA; color: #fff; border-radius: 4px; padding: 10px 14px; }
    .net .montant { font-size: 18px; font-weight: bold; }
    .discret { color: #6b7280; font-size: 9px; }
    .avert { background: #fff7ed; border-left: 3px solid #D97706; padding: 7px 10px;
             font-size: 9px; color: #92400e; margin-top: 10px; }
</style>
</head>
<body>

{{-- ── En-tête : employeur et salarié ─────────────────────────────────────── --}}
<table class="entete">
    <tr>
        <td style="width:52%; padding-right:10px;">
            <h1>{{ $organization->name ?? 'Employeur' }}</h1>
            <div class="discret">
                @if(!empty($organization->address)){{ $organization->address }}<br>@endif
                @if(!empty($organization->phone)){{ $organization->phone }}@endif
                @if(!empty($organization->email)) · {{ $organization->email }}@endif
            </div>
        </td>
        <td style="width:48%;">
            <div class="bloc">
                <strong>Bulletin de paie</strong> — {{ $periode->label ?? '' }}<br>
                <span class="discret">Référence {{ $bulletin->reference }}</span>
            </div>
        </td>
    </tr>
</table>

<table class="entete" style="margin-top:10px;">
    <tr>
        <td style="width:52%; padding-right:10px;">
            <div class="bloc">
                <strong>{{ $bulletin->employee_name }}</strong><br>
                @if($bulletin->employee_position)<span class="discret">{{ $bulletin->employee_position }}</span><br>@endif
                @if($bulletin->social_security_number)
                    <span class="discret">N° sécurité sociale : {{ $bulletin->social_security_number }}</span><br>
                @endif
                @if($bulletin->hire_date)
                    <span class="discret">Embauché le {{ \Carbon\Carbon::parse($bulletin->hire_date)->format('d/m/Y') }}</span>
                @endif
            </div>
        </td>
        <td style="width:48%;">
            <div class="bloc">
                <span class="discret">Régime social</span><br>
                {{ $profil->social_scheme_name ?? $bulletin->country_code }}<br>
                <span class="discret">
                    Période du {{ \Carbon\Carbon::parse($periode->period_start)->format('d/m/Y') }}
                    au {{ \Carbon\Carbon::parse($periode->period_end)->format('d/m/Y') }}
                </span>
            </div>
        </td>
    </tr>
</table>

{{-- ── Gains ──────────────────────────────────────────────────────────────── --}}
<div class="titre-section">Rémunération</div>
<table class="lignes">
    <thead>
        <tr>
            <th style="width:52%;">Libellé</th>
            <th class="num" style="width:16%;">Base</th>
            <th class="num" style="width:12%;">Taux</th>
            <th class="num" style="width:20%;">Montant</th>
        </tr>
    </thead>
    <tbody>
        @foreach($gains as $l)
        <tr>
            <td>{{ $l->label }}</td>
            <td class="num">{{ $l->base ? $fmt($l->base) : '' }}</td>
            <td class="num">{{ $l->rate ? number_format((float) $l->rate, 2, ',', ' ') . ' %' : '' }}</td>
            <td class="num">{{ $fmt($l->amount) }}</td>
        </tr>
        @endforeach
        <tr>
            <td colspan="3"><strong>Salaire brut</strong></td>
            <td class="num"><strong>{{ $fmt($bulletin->gross_salary) }} {{ $devise }}</strong></td>
        </tr>
    </tbody>
</table>

{{-- ── Retenues salariales ────────────────────────────────────────────────── --}}
<div class="titre-section">Retenues salariales</div>
<table class="lignes">
    <thead>
        <tr>
            <th style="width:52%;">Libellé</th>
            <th class="num" style="width:16%;">Assiette</th>
            <th class="num" style="width:12%;">Taux</th>
            <th class="num" style="width:20%;">Montant</th>
        </tr>
    </thead>
    <tbody>
        @forelse($cotisations->concat($impots)->concat($retenues) as $l)
        <tr>
            <td>{{ $l->label }}</td>
            <td class="num">{{ $l->base ? $fmt($l->base) : '' }}</td>
            <td class="num">{{ $l->rate ? number_format((float) $l->rate, 2, ',', ' ') . ' %' : '' }}</td>
            <td class="num">− {{ $fmt($l->amount) }}</td>
        </tr>
        @empty
        <tr><td colspan="4" class="discret">Aucune retenue sur cette période.</td></tr>
        @endforelse
        <tr>
            <td colspan="3"><strong>Total des retenues</strong></td>
            <td class="num"><strong>− {{ $fmt((float) $bulletin->employee_contributions + (float) $bulletin->income_tax + (float) $bulletin->other_deductions) }}</strong></td>
        </tr>
    </tbody>
</table>

{{-- ── Net à payer ────────────────────────────────────────────────────────── --}}
<table style="margin-top:14px;">
    <tr>
        <td class="net">
            <table>
                <tr>
                    <td style="color:#f3e8ff;">NET À PAYER</td>
                    <td class="num montant">{{ $fmt($bulletin->net_salary) }} {{ $devise }}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

{{-- ── Charges patronales ─────────────────────────────────────────────────── --}}
@if($patronales->isNotEmpty())
<div class="titre-section">Charges patronales — pour information, non déduites du net</div>
<table class="lignes">
    <thead>
        <tr>
            <th style="width:52%;">Libellé</th>
            <th class="num" style="width:16%;">Assiette</th>
            <th class="num" style="width:12%;">Taux</th>
            <th class="num" style="width:20%;">Montant</th>
        </tr>
    </thead>
    <tbody>
        @foreach($patronales as $l)
        <tr>
            <td>{{ $l->label }}</td>
            <td class="num">{{ $l->base ? $fmt($l->base) : '' }}</td>
            <td class="num">{{ $l->rate ? number_format((float) $l->rate, 2, ',', ' ') . ' %' : '' }}</td>
            <td class="num">{{ $fmt($l->amount) }}</td>
        </tr>
        @endforeach
        <tr>
            <td colspan="3"><strong>Coût total pour l'employeur</strong></td>
            <td class="num"><strong>{{ $fmt($coutEmployeur) }} {{ $devise }}</strong></td>
        </tr>
    </tbody>
</table>
@endif

{{-- ── Réserve sur les taux non confirmés ─────────────────────────────────── --}}
@unless($bulletin->rules_verified)
<div class="avert">
    <strong>Taux non confirmés sur texte officiel.</strong>
    Les cotisations de ce bulletin s'appuient sur des règles saisies dans le référentiel
    mais non encore validées au regard des textes en vigueur. À vérifier avant tout dépôt
    de déclaration ou remise définitive au salarié.
</div>
@endunless

<p class="discret" style="margin-top:16px;">
    Bulletin établi le {{ now()->format('d/m/Y') }} — à conserver sans limitation de durée.
    Document généré par SECRETIS.
</p>

</body>
</html>
