<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationApiController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $notifs = $r->user()?->notifications ?? collect([]);
        return response()->json(['data' => $notifs]);
    }
    public function unread(Request $r): JsonResponse
    {
        $count = $r->user()?->unreadNotifications()->count() ?? 0;
        return response()->json(['count' => $count, 'data' => []]);
    }
    public function markRead(Request $r, $id): JsonResponse
    {
        $r->user()?->notifications()->where('id', $id)->update(['read_at' => now()]);
        return response()->json(['success' => true]);
    }
    public function markAllRead(Request $r): JsonResponse
    {
        $r->user()?->unreadNotifications->markAsRead();
        return response()->json(['success' => true]);
    }
    public function destroy(Request $r, $id): JsonResponse
    {
        $r->user()?->notifications()->where('id', $id)->delete();
        return response()->json(['success' => true]);
    }
    public function preferences(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
    public function updatePreferences(Request $r): JsonResponse
    {
        return response()->json(['success' => true]);
    }
}
