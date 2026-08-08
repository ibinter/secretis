{{--
    Certificat Académie IBIG SECRETIS (dompdf, A4 PAYSAGE — cf. AcademyService::generateCertificatePdf).
    Appelé par : App\Services\AcademyService::generateCertificatePdf() (ligne 464) via view(...)->render()
                 puis Pdf::loadHTML(...)->setPaper('a4', 'landscape')
    Variables :
      $cert       stdClass (ligne de academy_certificates) :
                  id, uuid, user_id, course_id, user_name, course_title, score (0-100|null),
                  issued_at, created_at, updated_at
      $verifyUrl  string  url('/training/verify/{uuid}')
      $issuedAt   string  date déjà formatée « d F Y » (translatedFormat)
--}}
@php
    $score = $cert->score ?? null;
    $uuid  = $cert->uuid ?? '';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Certificat — {{ $cert->course_title ?? 'Formation' }}</title>
    <style>
        * { font-family: "DejaVu Sans", sans-serif; }
        @page { margin: 0; }
        body { margin: 0; padding: 0; color: #1f2937; }

        .sheet { width: 100%; padding: 12mm; }
        .frame { border: 2px solid #9333EA; padding: 3mm; }
        .frame-inner { border: 1px solid #e9d5ff; padding: 10mm 14mm; text-align: center; }

        .brand { font-size: 12px; font-weight: bold; color: #9333EA;
                 letter-spacing: 3px; text-transform: uppercase; }
        .brand-sub { font-size: 9px; color: #6b7280; margin-top: 2px; }

        .doctype { font-size: 26px; font-weight: bold; color: #111827;
                   letter-spacing: 4px; text-transform: uppercase; margin-top: 8mm; }
        .doctype-sub { font-size: 10px; color: #6b7280; letter-spacing: 2px;
                       text-transform: uppercase; margin-top: 2px; }

        .rule { width: 60mm; border: 0; border-top: 2px solid #9333EA; margin: 6mm auto; }

        .lead { font-size: 11px; color: #4b5563; }
        .name { font-size: 28px; font-weight: bold; color: #111827; margin: 4mm 0 1mm; }
        .name-underline { width: 110mm; border: 0; border-top: 1px solid #d1d5db;
                          margin: 0 auto 5mm; }
        .course { font-size: 16px; font-weight: bold; color: #6b21a8; margin-top: 2mm; }

        table.foot { width: 100%; border-collapse: collapse; margin-top: 10mm; }
        table.foot td { width: 33.33%; vertical-align: bottom; font-size: 9px;
                        color: #6b7280; padding: 0 4mm; text-align: center; }
        .foot-value { font-size: 11px; font-weight: bold; color: #111827; }
        .foot-line { border-top: 1px solid #9ca3af; margin-top: 12mm; padding-top: 3px; }

        .verify { margin-top: 8mm; font-size: 8px; color: #9ca3af; line-height: 1.5; }
        .uuid { font-family: "DejaVu Sans Mono", monospace; color: #6b7280; }
        .score-badge { display: inline-block; border: 1px solid #9333EA; color: #6b21a8;
                       padding: 3px 12px; font-size: 11px; font-weight: bold; margin-top: 4mm; }
    </style>
</head>
<body>

<div class="sheet">
<div class="frame">
<div class="frame-inner">

    <div class="brand">IBIG SECRETIS ACADEMY</div>
    <div class="brand-sub">Centre de formation IBIG Soft — Abidjan, Cote d'Ivoire</div>

    <div class="doctype">Certificat</div>
    <div class="doctype-sub">de reussite</div>

    <hr class="rule">

    <div class="lead">Le present certificat atteste que</div>

    <div class="name">{{ $cert->user_name ?? 'Apprenant' }}</div>
    <hr class="name-underline">

    <div class="lead">a suivi et valide avec succes le parcours de formation</div>
    <div class="course">{{ $cert->course_title ?? 'Formation SECRETIS' }}</div>

    @if ($score !== null)
        <div class="score-badge">Score obtenu : {{ $score }} / 100</div>
    @endif

    <table class="foot">
        <tr>
            <td>
                <div class="foot-value">{{ $issuedAt ?? '—' }}</div>
                <div>Date de delivrance</div>
            </td>
            <td>
                <div class="foot-value uuid">{{ $uuid !== '' ? strtoupper(substr($uuid, 0, 8)) : '—' }}</div>
                <div>Numero de certificat</div>
            </td>
            <td>
                <div class="foot-line">Direction de l'Academie</div>
            </td>
        </tr>
    </table>

    <div class="verify">
        Authenticite verifiable en ligne : {{ $verifyUrl ?? '—' }}<br>
        Identifiant unique : <span class="uuid">{{ $uuid ?: 'non disponible' }}</span>
    </div>

</div>
</div>
</div>

</body>
</html>
