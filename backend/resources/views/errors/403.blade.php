@extends('errors.layout')

@php $errorRef = 'SEC-403-' . strtoupper(substr(md5(uniqid()), 0, 8)); @endphp

@section('error_code', '403')
@section('icon', '🚫')
@section('icon_label', 'Accès refusé')
@section('title', 'Accès refusé')
@section('message', 'Vous n\'avez pas les droits nécessaires pour effectuer cette action. Contactez votre administrateur si vous pensez qu\'il s\'agit d\'une erreur.')
@section('reference', $errorRef)

@section('actions')
    <a class="btn btn-primary" href="{{ url('/dashboard') }}">Retour au tableau de bord</a>
    <a class="btn btn-outline" href="{{ url('/help/tickets/create?subject=Accès refusé&ref=' . $errorRef) }}">
        Créer un ticket avec cette référence
    </a>
    <a class="btn btn-ghost" href="{{ url()->previous() }}">Retour</a>
@endsection
