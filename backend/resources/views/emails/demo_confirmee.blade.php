@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Votre démonstration est confirmée 📅</h2>
<p>Bonjour {{ $contact_name }},</p>
<p>Merci pour votre intérêt pour SECRETIS ERP ! Votre demande de démonstration a bien été enregistrée.</p>
<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;line-height:1.9;">
  <strong>Référence :</strong> {{ $demo_reference }}<br>
  <strong>Société :</strong> {{ $company_name }}<br>
  <strong>Date souhaitée :</strong> {{ $preferred_date }}
</td></tr></table>
<p>Un membre de l'équipe IBIG Soft vous contactera pour confirmer le créneau et préparer une démonstration adaptée à vos besoins.</p>
<p style="color:#6b7280;font-size:13px;">En attendant, découvrez la solution sur <a href="https://secretis.ibigsoft.com" style="color:#9333EA;">secretis.ibigsoft.com</a>.</p>

@endsection
