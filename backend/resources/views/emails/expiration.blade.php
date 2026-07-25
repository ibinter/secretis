@extends('emails.layout')

@section('content')

<h2 style="color:#dc2626;margin:0 0 14px;">@if($is_trial)Votre essai a expiré @else Votre licence a expiré @endif</h2>
<p>Bonjour {{ $user_name }},</p>
<p>La licence de <strong>{{ $org_name }}</strong> a expiré le <strong>{{ $expired_at }}</strong>.</p>
<p>Une <strong>période de grâce est active jusqu'au {{ $grace_until }}</strong> : votre accès est réduit mais vos données ({{ $user_count }} utilisateur(s)) sont intégralement conservées.</p>
<p>Passé ce délai, l'accès sera suspendu. Réactivez votre compte en quelques clics :</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $app_url }}/login" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Réactiver mon compte</a></td></tr></table>
<p style="color:#6b7280;font-size:13px;">Une question sur nos formules ? Écrivez-nous à <a href="mailto:secretis@ibigsoft.com" style="color:#9333EA;">secretis@ibigsoft.com</a>.</p>

@endsection
