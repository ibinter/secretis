<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\MailRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * QrVerifyController — Authentification QR code des documents SECRETIS
 *
 * Page publique (sans auth) — affiche l'authenticité d'un document ou courrier
 * via son token QR unique.
 */
class QrVerifyController extends Controller
{
    // -------------------------------------------------------------------------
    // Vérification publique — page /verify/{token}
    // -------------------------------------------------------------------------

    public function verify(string $token): \Inertia\Response
    {
        // Chercher dans documents
        $document = Document::where('qr_token', $token)
            ->whereNull('deleted_at')
            ->with(['author:id,name', 'organization:id,name'])
            ->first();

        if ($document) {
            return Inertia::render('QrVerify', [
                'valid'  => true,
                'type'   => 'document',
                'data'   => [
                    'title'        => $document->title,
                    'reference'    => 'DOC-' . strtoupper(substr($document->id, 0, 8)),
                    'author'       => $document->author?->name ?? 'Inconnu',
                    'organization' => $document->organization?->name ?? '',
                    'created_at'   => $document->created_at?->format('d/m/Y'),
                    'status'       => $document->status ?? 'actif',
                    'access_level' => $document->access_level,
                ],
            ]);
        }

        // Chercher dans courrier
        $mail = MailRegistry::where('qr_token', $token)
            ->whereNull('deleted_at')
            ->with(['organization:id,name'])
            ->first();

        if ($mail) {
            return Inertia::render('QrVerify', [
                'valid' => true,
                'type'  => 'courrier',
                'data'  => [
                    'title'        => $mail->subject,
                    'reference'    => $mail->reference ?? 'N/A',
                    'author'       => $mail->sender_name ?? 'Inconnu',
                    'organization' => $mail->organization?->name ?? '',
                    'created_at'   => $mail->created_at?->format('d/m/Y'),
                    'status'       => $mail->status ?? 'actif',
                    'type_label'   => $mail->type === 'incoming' ? 'Courrier entrant' : 'Courrier sortant',
                ],
            ]);
        }

        // Token invalide
        return Inertia::render('QrVerify', [
            'valid' => false,
            'type'  => null,
            'data'  => null,
        ]);
    }

    // -------------------------------------------------------------------------
    // Génération token — appelé par les contrôleurs lors d'une création
    // -------------------------------------------------------------------------

    public static function ensureToken(Document|MailRegistry $model): void
    {
        if (empty($model->qr_token)) {
            $model->updateQuietly(['qr_token' => Str::random(32)]);
        }
    }

    // -------------------------------------------------------------------------
    // API — retourne les infos QR pour un document (auth requise)
    // -------------------------------------------------------------------------

    public function documentQr(string $id): \Illuminate\Http\JsonResponse
    {
        $document = Document::where('id', $id)
            ->where('organization_id', auth()->user()->organization_id)
            ->firstOrFail();

        if (empty($document->qr_token)) {
            $document->updateQuietly(['qr_token' => Str::random(32)]);
            $document->refresh();
        }

        $verifyUrl = url('/verify/' . $document->qr_token);

        return response()->json([
            'qr_token'   => $document->qr_token,
            'verify_url' => $verifyUrl,
        ]);
    }

    // -------------------------------------------------------------------------
    // API — retourne les infos QR pour un courrier (auth requise)
    // -------------------------------------------------------------------------

    public function courrierQr(string $id): \Illuminate\Http\JsonResponse
    {
        $mail = MailRegistry::where('id', $id)
            ->where('organization_id', auth()->user()->organization_id)
            ->firstOrFail();

        if (empty($mail->qr_token)) {
            $mail->updateQuietly(['qr_token' => Str::random(32)]);
            $mail->refresh();
        }

        $verifyUrl = url('/verify/' . $mail->qr_token);

        return response()->json([
            'qr_token'   => $mail->qr_token,
            'verify_url' => $verifyUrl,
        ]);
    }
}
