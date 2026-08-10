<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #1f2937; background: #f9fafb; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.08); }
        .header  { background: #7c3aed; padding: 24px 32px; }
        .header h1 { color: #fff; margin: 0; font-size: 20px; }
        .header p  { color: #ddd6fe; margin: 4px 0 0; font-size: 13px; }
        .body    { padding: 32px; }
        .field   { margin-bottom: 16px; }
        .label   { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
        .value   { font-size: 15px; color: #111827; margin-top: 2px; }
        .footer  { padding: 20px 32px; background: #f3f4f6; font-size: 12px; color: #9ca3af; text-align: center; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>Convocation à une réunion</h1>
        <p>SECRETIS ERP — {{ $meeting->organization?->name }}</p>
    </div>
    <div class="body">
        <p>Bonjour <strong>{{ $recipient->name }}</strong>,</p>
        <p>Vous êtes convoqué(e) à la réunion suivante :</p>
        <hr>
        <div class="field">
            <div class="label">Objet</div>
            <div class="value">{{ $meeting->title }}</div>
        </div>
        <div class="field">
            <div class="label">Type</div>
            <div class="value">{{ ucfirst($meeting->meeting_type) }}</div>
        </div>
        <div class="field">
            <div class="label">Date &amp; Heure</div>
            <div class="value">{{ \Carbon\Carbon::parse($meeting->scheduled_at)->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH[h]mm') }}</div>
        </div>
        <div class="field">
            <div class="label">Durée</div>
            <div class="value">{{ $meeting->duration_minutes }} minutes</div>
        </div>
        <div class="field">
            <div class="label">Lieu</div>
            <div class="value">{{ $meeting->location }}</div>
        </div>
        @if($meeting->description)
        <div class="field">
            <div class="label">Description</div>
            <div class="value">{{ $meeting->description }}</div>
        </div>
        @endif
        @if(!empty($meeting->agenda_items))
        <hr>
        <div class="label">Ordre du jour</div>
        <ol style="margin-top:8px;padding-left:20px;">
            @foreach($meeting->agenda_items as $item)
                <li style="margin-bottom:6px;">
                    <strong>{{ $item['title'] }}</strong>
                    @if(!empty($item['duration_min'])) <em style="color:#6b7280">({{ $item['duration_min'] }} min)</em>@endif
                    @if(!empty($item['description'])) <br><span style="font-size:13px;color:#6b7280">{{ $item['description'] }}</span>@endif
                </li>
            @endforeach
        </ol>
        @endif
        <hr>
        <p style="font-size:13px;color:#6b7280;">Merci de confirmer votre présence.</p>
    </div>
    <div class="footer">SECRETIS ERP · Ce message est généré automatiquement.</div>
</div>
</body>
</html>
