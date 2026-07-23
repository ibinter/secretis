@extends('errors.layout')

@section('error_code', '404')
@section('icon', '🔍')
@section('icon_label', 'Page introuvable')
@section('title', 'Page introuvable')
@section('message', 'La page que vous recherchez n\'existe pas ou a été déplacée. Vérifiez l\'adresse saisie ou utilisez l\'une des sections ci-dessous.')

@section('actions')
    <a class="btn btn-primary" href="{{ url('/') }}">Retour à l'accueil</a>
    <a class="btn btn-ghost" href="{{ url()->previous() }}">Retour</a>
@endsection

@section('suggestions')
    <a href="{{ url('/dashboard') }}">Tableau de bord</a>
    <a href="{{ url('/agenda') }}">Agenda</a>
    <a href="{{ url('/ged') }}">Documents</a>
    <a href="{{ url('/taches') }}">Tâches</a>
    <a href="{{ url('/help') }}">Aide</a>
@endsection
