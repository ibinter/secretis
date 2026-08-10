{{--
    Certificat de formation interne (dompdf, A4 PAYSAGE — setPaper('A4','landscape')).
    Appelé par : App\Services\TrainingService::generateCertificatePdf() (ligne 326)
    Variables :
      $certificate  stdClass (training_certificates) : id, enrollment_id, user_id, course_id,
                    certificate_number (CERT-2026-XXXXX), issued_at, expires_at,
                    verification_token, created_at, updated_at
      $user         stdClass (users) : id, name, email, ...
      $course       stdClass (training_courses) : id, organization_id, title, description,
                    category, thumbnail_path, duration_minutes, level, is_published, created_by
      $organization stdClass (organizations) : id, name, email, phone, address, ...
      $avg_score    int|null  score moyen arrondi des quiz réussis
      $verify_url   string    config('app.url') . '/verify/certificate/{verification_token}'
--}}
@php
    $levels = [
        'beginner'     => 'Debutant',
        'intermediate' => 'Intermediaire',
        'advanced'     => 'Avance',
    ];
    $issued  = !empty($certificate->issued_at)
        ? \Carbon\Carbon::parse($certificate->issued_at)
        : null;
    $expires = !empty($certificate->expires_at)
        ? \Carbon\Carbon::parse($certificate->expires_at)
        : null;
    $duration = (int) ($course->duration_minutes ?? 0);
    $durationLabel = $duration > 0
        ? ($duration >= 60
            ? intdiv($duration, 60) . ' h' . ($duration % 60 ? ' ' . ($duration % 60) . ' min' : '')
            : $duration . ' min')
        : null;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Certificat de formation — {{ $certificate->certificate_number ?? '' }}</title>
    <style>
        * { font-family: "DejaVu Sans", sans-serif; }
        @page { margin: 0; }
        body { margin: 0; padding: 0; color: #1f2937; }

        .sheet { width: 100%; padding: 11mm; }
        .frame { border: 2px solid #9333EA; padding: 3mm; }
        .frame-inner { border: 1px solid #e9d5ff; padding: 9mm 14mm; text-align: center; }

        .org { font-size: 14px; font-weight: bold; color: #111827; }
        .org-sub { font-size: 9px; color: #6b7280; margin-top: 1px; }

        .doctype { font-size: 24px; font-weight: bold; color: #111827;
                   letter-spacing: 4px; text-transform: uppercase; margin-top: 7mm; }
        .doctype-sub { font-size: 10px; color: #9333EA; letter-spacing: 2px;
                       text-transform: uppercase; margin-top: 2px; }

        .rule { width: 55mm; border: 0; border-top: 2px solid #9333EA; margin: 5mm auto; }

        .lead { font-size: 11px; color: #4b5563; }
        .name { font-size: 26px; font-weight: bold; color: #111827; margin: 3mm 0 1mm; }
        .name-underline { width: 105mm; border: 0; border-top: 1px solid #d1d5db;
                          margin: 0 auto 4mm; }
        .course { font-size: 15px; font-weight: bold; color: #6b21a8; margin-top: 2mm; }
        .course-desc { font-size: 9px; color: #6b7280; margin-top: 2mm; }

        table.meta { width: 100%; border-collapse: collapse; margin: 6mm auto 0; }
        table.meta td { border: 1px solid #e5e7eb; padding: 4px 6px; text-align: center;
                        font-size: 9px; color: #6b7280; width: 25%; }
        .meta-value { font-size: 11px; font-weight: bold; color: #111827; }

        table.foot { width: 100%; border-collapse: collapse; margin-top: 8mm; }
        table.foot td { width: 50%; vertical-align: bottom; font-size: 9px;
                        color: #6b7280; padding: 0 8mm; text-align: center; }
        .foot-line { border-top: 1px solid #9ca3af; margin-top: 11mm; padding-top: 3px; }

        .verify { margin-top: 6mm; font-size: 8px; color: #9ca3af; line-height: 1.5; }
        .mono { font-family: "DejaVu Sans Mono", monospace; color: #6b7280; }
    </style>
</head>
<body>

<div class="sheet">
<div class="frame">
<div class="frame-inner">

    <div class="org">{{ $organization->name ?? 'SECRETIS ERP' }}</div>
    <div class="org-sub">
        @if (!empty($organization->address)){{ $organization->address }}@endif
        @if (!empty($organization->phone)) · {{ $organization->phone }} @endif
    </div>

    <div class="doctype">Certificat</div>
    <div class="doctype-sub">de formation</div>

    <hr class="rule">

    <div class="lead">Il est certifie que</div>

    <div class="name">{{ $user->name ?? 'Apprenant' }}</div>
    <hr class="name-underline">

    <div class="lead">a suivi dans son integralite et valide la formation</div>
    <div class="course">{{ $course->title ?? 'Formation' }}</div>
    @if (!empty($course->description))
        <div class="course-desc">{{ \Illuminate\Support\Str::limit($course->description, 180) }}</div>
    @endif

    <table class="meta">
        <tr>
            <td>
                <div class="meta-value">{{ $certificate->certificate_number ?? '—' }}</div>
                <div>Numero de certificat</div>
            </td>
            <td>
                <div class="meta-value">{{ $issued?->format('d/m/Y') ?? '—' }}</div>
                <div>Date de delivrance</div>
            </td>
            <td>
                <div class="meta-value">
                    {{ $levels[$course->level ?? ''] ?? ($course->level ?: '—') }}
                    @if ($durationLabel) — {{ $durationLabel }} @endif
                </div>
                <div>Niveau et duree</div>
            </td>
            <td>
                <div class="meta-value">
                    {{ isset($avg_score) && $avg_score !== null ? $avg_score . ' / 100' : 'Non evalue' }}
                </div>
                <div>Score moyen aux evaluations</div>
            </td>
        </tr>
    </table>

    <table class="foot">
        <tr>
            <td>
                <div class="foot-line">Le responsable de la formation</div>
            </td>
            <td>
                <div class="foot-line">La direction — {{ $organization->name ?? 'SECRETIS ERP' }}</div>
            </td>
        </tr>
    </table>

    <div class="verify">
        @if ($expires)
            Valable jusqu'au {{ $expires->format('d/m/Y') }}.
        @else
            Certificat sans date d'expiration.
        @endif
        <br>
        Verification en ligne : {{ $verify_url ?? '—' }}<br>
        Jeton :
        <span class="mono">{{ $certificate->verification_token ?? 'non disponible' }}</span>
    </div>

</div>
</div>
</div>

</body>
</html>
