import { Head, Link, useForm } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { ArrowLeft, Gavel, Send } from 'lucide-react';

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const INPUT = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600";

export default function DeliberationCreate({ users = [] }) {
  const { data, setData, post, processing, errors } = useForm({
    title:           '',
    body:            '',
    decision:        '',
    action_required: '',
    responsible_id:  '',
    deadline:        '',
    category:        '',
    meeting_id:      '',
  });

  function submit(e) {
    e.preventDefault();
    post(route('deliberations.store'));
  }

  return (
    <AuthLayout>
      <Head title="Nouvelle délibération" />

      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href={route('deliberations.index')} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            <ArrowLeft size={14} /> Délibérations
          </Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">Nouvelle délibération</span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <Gavel size={18} className="text-indigo-500" /> Nouvelle délibération
          </h1>

          <form onSubmit={submit} className="space-y-4">

            <Field label="Titre" required error={errors.title}>
              <input
                type="text"
                value={data.title}
                onChange={e => setData('title', e.target.value)}
                placeholder="Objet de la délibération"
                className={INPUT}
                autoFocus
              />
            </Field>

            <Field label="Contexte / Description" error={errors.body}>
              <textarea
                rows={4}
                value={data.body}
                onChange={e => setData('body', e.target.value)}
                placeholder="Contexte, éléments d'analyse, informations complémentaires…"
                className={INPUT}
              />
            </Field>

            <Field label="Décision prise" error={errors.decision}>
              <textarea
                rows={3}
                value={data.decision}
                onChange={e => setData('decision', e.target.value)}
                placeholder="Décision adoptée par l'organe délibérant…"
                className={INPUT}
              />
            </Field>

            <Field label="Action requise" error={errors.action_required}>
              <textarea
                rows={2}
                value={data.action_required}
                onChange={e => setData('action_required', e.target.value)}
                placeholder="Mesure(s) à mettre en œuvre…"
                className={INPUT}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Responsable" error={errors.responsible_id}>
                <select
                  value={data.responsible_id}
                  onChange={e => setData('responsible_id', e.target.value)}
                  className={INPUT}
                >
                  <option value="">— Sélectionner —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Échéance" error={errors.deadline}>
                <input
                  type="date"
                  value={data.deadline}
                  onChange={e => setData('deadline', e.target.value)}
                  className={INPUT}
                />
              </Field>
            </div>

            <Field label="Catégorie" error={errors.category}>
              <input
                type="text"
                value={data.category}
                onChange={e => setData('category', e.target.value)}
                placeholder="Ex : RH, Finances, Stratégie, Opérations…"
                className={INPUT}
              />
            </Field>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Link
                href={route('deliberations.index')}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                <Send size={14} />
                {processing ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
