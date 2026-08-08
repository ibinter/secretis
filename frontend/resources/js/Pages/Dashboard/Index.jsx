/**
 * Dashboard/Index.jsx — Tableau de bord principal SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`
 * (PageHeader / StatCard / Card / EmptyState / Button / Badge).
 *
 * Le hero dégradé + blobs flous a été remplacé par un `PageHeader` sobre :
 * le tableau de bord est un écran d'information scanné en un coup d'œil,
 * pas une page marketing.
 *
 * Aucune logique métier modifiée : mêmes props Inertia, mêmes `Deferred`,
 * mêmes destinations de navigation (`<Link>` Inertia partout).
 *
 * Props (DashboardController@index) :
 *   auth: { user:{id,name,email,role} } · organization:{id,name,plan_id,trial_ends_at}
 *   stats:{events_this_week,pending_tasks,documents_this_month,visitors_today}
 *   recentEvents / pendingTasks / recentDocuments  (Inertia::defer)
 *   trial_days_remaining
 */

import { Head, usePage, Link, Deferred } from '@inertiajs/react';
import {
  LayoutDashboard, CalendarDays, ListChecks, FileText, Users,
  ArrowRight, Clock, MapPin, AlertTriangle, Mail, FolderOpen,
  CheckSquare, ShieldCheck, Inbox, Plus, Zap,
} from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import {
  PageHeader, Button, Card, StatCard, EmptyState, Skeleton,
  cx, SURFACE, BORDER, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT,
  NUM, FOCUS_RING,
} from '@/Components/UI';

/* ─── Utilitaires ──────────────────────────────────────────────────────────── */

function salutation() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

const longDate = () =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—';

const initials = (name = '') =>
  name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

function dueMeta(iso) {
  if (!iso) return { label: 'Sans échéance', tone: 'muted' };
  const d = new Date(iso);
  const days = Math.ceil((d - new Date()) / 86400000);
  if (days < 0) return { label: `Retard ${Math.abs(days)}j`, tone: 'danger' };
  if (days === 0) return { label: "Aujourd'hui", tone: 'danger' };
  if (days === 1) return { label: 'Demain', tone: 'warn' };
  if (days <= 3) return { label: `Dans ${days}j`, tone: 'warn' };
  return { label: fmtDate(iso), tone: 'muted' };
}

const DUE_TONE = {
  danger: 'text-red-600 dark:text-red-400',
  warn:   'text-amber-600 dark:text-amber-400',
  muted:  'text-gray-500 dark:text-gray-400',
};

/** Barre de priorité fine — jamais de fond coloré plein sur une ligne. */
const PRIORITY = {
  urgent: { bar: 'bg-red-500',    label: 'Urgent'  },
  high:   { bar: 'bg-amber-500',  label: 'Haute'   },
  medium: { bar: 'bg-sky-500',    label: 'Moyenne' },
  normal: { bar: 'bg-sky-500',    label: 'Moyenne' },
  low:    { bar: 'bg-gray-300 dark:bg-gray-600', label: 'Basse' },
};

/* ─── Lien « voir tout » d'un en-tête de carte ─────────────────────────────── */

function CardLink({ href, children }) {
  return (
    <Link
      href={href}
      className={cx(
        'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
        TEXT_MUTED, 'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING,
      )}
    >
      {children} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

/* ─── Squelette de liste ───────────────────────────────────────────────────── */

function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" rounded="rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Timeline événements ──────────────────────────────────────────────────── */

function EventsTimeline() {
  const { recentEvents = [] } = usePage().props;

  if (!recentEvents.length) {
    return (
      <EmptyState
        compact
        icon={CalendarDays}
        title="Aucun événement à venir"
        description="Les prochains rendez-vous de votre agenda s'afficheront ici."
        action={<Button variant="secondary" size="sm" as={Link} href="/agenda" icon={CalendarDays}>Ouvrir l'agenda</Button>}
      />
    );
  }

  return (
    <ul className="relative">
      <span className={cx('absolute left-[3px] top-3 bottom-3 w-px', 'bg-gray-200 dark:bg-[#1E3048]')} aria-hidden="true" />
      {recentEvents.slice(0, 6).map((ev) => (
        <li key={ev.id} className="relative py-2.5 pl-6">
          <span
            className="absolute left-0 top-4 h-[7px] w-[7px] rounded-full ring-4 ring-white dark:ring-[#162032]"
            style={{ backgroundColor: ev.color ?? '#9333EA' }}
            aria-hidden="true"
          />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{ev.title}</p>
              <p className={cx('mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs', TEXT_MUTED, NUM)}>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" aria-hidden="true" /> {fmtDateTime(ev.start_at)}
                </span>
                {ev.location && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{ev.location}</span>
                  </span>
                )}
              </p>
            </div>

            {Array.isArray(ev.participants) && ev.participants.length > 0 && (
              <div className="flex shrink-0 -space-x-1.5">
                {ev.participants.slice(0, 3).map((p) => (
                  <span
                    key={p.id}
                    title={p.name}
                    className={cx(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold',
                      'bg-purple-50 text-purple-700 ring-2 ring-white',
                      'dark:bg-purple-500/15 dark:text-purple-300 dark:ring-[#162032]',
                    )}
                  >
                    {initials(p.name)}
                  </span>
                ))}
                {ev.participants.length > 3 && (
                  <span className={cx(
                    'flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold ring-2 ring-white',
                    'dark:bg-white/10 dark:ring-[#162032]', TEXT_MUTED, NUM,
                  )}>
                    +{ev.participants.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─── Tâches ───────────────────────────────────────────────────────────────── */

function TasksList() {
  const { pendingTasks = [] } = usePage().props;

  if (!pendingTasks.length) {
    return (
      <EmptyState
        compact
        icon={CheckSquare}
        title="Aucune tâche en cours"
        description="Rien ne vous est assigné pour le moment."
        action={<Button variant="secondary" size="sm" as={Link} href="/taches" icon={ListChecks}>Voir les tâches</Button>}
      />
    );
  }

  return (
    <ul className="space-y-0.5">
      {pendingTasks.slice(0, 6).map((t) => {
        const p   = PRIORITY[t.priority] ?? PRIORITY.low;
        const due = dueMeta(t.due_date);
        return (
          <li key={t.id}>
            <Link
              href={`/taches/${t.id}`}
              className={cx(
                'flex items-center gap-3 rounded-lg px-2 py-2 transition-colors',
                'hover:bg-gray-50 dark:hover:bg-white/[0.04]', FOCUS_RING,
              )}
            >
              <span className={cx('h-8 w-0.5 shrink-0 rounded-full', p.bar)} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{t.title}</p>
                <p className={cx('mt-0.5 truncate text-xs font-medium', NUM, DUE_TONE[due.tone])}>
                  {due.tone === 'danger' && (
                    <AlertTriangle className="mr-1 -mt-0.5 inline h-3 w-3" aria-hidden="true" />
                  )}
                  {due.label}
                  {t.project?.name ? <span className={TEXT_FAINT}> · {t.project.name}</span> : null}
                </p>
              </div>
              <span className={cx('shrink-0 text-[11px] font-medium', TEXT_MUTED)}>{p.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ─── Documents ────────────────────────────────────────────────────────────── */

function DocumentsList() {
  const { recentDocuments = [] } = usePage().props;

  if (!recentDocuments.length) {
    return (
      <EmptyState
        compact
        icon={Inbox}
        title="Aucun document récent"
        description="Les derniers fichiers déposés dans la GED apparaîtront ici."
        action={<Button variant="secondary" size="sm" as={Link} href="/ged" icon={FolderOpen}>Ouvrir la GED</Button>}
      />
    );
  }

  return (
    <ul className="space-y-0.5">
      {recentDocuments.slice(0, 6).map((d) => (
        <li key={d.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{d.title}</p>
            <p className={cx('truncate text-xs', TEXT_MUTED, NUM)}>
              {d.updated_at ? new Date(d.updated_at).toLocaleDateString('fr-FR') : '—'}
              {d.mime_type ? ` · ${String(d.mime_type).split('/').pop().toUpperCase()}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─── Bannière essai ───────────────────────────────────────────────────────── */

function TrialBanner({ days }) {
  if (days == null || days > 14) return null;
  const urgent = days <= 3;

  return (
    <div className={cx(
      'mb-6 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3',
      urgent
        ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
        : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
    )}>
      <ShieldCheck
        className={cx('h-5 w-5 shrink-0', urgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}
        aria-hidden="true"
      />
      <p className={cx(
        'flex-1 text-sm font-medium',
        urgent ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300',
      )}>
        {days === 0
          ? "Votre période d'essai se termine aujourd'hui."
          : `Il vous reste ${days} jour${days > 1 ? 's' : ''} d'essai.`}
      </p>
      <Button as={Link} href="/abonnement" variant={urgent ? 'danger' : 'primary'} size="sm">
        Souscrire
      </Button>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

const SHORTCUTS = [
  { label: 'Annuaire',     href: '/annuaire',     icon: Users },
  { label: 'Réunions',     href: '/reunions',     icon: CalendarDays },
  { label: 'Comptabilité', href: '/comptabilite', icon: FileText },
  { label: 'Qualité',      href: '/qualite',      icon: ShieldCheck },
];

export default function DashboardIndex() {
  const { auth, organization, stats = {}, trial_days_remaining } = usePage().props;
  const user = auth?.user ?? {};

  const kpis = [
    { icon: CalendarDays, label: 'Événements cette semaine', value: stats.events_this_week,    tone: 'accent',  href: '/agenda',    hint: "Voir l'agenda" },
    { icon: ListChecks,   label: 'Tâches en cours',          value: stats.pending_tasks,       tone: 'warning', href: '/taches',    hint: 'Gérer les tâches' },
    { icon: FileText,     label: 'Documents ce mois',        value: stats.documents_this_month, tone: 'success', href: '/ged',       hint: 'Ouvrir la GED' },
    { icon: Users,        label: "Visiteurs aujourd'hui",    value: stats.visitors_today,      tone: 'info',    href: '/reception', hint: 'Accueil visiteurs' },
  ];

  return (
    <AppLayout>
      <Head title="Tableau de bord" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={LayoutDashboard}
          title={`${salutation()}, ${user.name ?? 'Utilisateur'}`}
          subtitle={
            <>
              <span className="capitalize">{longDate()}</span>
              {organization?.name && <> · {organization.name}</>}
            </>
          }
          actions={
            <>
              <Button as={Link} href="/courrier" variant="secondary" icon={Mail}>Courrier</Button>
              <Button as={Link} href="/agenda"   variant="secondary" icon={CalendarDays}>Agenda</Button>
              <Button as={Link} href="/ged"      variant="secondary" icon={FolderOpen}>Documents</Button>
              <Button as={Link} href="/taches"   variant="primary"   icon={Plus}>Tâche</Button>
            </>
          }
        />

        <TrialBanner days={trial_days_remaining} />

        {/* KPI */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <Link key={k.label} href={k.href} className={cx('group block rounded-xl', FOCUS_RING)}>
              <StatCard
                icon={k.icon}
                label={k.label}
                value={k.value ?? 0}
                tone={k.tone}
                hint={k.hint}
                className="h-full transition-colors group-hover:bg-gray-50 dark:group-hover:bg-white/[0.04]"
              />
            </Link>
          ))}
        </div>

        {/* Grille principale */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          <div className="lg:col-span-2">
            <Card
              title="Événements à venir"
              icon={CalendarDays}
              actions={<CardLink href="/agenda">Agenda complet</CardLink>}
              bodyClassName="px-4 sm:px-6 py-3"
              padded={false}
            >
              <Deferred data="recentEvents" fallback={<ListSkeleton rows={5} />}>
                <EventsTimeline />
              </Deferred>
            </Card>
          </div>

          <Card
            title="Mes tâches prioritaires"
            icon={ListChecks}
            actions={<CardLink href="/taches">Toutes les tâches</CardLink>}
            bodyClassName="px-3 sm:px-4 py-3"
            padded={false}
          >
            <Deferred data="pendingTasks" fallback={<ListSkeleton rows={5} />}>
              <TasksList />
            </Deferred>
          </Card>

          <div className="lg:col-span-2">
            <Card
              title="Documents récents"
              icon={FileText}
              actions={<CardLink href="/ged">Ouvrir la GED</CardLink>}
              bodyClassName="px-3 sm:px-4 py-3"
              padded={false}
            >
              <Deferred data="recentDocuments" fallback={<ListSkeleton rows={4} />}>
                <DocumentsList />
              </Deferred>
            </Card>
          </div>

          <Card title="Accès rapides" icon={Zap} subtitle="Vos modules les plus utilisés">
            <div className="grid grid-cols-2 gap-2">
              {SHORTCUTS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className={cx(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors',
                    BORDER, SURFACE, TEXT_BODY,
                    'hover:bg-gray-50 dark:hover:bg-white/[0.05]', FOCUS_RING,
                  )}
                >
                  <s.icon className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                  {s.label}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export { DashboardIndex };
