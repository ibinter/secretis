<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\CustomReport;
use App\Models\User;

/**
 * CustomReportPolicy — Autorisations sur les rapports personnalisés.
 */
class CustomReportPolicy
{
    /**
     * Seul le créateur peut modifier le rapport.
     */
    public function update(User $user, CustomReport $report): bool
    {
        return $user->id === $report->created_by
            && $user->organization_id === $report->organization_id;
    }

    /**
     * Seul le créateur peut supprimer le rapport.
     */
    public function delete(User $user, CustomReport $report): bool
    {
        return $user->id === $report->created_by
            && $user->organization_id === $report->organization_id;
    }
}
