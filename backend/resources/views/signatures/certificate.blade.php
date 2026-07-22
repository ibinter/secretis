<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <title>Certificat de Signature — {{ $request->title }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10pt;
            color: #1E293B;
            background: white;
        }

        /* ── Page layout ── */
        .page { padding: 2cm; }

        /* ── En-tête ── */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #1E3A5F;
            padding-bottom: 1rem;
            margin-bottom: 1.5rem;
        }
        .header-left h1 {
            font-size: 18pt;
            color: #1E3A5F;
            font-weight: bold;
            letter-spacing: .5px;
        }
        .header-left p {
            font-size: 9pt;
            color: #64748B;
            margin-top: .25rem;
        }
        .header-right {
            text-align: right;
        }
        .header-right .badge-secretis {
            display: inline-block;
            background: #1E3A5F;
            color: white;
            font-size: 8pt;
            font-weight: bold;
            padding: .3rem .7rem;
            border-radius: 4px;
            letter-spacing: 1px;
        }
        .header-right .cert-number {
            font-size: 8pt;
            color: #64748B;
            margin-top: .3rem;
        }

        /* ── Section document ── */
        .section {
            margin-bottom: 1.5rem;
        }
        .section-title {
            font-size: 11pt;
            font-weight: bold;
            color: #1E3A5F;
            border-left: 4px solid #2563EB;
            padding-left: .5rem;
            margin-bottom: .75rem;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 160px 1fr;
            gap: .3rem 1rem;
        }
        .info-label {
            font-weight: bold;
            color: #64748B;
            font-size: 9pt;
        }
        .info-value {
            color: #1E293B;
            font-size: 9pt;
        }

        /* Hash */
        .hash-box {
            background: #F1F5F9;
            border: 1px solid #E2E8F0;
            border-radius: 4px;
            padding: .5rem .75rem;
            font-family: 'Courier New', monospace;
            font-size: 8pt;
            word-break: break-all;
            color: #0F172A;
            margin-top: .5rem;
        }

        /* ── Tableau signataires ── */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
        }
        thead th {
            background: #1E3A5F;
            color: white;
            padding: .5rem .75rem;
            text-align: left;
            font-weight: 600;
        }
        tbody tr:nth-child(even) { background: #F8FAFC; }
        tbody td {
            padding: .45rem .75rem;
            border-bottom: 1px solid #E2E8F0;
            vertical-align: top;
        }
        .status-signed   { color: #16A34A; font-weight: bold; }
        .status-declined { color: #DC2626; font-weight: bold; }
        .status-pending  { color: #D97706; }

        /* ── Piste d'audit ── */
        .audit-list { list-style: none; }
        .audit-item {
            display: flex;
            gap: .75rem;
            padding: .35rem 0;
            border-bottom: 1px solid #F1F5F9;
            font-size: 8.5pt;
        }
        .audit-time {
            color: #64748B;
            min-width: 130px;
            flex-shrink: 0;
        }
        .audit-event {
            font-weight: 600;
            min-width: 100px;
            flex-shrink: 0;
        }
        .audit-actor { color: #475569; }

        /* Event colors */
        .ev-created   { color: #2563EB; }
        .ev-sent      { color: #7C3AED; }
        .ev-signed    { color: #16A34A; }
        .ev-declined  { color: #DC2626; }
        .ev-completed { color: #059669; }
        .ev-cancelled { color: #9F1239; }
        .ev-reminder  { color: #D97706; }

        /* ── Cachet officiel ── */
        .stamp-area {
            text-align: center;
            margin: 1.5rem 0;
        }
        .stamp {
            display: inline-block;
            border: 3px solid #1E3A5F;
            border-radius: 50%;
            width: 110px;
            height: 110px;
            line-height: 1.2;
            text-align: center;
            padding: 15px 10px;
            position: relative;
        }
        .stamp-inner {
            border: 1px dashed #1E3A5F;
            border-radius: 50%;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .stamp-top    { font-size: 7pt; font-weight: bold; color: #1E3A5F; letter-spacing: 1px; }
        .stamp-middle { font-size: 8pt; font-weight: bold; color: #1E3A5F; margin: 3px 0; }
        .stamp-bottom { font-size: 6pt; color: #64748B; }

        /* ── Pied de page ── */
        .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #E2E8F0;
            font-size: 7.5pt;
            color: #94A3B8;
            line-height: 1.6;
        }
        .footer-legal {
            background: #EFF6FF;
            border: 1px solid #BFDBFE;
            border-radius: 4px;
            padding: .6rem .9rem;
            margin-bottom: .5rem;
            font-size: 8pt;
            color: #1E40AF;
            font-style: italic;
        }

        /* ── Page break ── */
        .page-break { page-break-before: always; }
    </style>
</head>
<body>
<div class="page">

    <!-- ── En-tête ── -->
    <div class="header">
        <div class="header-left">
            <h1>CERTIFICAT DE SIGNATURE ÉLECTRONIQUE</h1>
            <p>Document généré automatiquement par SECRETIS ERP</p>
            <p>Date de génération : {{ $generatedAt->format('d/m/Y à H:i:s') }} UTC</p>
        </div>
        <div class="header-right">
            <div class="badge-secretis">SECRETIS</div>
            <div class="cert-number">Certificat N° CERT-{{ str_pad($request->id, 8, '0', STR_PAD_LEFT) }}</div>
        </div>
    </div>

    <!-- ── Informations du document ── -->
    <div class="section">
        <div class="section-title">Informations du document</div>
        <div class="info-grid">
            <span class="info-label">Titre</span>
            <span class="info-value">{{ $request->title }}</span>

            <span class="info-label">Document</span>
            <span class="info-value">{{ $request->document->title ?? 'N/A' }}</span>

            <span class="info-label">Fichier</span>
            <span class="info-value">{{ $request->document->file_name ?? 'N/A' }}</span>

            <span class="info-label">Statut</span>
            <span class="info-value">
                @php
                    $statusLabels = [
                        'completed'        => 'Complété — tous les signataires ont signé',
                        'partially_signed' => 'Partiellement signé',
                        'cancelled'        => 'Annulé',
                        'expired'          => 'Expiré',
                    ];
                @endphp
                {{ $statusLabels[$request->status] ?? ucfirst($request->status) }}
            </span>

            <span class="info-label">Ordre de signature</span>
            <span class="info-value">
                {{ $request->signing_order === 'sequential' ? 'Séquentiel' : 'Parallèle' }}
            </span>

            <span class="info-label">Complété le</span>
            <span class="info-value">
                {{ $request->completed_at ? \Carbon\Carbon::parse($request->completed_at)->format('d/m/Y H:i:s') : '—' }}
            </span>

            <span class="info-label">Demande créée par</span>
            <span class="info-value">{{ $request->creator->name ?? 'N/A' }}</span>
        </div>

        <!-- Hash SHA-256 du document -->
        <div style="margin-top:.75rem">
            <div class="info-label" style="margin-bottom:.3rem">Empreinte SHA-256 du document original</div>
            <div class="hash-box">{{ $documentHash }}</div>
        </div>
    </div>

    <!-- ── Tableau des signataires ── -->
    <div class="section">
        <div class="section-title">Signataires</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Statut</th>
                    <th>Date / Heure</th>
                    <th>Adresse IP</th>
                </tr>
            </thead>
            <tbody>
                @foreach($request->signers->sortBy('order') as $signer)
                <tr>
                    <td>{{ $signer->order }}</td>
                    <td><strong>{{ $signer->name }}</strong></td>
                    <td>{{ $signer->email }}</td>
                    <td>
                        @if($signer->status === 'signed')
                            <span class="status-signed">✓ Signé</span>
                        @elseif($signer->status === 'declined')
                            <span class="status-declined">✗ Refusé</span>
                            @if($signer->decline_reason)
                                <br><small style="color:#64748B">{{ Str::limit($signer->decline_reason, 60) }}</small>
                            @endif
                        @else
                            <span class="status-pending">En attente</span>
                        @endif
                    </td>
                    <td>{{ $signer->signed_at ? \Carbon\Carbon::parse($signer->signed_at)->format('d/m/Y H:i:s') : '—' }}</td>
                    <td style="font-family:monospace;font-size:8pt">{{ $signer->ip_address ?? '—' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <!-- ── Piste d'audit ── -->
    <div class="section">
        <div class="section-title">Piste d'audit horodatée</div>
        <ul class="audit-list">
            @php
            $eventLabels = [
                'created'       => ['label' => 'Demande créée',    'class' => 'ev-created'],
                'sent'          => ['label' => 'Invitation envoyée','class' => 'ev-sent'],
                'viewed'        => ['label' => 'Document consulté', 'class' => 'ev-sent'],
                'signed'        => ['label' => 'Signé',             'class' => 'ev-signed'],
                'declined'      => ['label' => 'Refusé',            'class' => 'ev-declined'],
                'completed'     => ['label' => 'Complété',          'class' => 'ev-completed'],
                'cancelled'     => ['label' => 'Annulé',            'class' => 'ev-cancelled'],
                'reminder_sent' => ['label' => 'Rappel envoyé',     'class' => 'ev-reminder'],
            ];
            @endphp
            @foreach($auditTrail as $event)
            @php
                $ev = $eventLabels[$event->event_type] ?? ['label' => $event->event_type, 'class' => ''];
            @endphp
            <li class="audit-item">
                <span class="audit-time">{{ \Carbon\Carbon::parse($event->created_at)->format('d/m/Y H:i:s') }}</span>
                <span class="audit-event {{ $ev['class'] }}">{{ $ev['label'] }}</span>
                <span class="audit-actor">
                    @if($event->actor_email) {{ $event->actor_email }} @endif
                    @if($event->actor_ip) · IP {{ $event->actor_ip }} @endif
                    @if(!empty($event->data['signer_name'])) · {{ $event->data['signer_name'] }} @endif
                </span>
            </li>
            @endforeach
        </ul>
    </div>

    <!-- ── Cachet officiel ── -->
    <div class="stamp-area">
        <div class="stamp">
            <div class="stamp-inner">
                <div class="stamp-top">SECRETIS ERP</div>
                <div class="stamp-middle">CERTIFIÉ</div>
                <div class="stamp-bottom">
                    {{ $generatedAt->format('d/m/Y') }}<br>
                    SIGNATURE ÉLECTRONIQUE
                </div>
            </div>
        </div>
    </div>

    <!-- ── Mention légale ── -->
    <div class="footer">
        <div class="footer-legal">
            Ce document a valeur probante conformément à la loi n°2013-546 relative aux transactions électroniques
            en République de Côte d'Ivoire, et aux dispositions équivalentes dans les États membres de l'UEMOA.
            La signature électronique recueillie via SECRETIS ERP est opposable aux signataires.
        </div>
        <p>
            Certificat émis par <strong>IBIG SECRETIS</strong> — Plateforme de gestion documentaire sécurisée.
            L'intégrité de ce certificat peut être vérifiée sur la plateforme SECRETIS à l'aide du hash SHA-256 du document.
            Référence : CERT-{{ str_pad($request->id, 8, '0', STR_PAD_LEFT) }} | Généré le {{ $generatedAt->format('d/m/Y à H:i:s') }}.
        </p>
    </div>

</div>
</body>
</html>
