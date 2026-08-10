@extends('emails.layout')

{{--
    Gabarit générique de TOUTES les notifications métier envoyées par email
    (`NotificationService::send` → `sendEmail($user, 'notifications.generic', …)`).
    Son absence rendait muet l'ensemble du canal email : l'exception était
    avalée par le `catch` de `sendEmail`, sans aucun signe côté utilisateur.

    Variables : title, body, type, data (tableau), userName.
--}}

@php
    // Un libellé et une couleur par famille de notification : l'email doit se
    // reconnaître d'un coup d'œil dans une boîte de réception chargée.
    $familles = [
        'visitor_arrived'  => ['Réception',   '#0E9F6E'],
        'mail_urgent'      => ['Courrier',    '#DC2626'],
        'task_overdue'     => ['Tâche',       '#DC2626'],
        'task_assigned'    => ['Tâche',       '#9333EA'],
        'meeting_reminder' => ['Réunion',     '#2563EB'],
        'message'          => ['Message',     '#9333EA'],
        'circular'         => ['Note de service', '#6B7280'],
        'event_created'    => ['Agenda',      '#2563EB'],
        'stock_alert'      => ['Stock',       '#D97706'],
        'birthday'         => ['Anniversaire','#DB2777'],
        'digest'           => ['Récapitulatif','#6B7280'],
        'system'           => ['Système',     '#6B7280'],
    ];

    [$famille, $couleur] = $familles[$type ?? 'system'] ?? ['Notification', '#9333EA'];

    $appUrl = rtrim(config('app.url', 'https://secretis.ibigsoft.com'), '/');
    $lien   = $data['action_url'] ?? null;
    $lien   = $lien ? (str_starts_with($lien, 'http') ? $lien : $appUrl . '/' . ltrim($lien, '/')) : null;
@endphp

@section('content')

<div style="display:inline-block;padding:4px 12px;border-radius:999px;background:{{ $couleur }}1a;color:{{ $couleur }};font-size:12px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;">{{ $famille }}</div>

<h2 style="color:#111827;margin:14px 0 12px;font-size:20px;line-height:1.35;">{{ $title }}</h2>

<p style="margin:0 0 16px;">Bonjour {{ $userName ?? '' }},</p>

<table role="presentation" width="100%" style="background:#faf5ff;border-left:3px solid {{ $couleur }};border-radius:6px;margin:0 0 20px;">
  <tr><td style="padding:16px 20px;font-size:15px;color:#1f2937;line-height:1.6;">{!! nl2br(e($body)) !!}</td></tr>
</table>

@if(!empty($data['due_date']) || !empty($data['priority']))
<table role="presentation" width="100%" style="margin:0 0 20px;font-size:14px;color:#4b5563;">
  @if(!empty($data['priority']))
  <tr><td style="padding:3px 0;width:130px;color:#6b7280;">Priorité</td><td style="padding:3px 0;font-weight:bold;">{{ ucfirst($data['priority']) }}</td></tr>
  @endif
  @if(!empty($data['due_date']))
  <tr><td style="padding:3px 0;color:#6b7280;">Échéance</td><td style="padding:3px 0;font-weight:bold;">{{ $data['due_date'] }}</td></tr>
  @endif
</table>
@endif

@if($lien)
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:{{ $couleur }};border-radius:8px;">
  <a href="{{ $lien }}" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Ouvrir dans SECRETIS</a>
</td></tr></table>
@else
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:{{ $couleur }};border-radius:8px;">
  <a href="{{ $appUrl }}/notifications" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Voir mes notifications</a>
</td></tr></table>
@endif

<p style="font-size:13px;color:#6b7280;margin:20px 0 0;">Vous pouvez régler la fréquence et les canaux de ces alertes depuis <em>Paramètres → Notifications</em>.</p>

@endsection
