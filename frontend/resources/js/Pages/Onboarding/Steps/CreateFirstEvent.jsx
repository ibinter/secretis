import { useState } from 'react';

const EVENT_TYPES = ['Réunion', 'Audience', 'Atelier', 'Formation', 'Conférence', 'Autre'];

export default function CreateFirstEvent({ step, onComplete, onSkip, saving }) {
  const [form, setForm] = useState({
    title       : step?.data?.title       ?? '',
    type        : step?.data?.type        ?? 'Réunion',
    date        : step?.data?.date        ?? '',
    startTime   : step?.data?.startTime   ?? '09:00',
    endTime     : step?.data?.endTime     ?? '10:00',
    location    : step?.data?.location    ?? '',
    participants: step?.data?.participants ?? '',
    description : step?.data?.description ?? '',
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Le titre est requis.';
    if (!form.date)         e.date  = 'La date est requise.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onComplete(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Créer votre premier événement</h2>
        <p className="text-slate-400 text-sm">Un événement simple pour démarrer. Vous pourrez le modifier après.</p>
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">Type d'événement</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map(t => (
            <button key={t} type="button" onClick={() => set('type', t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                ${form.type === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/20 text-slate-400 hover:border-white/40'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Titre */}
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">Titre <span className="text-red-400">*</span></label>
        <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="Ex : Réunion de coordination mensuelle"
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition-colors" />
        {errors.title && <p className="mt-1 text-red-400 text-xs">{errors.title}</p>}
      </div>

      {/* Date + heures */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="block text-sm font-semibold text-slate-300 mb-2">Date <span className="text-red-400">*</span></label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-blue-400 transition-colors" />
          {errors.date && <p className="mt-1 text-red-400 text-xs">{errors.date}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Début</label>
          <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Fin</label>
          <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-blue-400" />
        </div>
      </div>

      {/* Lieu */}
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">Lieu</label>
        <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
          placeholder="Ex : Salle de conférence A, Visioconférence..."
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400" />
      </div>

      {/* Participants */}
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">Participants</label>
        <input type="text" value={form.participants} onChange={e => set('participants', e.target.value)}
          placeholder="Emails séparés par des virgules..."
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400" />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-2">Description (optionnel)</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} placeholder="Ordre du jour, notes..."
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 resize-none" />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all active:scale-95">
          {saving ? '⏳...' : '📅 Créer l\'événement →'}
        </button>
        {onSkip && (
          <button type="button" onClick={onSkip} disabled={saving} className="px-5 text-slate-400 text-sm border border-white/10 rounded-xl">
            Passer
          </button>
        )}
      </div>
    </form>
  );
}
