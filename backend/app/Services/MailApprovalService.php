<?php

namespace App\Services;

use App\Models\MailRegistry;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Parapheur — circuit de visa d'un courrier avant son départ.
 *
 * Règles du circuit, toutes délibérées :
 *
 *  - **Séquentiel.** Une seule étape est « à viser » à un instant donné. Le
 *    chef de service vise avant le directeur, pas en même temps.
 *  - **Un refus arrête tout.** Les étapes suivantes passent en `skipped` :
 *    elles n'ont pas été « oubliées », elles n'ont plus lieu d'être. La nuance
 *    compte pour qui relit le circuit six mois plus tard.
 *  - **Un renvoi pour correction arrête aussi**, mais dit autre chose : le
 *    texte doit être repris, pas abandonné.
 *  - **Rien n'est effacé.** Resoumettre un courrier crée un NOUVEAU circuit ;
 *    l'ancien reste lisible. Un parapheur est une pièce de traçabilité.
 */
class MailApprovalService
{
    public function __construct(private CourrierService $courrier) {}

    /**
     * Soumet un courrier au visa.
     *
     * @param  array<int, array{user_id:int, role?:string}> $approbateurs Dans l'ordre hiérarchique.
     */
    public function soumettre(MailRegistry $mail, array $approbateurs, User $auteur): void
    {
        if (empty($approbateurs)) {
            throw new \InvalidArgumentException('Indiquez au moins un viseur.');
        }

        if ($this->circuitEnCours($mail)) {
            throw new \RuntimeException(
                'Ce courrier est déjà au parapheur. Attendez la décision en cours, '
                . 'ou faites-la trancher avant de resoumettre.'
            );
        }

        DB::transaction(function () use ($mail, $approbateurs, $auteur) {
            // Un nouveau circuit repart du rang 1 : on décale au-delà du
            // dernier rang utilisé pour que l'historique reste ordonné.
            $depart = (int) DB::table('mail_approvals')->where('mail_id', $mail->id)->max('step_order');

            foreach (array_values($approbateurs) as $i => $a) {
                DB::table('mail_approvals')->insert([
                    'organization_id' => $mail->organization_id,
                    'mail_id'      => $mail->id,
                    'step_order'   => $depart + $i + 1,
                    'approver_id'  => $a['user_id'],
                    // Figé à la soumission : un changement de poste ultérieur
                    // ne doit pas réécrire l'histoire du visa.
                    'approver_role'=> $a['role'] ?? null,
                    'status'       => $i === 0 ? 'in_progress' : 'pending',
                    'submitted_by' => $auteur->id,
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]);
            }
        });

        // ⚠️ HORS transaction, délibérément. Sous PostgreSQL, une écriture qui
        // échoue DANS une transaction l'avorte : le `catch` de `tracer()`
        // masquait l'erreur, mais le COMMIT devenait un ROLLBACK et le circuit
        // entier disparaissait sans un mot. Un échec d'historique ne doit
        // jamais annuler un visa.
        $this->tracer($mail, $auteur, 'submitted_for_approval',
            'Soumis au parapheur — ' . count($approbateurs) . ' viseur(s)');

        $this->prevenir($mail, $this->etapeCourante($mail));
    }

    /**
     * Rend une décision sur l'étape en cours.
     *
     * @param string $decision approve | reject | send_back
     */
    public function decider(int $etapeId, User $viseur, string $decision, ?string $commentaire = null): void
    {
        $etape = DB::table('mail_approvals')->find($etapeId);

        if (! $etape) {
            throw new \InvalidArgumentException('Étape de visa introuvable.');
        }

        if ($etape->status !== 'in_progress') {
            throw new \LogicException(
                "Cette étape n'est pas à viser (statut : {$etape->status})."
            );
        }

        if ((int) $etape->approver_id !== $viseur->id) {
            throw new \Illuminate\Auth\Access\AuthorizationException(
                "Ce visa ne vous est pas destiné."
            );
        }

        if (in_array($decision, ['reject', 'send_back'], true) && blank($commentaire)) {
            throw new \InvalidArgumentException(
                'Un refus ou un renvoi doit être motivé : sans motif, il est inexploitable.'
            );
        }

        $mail = MailRegistry::findOrFail($etape->mail_id);

        DB::transaction(function () use ($etape, $mail, $viseur, $decision, $commentaire) {
            DB::table('mail_approvals')->where('id', $etape->id)->update([
                'status'     => match ($decision) {
                    'approve'   => 'approved',
                    'reject'    => 'rejected',
                    'send_back' => 'sent_back',
                },
                'comment'    => $commentaire,
                'acted_at'   => now(),
                'updated_at' => now(),
            ]);

            if ($decision === 'approve') {
                $suivante = DB::table('mail_approvals')
                    ->where('mail_id', $mail->id)
                    ->where('step_order', '>', $etape->step_order)
                    ->where('status', 'pending')
                    ->orderBy('step_order')
                    ->first();

                if ($suivante) {
                    DB::table('mail_approvals')->where('id', $suivante->id)
                        ->update(['status' => 'in_progress', 'updated_at' => now()]);
                }
            } else {
                // Refus ou renvoi : les étapes suivantes n'ont plus lieu d'être.
                DB::table('mail_approvals')
                    ->where('mail_id', $mail->id)
                    ->where('step_order', '>', $etape->step_order)
                    ->whereIn('status', ['pending', 'in_progress'])
                    ->update(['status' => 'skipped', 'updated_at' => now()]);

            }
        });

        // Traces écrites HORS transaction : voir la note de `soumettre()`.
        $this->tracer($mail, $viseur, match ($decision) {
            'approve'   => 'approved',
            'reject'    => 'rejected',
            'send_back' => 'sent_back',
        }, match ($decision) {
            'approve'   => $this->etapeCourante($mail)
                             ? 'Visa donné — transmis au viseur suivant'
                             : 'Dernier visa donné — bon pour envoi',
            'reject'    => 'Visa refusé — ' . $commentaire,
            'send_back' => 'Renvoyé pour correction — ' . $commentaire,
        });

        if ($decision === 'approve' && ($suivante = $this->etapeCourante($mail))) {
            $this->prevenir($mail, $suivante);
        }

        if ($decision !== 'approve') {
            $this->prevenirAuteur($mail, $etape, $viseur, $decision, $commentaire);
        }
    }

    /** Circuit complet d'un courrier, du plus ancien au plus récent. */
    public function circuit(MailRegistry $mail): Collection
    {
        return collect(DB::table('mail_approvals as a')
            ->join('users as u', 'u.id', '=', 'a.approver_id')
            ->where('a.mail_id', $mail->id)
            ->orderBy('a.step_order')
            ->get([
                'a.id', 'a.step_order', 'a.status', 'a.comment', 'a.acted_at',
                'a.approver_role', 'a.approver_id', 'u.name as approver_name',
            ]));
    }

    /** L'étape à viser maintenant, s'il y en a une. */
    public function etapeCourante(MailRegistry $mail): ?object
    {
        return DB::table('mail_approvals')
            ->where('mail_id', $mail->id)
            ->where('status', 'in_progress')
            ->orderBy('step_order')
            ->first();
    }

    public function circuitEnCours(MailRegistry $mail): bool
    {
        return DB::table('mail_approvals')
            ->where('mail_id', $mail->id)
            ->whereIn('status', ['pending', 'in_progress'])
            ->exists();
    }

    /**
     * Le courrier a-t-il obtenu tous ses visas ?
     * Faux s'il n'a jamais été soumis : un courrier sans circuit n'est pas
     * « approuvé », il est simplement hors parapheur.
     */
    public function bonPourEnvoi(MailRegistry $mail): bool
    {
        $etapes = DB::table('mail_approvals')->where('mail_id', $mail->id)->get();

        if ($etapes->isEmpty()) {
            return false;
        }

        return $etapes->every(fn ($e) => in_array($e->status, ['approved', 'skipped'], true))
            && $etapes->contains(fn ($e) => $e->status === 'approved');
    }

    /** Les visas qu'un utilisateur doit rendre — sa pile du jour. */
    public function enAttentePour(User $user): Collection
    {
        return collect(DB::table('mail_approvals as a')
            ->join('mail_registry as m', 'm.id', '=', 'a.mail_id')
            ->join('users as s', 's.id', '=', 'a.submitted_by')
            ->where('a.approver_id', $user->id)
            ->where('a.status', 'in_progress')
            ->orderBy('a.created_at')
            ->get([
                'a.id', 'a.step_order', 'a.approver_role', 'a.created_at as soumis_le',
                'm.id as mail_id', 'm.reference', 'm.subject', 'm.type',
                'm.recipient_name', 'm.recipient_organization', 'm.urgency',
                's.name as soumis_par',
            ]));
    }

    // ─── Utilitaires ────────────────────────────────────────────────────────

    private function tracer(MailRegistry $mail, User $user, string $action, string $commentaire): void
    {
        // `addTrackingEntry` est privée : on passe par la fiche de circulation
        // en écrivant directement, avec la même tolérance aux transactions.
        try {
            DB::table('mail_trackings')->insert([
                'id'         => (string) \Illuminate\Support\Str::uuid(),
                'mail_id'    => $mail->id,
                'user_id'    => $user->id,
                'action'     => $action,
                'comment'    => $commentaire,
                // `mail_trackings` n'a PAS de colonne `updated_at` : l'y mettre
                // faisait échouer l'insert.
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // La fiche de circulation ne doit jamais bloquer un visa.
            \Illuminate\Support\Facades\Log::warning('Trace de parapheur non écrite', [
                'mail_id' => $mail->id,
                'error'   => $e->getMessage(),
            ]);
        }
    }

    private function prevenir(MailRegistry $mail, ?object $etape): void
    {
        if (! $etape) {
            return;
        }

        $viseur = User::find($etape->approver_id);

        if (! $viseur) {
            return;
        }

        app(NotificationService::class)->send(
            user:  $viseur,
            type:  'mail_urgent',
            title: 'Courrier à viser',
            body:  "« {$mail->subject} » ({$mail->reference}) attend votre visa.",
            data:  ['action_url' => '/courrier/parapheur', 'mail_id' => $mail->id],
        );
    }

    private function prevenirAuteur(
        MailRegistry $mail, object $etape, User $viseur, string $decision, ?string $motif,
    ): void {
        $auteur = User::find($etape->submitted_by);

        if (! $auteur || $auteur->id === $viseur->id) {
            return;
        }

        app(NotificationService::class)->send(
            user:  $auteur,
            type:  'mail_urgent',
            title: $decision === 'reject' ? 'Visa refusé' : 'Courrier renvoyé pour correction',
            body:  "« {$mail->subject} » ({$mail->reference})\n"
                 . "Par {$viseur->name} : {$motif}",
            data:  ['action_url' => "/courrier/{$mail->id}", 'mail_id' => $mail->id],
        );
    }
}
