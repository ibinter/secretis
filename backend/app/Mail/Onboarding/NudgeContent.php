<?php

declare(strict_types=1);

namespace App\Mail\Onboarding;

use App\Models\User;

/**
 * Fabrique le corps HTML commun aux relances d'onboarding (J+1, J+3, J+7).
 *
 * Aucune vue Blade d'onboarding n'existe dans resources/views/emails/ :
 * le HTML est généré ici et injecté via Content::htmlString.
 */
final class NudgeContent
{
    /**
     * @param array<string, mixed> $progress OnboardingService::getProgress()
     */
    public static function render(
        string $title,
        string $intro,
        User   $admin,
        array  $progress = [],
    ): string {
        $percent  = (int) ($progress['percent'] ?? 0);
        $nextStep = $progress['nextStep'] ?? null;

        $nextLabel = null;
        if (is_array($nextStep)) {
            $nextLabel = $nextStep['label'] ?? ($nextStep['key'] ?? null);
        } elseif (is_object($nextStep)) {
            $nextLabel = $nextStep->label ?? ($nextStep->step_key ?? null);
        } elseif (is_string($nextStep)) {
            $nextLabel = $nextStep;
        }

        $pending = '';
        foreach ((array) ($progress['steps'] ?? []) as $step) {
            if (($step['status'] ?? 'pending') === 'pending') {
                $pending .= '<li>' . e((string) ($step['label'] ?? $step['key'] ?? '')) . '</li>';
            }
        }

        return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
             . '<h2 style="color:#2E86C1;margin:0 0 12px">' . e($title) . '</h2>'
             . '<p>Bonjour ' . e((string) $admin->name) . ',</p>'
             . '<p>' . e($intro) . '</p>'
             . '<p><strong>Progression : ' . e((string) $percent) . ' %</strong>'
             . ($nextLabel ? ' — prochaine étape : ' . e((string) $nextLabel) : '')
             . '</p>'
             . ($pending !== '' ? '<h3 style="margin:18px 0 6px">Étapes restantes</h3><ul>' . $pending . '</ul>' : '')
             . '<p style="margin-top:16px"><a href="' . e((string) config('app.url')) . '/onboarding" '
             . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
             . 'Reprendre la configuration</a></p>'
             . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — message automatique.</p>'
             . '</div>';
    }
}
