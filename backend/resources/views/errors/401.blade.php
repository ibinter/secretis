@extends('errors.layout')

@section('error_code', '401')
@section('icon', '🔐')
@section('icon_label', 'Accès non autorisé')
@section('title', 'Accès non autorisé')
@section('message', 'Vous devez être connecté pour accéder à cette page. Veuillez vous identifier pour continuer.')

@section('actions')
    <a class="btn btn-primary" href="{{ route('login') }}">Se connecter</a>
    <a class="btn btn-ghost" href="{{ url('/') }}">Retour à l'accueil</a>
@endsection
