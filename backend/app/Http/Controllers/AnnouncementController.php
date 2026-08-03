<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\AnnouncementDismissal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    public function board(): Response
    {
        $user = Auth::user();

        $announcements = Announcement::currentlyVisible()
            ->forUser($user)
            ->with('creator:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Announcement $a) use ($user) {
                $dismissed = AnnouncementDismissal::where('announcement_id', $a->id)
                    ->where('user_id', $user->id)
                    ->exists();

                return [
                    'id'             => $a->id,
                    'title'          => $a->getTitle('fr'),
                    'message'        => $a->getMessage('fr'),
                    'type'           => $a->type,
                    'color'          => $a->color,
                    'display'        => $a->display,
                    'cta_label'      => $a->cta_label,
                    'cta_url'        => $a->cta_url,
                    'is_dismissible' => $a->is_dismissible,
                    'is_dismissed'   => $dismissed,
                    'starts_at'      => $a->starts_at?->toIso8601String(),
                    'ends_at'        => $a->ends_at?->toIso8601String(),
                    'created_by'     => $a->creator?->only(['id', 'name']),
                ];
            });

        return Inertia::render('Communication/TableauAffichage', [
            'announcements' => $announcements,
        ]);
    }

    public function dismiss(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();

        $announcement = Announcement::where('id', $id)
            ->where('is_dismissible', true)
            ->firstOrFail();

        AnnouncementDismissal::firstOrCreate(
            ['announcement_id' => $announcement->id, 'user_id' => $user->id],
            ['dismissed_at'    => now()],
        );

        return response()->json(['message' => 'Annonce fermée.']);
    }
}
