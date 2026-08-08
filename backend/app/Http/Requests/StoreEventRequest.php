<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * StoreEventRequest — Validation de la création d'un événement agenda
 *
 * Règles métier :
 * - start_at doit être inférieur à end_at
 * - Les participants doivent appartenir à la même organisation
 * - Le recurrence_rule doit être au format RRULE iCalendar si fourni
 * - La room_id doit exister et appartenir à l'organisation
 */
class StoreEventRequest extends FormRequest
{
    /**
     * Autorisation : l'utilisateur doit avoir la permission agenda.create.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionForModule('agenda', 'create') ?? false;
    }

    public function rules(): array
    {
        $organizationId = $this->user()->organization_id;

        return [
            // --- Champs obligatoires ---
            'title'            => ['required', 'string', 'max:255'],
            'start_at'         => ['required', 'date'],
            'end_at'           => ['required', 'date', 'after_or_equal:start_at'],

            // --- Champs optionnels ---
            'description'      => ['nullable', 'string', 'max:5000'],
            'location'         => ['nullable', 'string', 'max:500'],
            'is_all_day'       => ['boolean'],
            'color'            => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'type'             => ['nullable', Rule::in(['meeting', 'task', 'reminder', 'holiday', 'other'])],
            'meet_link'        => ['nullable', 'url', 'max:500'],
            'calendar_id'      => [
                'nullable',
                Rule::exists('calendars', 'id')
                    ->where('organization_id', $organizationId),
            ],

            // --- Récurrence RRULE ---
            'recurrence_rule'  => [
                'nullable',
                'string',
                'max:500',
                // Validation format RRULE : doit contenir FREQ=
                'regex:/^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/',
            ],

            // --- Participants ---
            'participants'     => ['nullable', 'array'],
            'participants.*'   => [
                'uuid',
                Rule::exists('users', 'id')
                    ->where('organization_id', $organizationId),
            ],

            // --- Réservation salle ---
            'room_id'          => [
                'nullable',
                Rule::exists('rooms', 'id')
                    ->where('organization_id', $organizationId)
                    ->where('is_active', true),
            ],

            // --- Rappels ---
            'reminders'              => ['nullable', 'array', 'max:5'],
            'reminders.*.minutes'    => ['required_with:reminders', 'integer', 'min:0', 'max:10080'], // max 1 semaine
            'reminders.*.channel'    => ['required_with:reminders', Rule::in(['app', 'email', 'sms', 'whatsapp'])],
        ];
    }

    /**
     * Validation personnalisée après les règles de base.
     * Vérifie la cohérence métier (ex : durée min pour événements non-all-day).
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $startAt  = $this->input('start_at');
            $endAt    = $this->input('end_at');
            $isAllDay = $this->boolean('is_all_day');

            if ($startAt && $endAt && ! $isAllDay) {
                $start    = \Carbon\Carbon::parse($startAt);
                $end      = \Carbon\Carbon::parse($endAt);
                $duration = $start->diffInMinutes($end);

                // Durée minimum 5 minutes pour les événements non-all-day
                if ($duration < 5) {
                    $validator->errors()->add(
                        'end_at',
                        'La durée minimale d\'un événement est de 5 minutes.'
                    );
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'title.required'          => 'Le titre de l\'événement est obligatoire.',
            'start_at.required'       => 'La date de début est obligatoire.',
            'end_at.required'         => 'La date de fin est obligatoire.',
            'end_at.after_or_equal'   => 'La date de fin doit être postérieure à la date de début.',
            'color.regex'             => 'La couleur doit être un code hexadécimal valide (ex : #3B82F6).',
            'recurrence_rule.regex'   => 'La règle de récurrence doit être au format RRULE iCalendar (ex : FREQ=WEEKLY;BYDAY=MO).',
            'participants.*.uuid'     => 'Chaque participant doit être identifié par un UUID valide.',
            'participants.*.exists'   => 'Un ou plusieurs participants n\'appartiennent pas à votre organisation.',
            'room_id.exists'          => 'La salle sélectionnée n\'existe pas ou n\'est pas active.',
            'reminders.max'           => 'Vous ne pouvez configurer au maximum que 5 rappels.',
            'reminders.*.minutes.max' => 'Un rappel ne peut pas être configuré plus d\'une semaine à l\'avance.',
        ];
    }

    /**
     * Préparation des données avant validation.
     * Normalise les valeurs pour éviter les erreurs de casse.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('type')) {
            $this->merge(['type' => strtolower($this->input('type'))]);
        }
    }
}
