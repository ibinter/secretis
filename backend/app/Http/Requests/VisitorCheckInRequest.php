<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * VisitorCheckInRequest — enregistrement de l'arrivée d'un visiteur.
 *
 * Cette classe était référencée (import + type-hint) par VisitorController::checkIn()
 * et ::apiCheckin() mais n'existait pas → « Class not found » = 500 sur la fonction
 * centrale de la réception. Champs alignés sur les colonnes réelles de `visitors`
 * (first_name / last_name, pas full_name) et de `visitor_logs`.
 */
class VisitorCheckInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'first_name'    => ['required', 'string', 'max:150'],
            'last_name'     => ['required', 'string', 'max:150'],
            'email'         => ['nullable', 'email', 'max:255'],
            'phone'         => ['nullable', 'string', 'max:30'],
            'company'       => ['nullable', 'string', 'max:255'],
            'id_type'       => ['nullable', 'string', 'max:50'],
            'id_number'     => ['nullable', 'string', 'max:100'],
            'photo_path'    => ['nullable', 'string', 'max:255'],

            'host_id'       => ['required', 'integer', 'exists:users,id'],
            'purpose'       => ['nullable', 'string', 'max:255'],
            'vehicle_plate' => ['nullable', 'string', 'max:30'],
            'notes'         => ['nullable', 'string', 'max:2000'],
            'appointment_id'=> ['nullable', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.required' => 'Le prénom du visiteur est obligatoire.',
            'last_name.required'  => 'Le nom du visiteur est obligatoire.',
            'host_id.required'    => 'Veuillez indiquer la personne visitée.',
            'host_id.exists'      => 'La personne visitée est introuvable.',
        ];
    }
}
