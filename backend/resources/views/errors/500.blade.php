@extends('errors.layout')

@php
    $errorId = $errorId ?? 'ERR-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 10));
    // Loggue la référence pour traçabilité
    if (app()->bound('log')) {
        app('log')->error('500 Error page displayed', ['error_id' => $errorId]);
    }
@endphp

@section('error_code', '500')
@section('icon', '⚙️')
@section('icon_label', 'Erreur interne')
@section('title', 'Erreur interne du serveur')
@section('message', 'Une erreur inattendue s\'est produite. Notre équipe a été notifiée automatiquement et travaille à la résolution.')
@section('reference', $errorId)

@section('actions')
    <a class="btn btn-primary"
       href="{{ url('/help/tickets/create?subject=Erreur serveur&ref=' . $errorId) }}">
        Créer un ticket (réf. {{ $errorId }})
    </a>
    <a class="btn btn-ghost" href="{{ url('/dashboard') }}">Retour au tableau de bord</a>
@endsection
