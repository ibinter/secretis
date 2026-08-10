/**
 * Courrier/Parapheur.jsx — les visas à rendre, et ceux qu'on attend.
 *
 * Deux piles, dans cet ordre : ce que JE dois viser d'abord, ce que j'ai soumis
 * ensuite. Un parapheur sert d'abord à décider, pas à consulter.
 *
 * Refuser ou renvoyer exige un motif. Ce n'est pas une contrainte de formulaire
 * mais une règle métier : un refus sans motif oblige l'auteur à venir demander
 * de vive voix, ce qui vide le circuit de son intérêt.
 */

import { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import {
  Stamp, Check, X, RotateCcw, Clock, Send, AlertTriangle, Inbox,
} from 'lucide-react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, Card, EmptyState, Modal,
  cx, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM,
} from '@/Components/UI';

const URGENCES = {
  urgent: { label: 'Urgent', tone: 'danger' },
  high:   { label: 'Élevée', tone: 'warning' },
  normal: { label: 'Normale', tone: 'neutral' },
  low:    { label: 'Faible',  tone: 'neutral' },
};

const DECISIONS = {
  approve:   { titre: 'Donner le visa',           bouton: 'Viser',    motifRequis: false, icone: Check },
  send_back: { titre: 'Renvoyer pour correction', bouton: 'Renvoyer', motifRequis: true,  icone: RotateCcw },
  reject:    { titre: 'Refuser le visa',          bouton: 'Refuser',  motifRequis: true,  icone: X },
};

export default function Parapheur({ aViser = [], soumis = [] }) {
  const [decision, setDecision] = useState(null); // { etape, type, commentaire }
  const [enCours, setEnCours]   = useState(false);

  const config = decision ? DECISIONS[decision.type] : null;
  const motifManquant = config?.motifRequis && !(decision?.commentaire ?? '').trim();

  function rendre() {
    setEnCours(true);
    router.post(
      `/courrier/parapheur/${decision.etape.id}/decision`,
      { decision: decision.type, commentaire: decision.commentaire || null },
      {
        preserveScroll: true,
        onFinish: () => { setEnCours(false); setDecision(null); },
      },
    );
  }

  return (
    <AuthLayout>
      <Head title="Parapheur" />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={Stamp}
          title="Parapheur"
          subtitle="Les courriers qui attendent votre visa avant de partir."
        />

        {/* ── Ce que je dois viser ── */}
        <Card title={aViser.length > 0 ? `${aViser.length} courrier(s) à viser` : 'À viser'}>
          {aViser.length === 0 ? (
            <EmptyState
              icon={Check}
              title="Rien à viser"
              description="Aucun courrier n'attend votre visa pour le moment."
            />
          ) : (
            <div className="space-y-3">
              {aViser.map((v) => {
                const u = URGENCES[v.urgency] ?? URGENCES.normal;
                return (
                  <div key={v.id} className={cx('rounded-lg border p-4', BORDER)}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/courrier/${v.mail_id}`}
                            className={cx('font-medium hover:underline', TEXT_TITLE)}
                          >
                            {v.subject || 'Courrier sans objet'}
                          </Link>
                          <span className={cx('font-mono text-xs', TEXT_FAINT, NUM)}>{v.reference}</span>
                          {v.urgency !== 'normal' && <Badge variant={u.tone}>{u.label}</Badge>}
                        </div>

                        <p className={cx('mt-1 text-sm', TEXT_MUTED)}>
                          {v.recipient_name && <>Destinataire : {v.recipient_name}</>}
                          {v.recipient_organization && <> — {v.recipient_organization}</>}
                        </p>

                        <p className={cx('mt-1 text-xs', TEXT_FAINT)}>
                          Soumis par {v.soumis_par}
                          {v.approver_role && <> · vous visez au titre de : {v.approver_role}</>}
                          {' · '}étape {v.step_order}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="primary" size="sm"
                          onClick={() => setDecision({ etape: v, type: 'approve', commentaire: '' })}
                        >
                          <Check className="h-4 w-4" /> Viser
                        </Button>
                        <Button
                          variant="secondary" size="sm"
                          onClick={() => setDecision({ etape: v, type: 'send_back', commentaire: '' })}
                        >
                          <RotateCcw className="h-4 w-4" /> Renvoyer
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setDecision({ etape: v, type: 'reject', commentaire: '' })}
                        >
                          <X className="h-4 w-4" /> Refuser
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Ce que j'ai soumis ── */}
        <Card title="Mes courriers au visa">
          {soumis.length === 0 ? (
            <p className={cx('text-sm', TEXT_FAINT)}>
              Vous n'avez aucun courrier en attente de visa.
            </p>
          ) : (
            <div className="space-y-2">
              {soumis.map((s) => (
                <div key={s.id} className={cx('flex items-center justify-between rounded-lg border px-3 py-2', BORDER)}>
                  <div className="min-w-0">
                    <Link
                      href={`/courrier/${s.mail_id}`}
                      className={cx('text-sm font-medium hover:underline', TEXT_TITLE)}
                    >
                      {s.subject || 'Courrier sans objet'}
                    </Link>
                    <span className={cx('ml-2 font-mono text-xs', TEXT_FAINT)}>{s.reference}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    {s.status === 'in_progress' ? (
                      <><Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span className={TEXT_MUTED}>chez {s.viseur}</span></>
                    ) : (
                      <><Inbox className={cx('h-3.5 w-3.5', TEXT_FAINT)} />
                        <span className={TEXT_FAINT}>après {s.viseur}</span></>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Modale de décision ── */}
      {decision && (
        <Modal open onClose={() => setDecision(null)} title={config.titre}>
          <p className={cx('mb-1 text-sm font-medium', TEXT_TITLE)}>
            {decision.etape.subject}
          </p>
          <p className={cx('mb-4 font-mono text-xs', TEXT_FAINT)}>{decision.etape.reference}</p>

          {decision.type === 'approve' && (
            <p className={cx('mb-3 text-sm', TEXT_MUTED)}>
              Votre visa sera enregistré et le courrier transmis au viseur suivant,
              ou déclaré bon pour envoi s'il n'y en a plus.
            </p>
          )}

          {decision.type === 'send_back' && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Le circuit s'arrête et l'auteur est prévenu. Il pourra corriger puis
              resoumettre — l'historique de ce circuit reste consultable.
            </div>
          )}

          {decision.type === 'reject' && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Le courrier ne partira pas. Les visas suivants sont annulés.
            </div>
          )}

          <label className="block">
            <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>
              {config.motifRequis ? 'Motif (obligatoire)' : 'Observation (facultative)'}
            </span>
            <textarea
              rows={3}
              value={decision.commentaire}
              onChange={(e) => setDecision({ ...decision, commentaire: e.target.value })}
              placeholder={config.motifRequis
                ? "Indiquez ce qui doit être corrigé — l'auteur ne verra que ce texte."
                : ''}
              className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
            />
          </label>

          {motifManquant && (
            <p className="mt-2 text-xs text-red-600">
              Un refus sans motif oblige l'auteur à venir demander de vive voix.
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDecision(null)}>Annuler</Button>
            <Button onClick={rendre} disabled={enCours || motifManquant}>
              <config.icone className="h-4 w-4" /> {config.bouton}
            </Button>
          </div>
        </Modal>
      )}
    </AuthLayout>
  );
}
