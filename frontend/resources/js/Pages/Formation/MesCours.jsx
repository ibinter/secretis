import { Head, Link, router } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { GraduationCap, Clock, BarChart3, PlayCircle, CheckCircle2, BookOpen } from 'lucide-react';

const STATUS_CFG = {
  in_progress: { label: 'En cours',  color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' },
  enrolled:    { label: 'Inscrit',   color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
  completed:   { label: 'Terminé',   color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300' },
};

const FILTERS = [['', 'Tous'], ['in_progress', 'En cours'], ['enrolled', 'Inscrits'], ['completed', 'Terminés']];

function fmt(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CourseCard({ enr }) {
  const cfg = STATUS_CFG[enr.status] ?? STATUS_CFG.enrolled;
  const progress = Math.min(100, Math.max(0, enr.progress ?? enr.progress_percent ?? 0));
  const done = enr.status === 'completed';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
      <div className="h-28 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative">
        {enr.thumbnail_path
          ? <img src={`/storage/${enr.thumbnail_path}`} alt={enr.course_title} className="w-full h-full object-cover" />
          : <BookOpen size={32} className="text-white/70" />
        }
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-2">{enr.course_title ?? 'Cours'}</h3>

        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          {enr.category && <span className="inline-flex items-center gap-1"><BarChart3 size={11} /> {enr.category}</span>}
          {enr.duration_minutes != null && <span className="inline-flex items-center gap-1"><Clock size={11} /> {enr.duration_minutes} min</span>}
        </div>

        {/* Barre de progression */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">Progression</span>
            <span className="font-medium text-gray-600 dark:text-gray-300">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${done ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-400">{enr.enrolled_at ? `Inscrit le ${fmt(enr.enrolled_at)}` : ''}</span>
          <Link href={enr.course_id ? `/formation/cours/${enr.course_id}` : '#'}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
            {done ? <><CheckCircle2 size={13} /> Revoir</> : <><PlayCircle size={13} /> Continuer</>}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MesCours({ enrollments = {} }) {
  const items = enrollments.data ?? [];
  const links = enrollments.links ?? enrollments.meta?.links ?? [];

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const active = params.get('status') ?? '';

  function filter(status) {
    router.get(route('formation.mon-espace'), { status: status || undefined }, { preserveScroll: true });
  }

  return (
    <AuthLayout>
      <Head title="Mes Cours" />
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-5">

        <div className="flex items-center gap-2">
          <GraduationCap size={22} className="text-indigo-500" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mes Cours</h1>
        </div>

        <div className="flex gap-1.5">
          {FILTERS.map(([s, label]) => (
            <button key={s} onClick={() => filter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${active === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
            <GraduationCap size={40} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Vous n'êtes inscrit à aucun cours pour le moment.</p>
            <Link href="/formation" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
              <BookOpen size={14} /> Parcourir le catalogue
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(enr => <CourseCard key={enr.id} enr={enr} />)}
          </div>
        )}

        {links.filter(l => l.url).length > 2 && (
          <div className="flex justify-center gap-1">
            {links.map((link, i) => (
              <Link key={i} href={link.url ?? '#'}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${link.active ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'} ${!link.url ? 'opacity-40 pointer-events-none' : ''}`}
                dangerouslySetInnerHTML={{ __html: link.label }} />
            ))}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
