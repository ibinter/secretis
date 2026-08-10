{{--
    Certificat de signature électronique — preuve / dossier de preuve (dompdf, A4 portrait).
    Appelé par : App\Services\SignatureService::generateCertificate() (ligne 318)
    Variables :
      $request       App\Models\SignatureRequest (relations chargées : signers, document, auditTrail)
                     id, organization_id, document_id, title, message, status, signing_order,
                     expires_at, completed_at, created_by
      $auditTrail    Collection de App\Models\SignatureAuditTrail triée par created_at :
                     event_type (created|sent|reminder_sent|signed|declined|cancelled|completed),
                     actor_email, actor_ip, data (array), created_at
      $generatedAt   Carbon
      $documentHash  string  empreinte SHA-256 du fichier signé
--}}
@php
    $events = [
        'created'       => 'Creation de la demande',
        'sent'          => 'Invitation envoyee',
        'reminder_sent' => 'Rappel envoye',
        'signed'        => 'Document signe',
        'declined'      => 'Signature refusee',
        'cancelled'     => 'Demande annulee',
        'completed'     => 'Processus finalise',
    ];
    $statuses = [
        'draft'            => 'Brouillon',
        'pending'          => 'En attente',
        'partially_signed' => 'Partiellement signe',
        'completed'        => 'Complete',
        'declined'         => 'Refuse',
        'cancelled'        => 'Annule',
    ];
    $signerStatuses = [
        'pending'  => 'En attente',
        'signed'   => 'Signe',
        'declined' => 'Refuse',
    ];

    $signers     = $request->signers ?? collect();
    $auditTrail  = $auditTrail ?? collect();
    $generatedAt = $generatedAt ?? now();
    $signedCount = $signers->where('status', 'signed')->count();
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Certificat de signature electronique — {{ $request->title ?? '' }}</title>
    <style>
        * { font-family: "DejaVu Sans", sans-serif; }
        @page { margin: 20mm 15mm 18mm 15mm; }
        body { font-size: 10.5px; color: #1f2937; margin: 0; }

        .header { border-bottom: 2px solid #9333EA; padding-bottom: 10px; margin-bottom: 16px; }
        .brand { font-size: 15px; font-weight: bold; color: #111827; }
        .doctype { font-size: 9px; color: #9333EA; letter-spacing: 2px;
                   text-transform: uppercase; margin-top: 3px; }
        .title { font-size: 13px; font-weight: bold; color: #111827; margin-top: 6px; }

        h2.section { font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
                     color: #9333EA; border-bottom: 1px solid #e9d5ff;
                     padding-bottom: 3px; margin: 16px 0 8px; }

        table { width: 100%; border-collapse: collapse; }
        table.meta td { padding: 4px 6px; border: 1px solid #e5e7eb; vertical-align: top; }
        table.meta td.k { width: 24%; background: #faf5ff; color: #6b7280; font-size: 9px;
                          text-transform: uppercase; }

        table.list th { background: #f3f4f6; text-align: left; padding: 5px; font-size: 8.5px;
                        text-transform: uppercase; color: #4b5563;
                        border-bottom: 1px solid #d1d5db; }
        table.list td { padding: 5px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
        table.list tr { page-break-inside: avoid; }

        .mono { font-family: "DejaVu Sans Mono", monospace; font-size: 8.5px;
                word-wrap: break-word; color: #374151; }
        .small { font-size: 8.5px; color: #6b7280; }
        .muted { color: #9ca3af; }
        .ok { color: #16a34a; font-weight: bold; }
        .ko { color: #dc2626; font-weight: bold; }
        .wait { color: #d97706; font-weight: bold; }

        .hash-box { border: 1px solid #e5e7eb; background: #f9fafb; padding: 8px 10px; }

        .empty { padding: 10px; border: 1px dashed #d1d5db; color: #9ca3af;
                 text-align: center; font-size: 10px; }

        .notice { margin-top: 16px; border-left: 3px solid #9333EA; background: #faf5ff;
                  padding: 10px 12px; font-size: 9px; color: #4b5563; line-height: 1.6; }

        .footer { position: fixed; bottom: -11mm; left: 0; right: 0;
                  font-size: 8px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>

<div class="footer">
    Certificat de signature electronique — SECRETIS ERP (IBIG Soft) —
    Genere le {{ $generatedAt->format('d/m/Y a H:i:s') }}
</div>

<div class="header">
    <div class="brand">{{ $request->organization->name ?? 'SECRETIS ERP' }}</div>
    <div class="doctype">Certificat de signature electronique</div>
    <div class="title">{{ $request->title ?? 'Demande de signature' }}</div>
</div>

<h2 class="section">Identification de la demande</h2>
<table class="meta">
    <tr>
        <td class="k">Reference</td>
        <td>SIG-{{ $request->id ?? '—' }}</td>
        <td class="k">Statut</td>
        <td>
            @php $st = $request->status ?? null; @endphp
            <span class="{{ $st === 'completed' ? 'ok' : ($st === 'cancelled' || $st === 'declined' ? 'ko' : 'wait') }}">
                {{ $statuses[$st] ?? ($st ?: '—') }}
            </span>
        </td>
    </tr>
    <tr>
        <td class="k">Document</td>
        <td>{{ $request->document->title ?? $request->document->file_name ?? '—' }}</td>
        <td class="k">Fichier</td>
        <td class="small">{{ $request->document->file_name ?? '—' }}</td>
    </tr>
    <tr>
        <td class="k">Mode de signature</td>
        <td>
            {{ ($request->signing_order ?? null) === 'sequential' ? 'Sequentiel' : 'Parallele' }}
        </td>
        <td class="k">Cree le</td>
        <td>
            {{ $request->created_at
                ? \Carbon\Carbon::parse($request->created_at)->format('d/m/Y a H:i')
                : '—' }}
        </td>
    </tr>
    <tr>
        <td class="k">Finalise le</td>
        <td>
            {{ $request->completed_at
                ? \Carbon\Carbon::parse($request->completed_at)->format('d/m/Y a H:i')
                : '—' }}
        </td>
        <td class="k">Expiration</td>
        <td>
            {{ $request->expires_at
                ? \Carbon\Carbon::parse($request->expires_at)->format('d/m/Y a H:i')
                : 'Sans expiration' }}
        </td>
    </tr>
    <tr>
        <td class="k">Demandeur</td>
        <td colspan="3">
            {{ $request->creator->name ?? '—' }}
            @if (!empty($request->creator?->email))
                <span class="small">({{ $request->creator->email }})</span>
            @endif
        </td>
    </tr>
</table>

<h2 class="section">Empreinte du document (integrite)</h2>
<div class="hash-box">
    <div class="small">Algorithme : SHA-256</div>
    <div class="mono">{{ $documentHash ?: 'Empreinte non disponible' }}</div>
</div>

<h2 class="section">Signataires ({{ $signedCount }} / {{ $signers->count() }} ont signe)</h2>
@if ($signers->count() > 0)
    <table class="list">
        <thead>
            <tr>
                <th style="width:5%;">Ordre</th>
                <th style="width:22%;">Nom</th>
                <th style="width:24%;">Adresse e-mail</th>
                <th style="width:13%;">Statut</th>
                <th style="width:19%;">Date de signature</th>
                <th style="width:17%;">Adresse IP</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($signers->sortBy('order') as $i => $s)
                @php $sst = $s->status ?? 'pending'; @endphp
                <tr>
                    <td>{{ $s->order ?? ($i + 1) }}</td>
                    <td>{{ $s->name ?? '—' }}</td>
                    <td class="small">{{ $s->email ?? '—' }}</td>
                    <td class="{{ $sst === 'signed' ? 'ok' : ($sst === 'declined' ? 'ko' : 'wait') }}">
                        {{ $signerStatuses[$sst] ?? $sst }}
                    </td>
                    <td>
                        {{ $s->signed_at
                            ? \Carbon\Carbon::parse($s->signed_at)->format('d/m/Y a H:i:s')
                            : '—' }}
                        @if ($sst === 'declined' && !empty($s->decline_reason))
                            <br><span class="small">Motif : {{ $s->decline_reason }}</span>
                        @endif
                    </td>
                    <td class="mono">{{ $s->ip_address ?: '—' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@else
    <div class="empty">Aucun signataire enregistre sur cette demande.</div>
@endif

<h2 class="section">Journal d'audit ({{ $auditTrail->count() }} evenements)</h2>
@if ($auditTrail->count() > 0)
    <table class="list">
        <thead>
            <tr>
                <th style="width:5%;">#</th>
                <th style="width:19%;">Horodatage</th>
                <th style="width:20%;">Evenement</th>
                <th style="width:24%;">Acteur</th>
                <th style="width:13%;">Adresse IP</th>
                <th style="width:19%;">Details</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($auditTrail as $i => $e)
                @php
                    $data = is_array($e->data ?? null) ? $e->data : [];
                    $details = [];
                    foreach ($data as $k => $v) {
                        if (is_array($v)) { $v = implode(', ', array_map('strval', $v)); }
                        if ($v === null || $v === '') { continue; }
                        $details[] = $k . ' : ' . \Illuminate\Support\Str::limit((string) $v, 60);
                    }
                @endphp
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>
                        {{ $e->created_at
                            ? \Carbon\Carbon::parse($e->created_at)->format('d/m/Y a H:i:s')
                            : '—' }}
                    </td>
                    <td>{{ $events[$e->event_type ?? ''] ?? ($e->event_type ?: '—') }}</td>
                    <td class="small">{{ $e->actor_email ?: 'Systeme' }}</td>
                    <td class="mono">{{ $e->actor_ip ?: '—' }}</td>
                    <td class="small">
                        {{ count($details) ? implode(' | ', $details) : '—' }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
@else
    <div class="empty">Aucun evenement d'audit n'a ete enregistre.</div>
@endif

<div class="notice">
    <strong>Valeur probante.</strong> Ce certificat constitue le dossier de preuve de la
    signature electronique du document identifie ci-dessus. Il recense les signataires,
    les horodatages, les adresses IP de connexion et l'empreinte cryptographique du fichier
    signe. Toute modification ulterieure du document invalide l'empreinte SHA-256 reproduite
    dans ce certificat, ce qui permet d'en detecter l'alteration.
    <br><br>
    Document genere automatiquement par SECRETIS ERP le
    {{ $generatedAt->format('d/m/Y a H:i:s') }} — il ne necessite pas de signature manuscrite.
</div>

</body>
</html>
