import React, { useState, useCallback } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

const PRIORITY_COLORS = {
  low:    'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400',
  medium: 'border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-400',
  high:   'border-orange-200 bg-orange-50 text-orange-600 hover:border-orange-400',
  urgent: 'border-red-200 bg-red-50 text-red-600 hover:border-red-400',
};
const PRIORITY_ACTIVE = {
  low: 'border-gray-500 bg-gray-100', medium: 'border-blue-500 bg-blue-100',
  high: 'border-orange-500 bg-orange-100', urgent: 'border-red-500 bg-red-100',
};

export default function TicketsCreate({ categories = [], priorities = [] }) {
  const { data, setData, post, processing, errors } = useForm({
    subject: '', category: '', priority: 'medium', message: '', attachments: [],
  });
  const [suggestions, setSuggestions] = useState([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  const debounceRef = React.useRef(null);

  const searchSuggestions = useCallback((subject) => {
    clearTimeout(debounceRef.current);
    if (!subject || subject.length < 5) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get('/api/help/search', { params: { q: subject, limit: 3 } });
        setSuggestions(res.data.results || []);
      } catch { setSuggestions([]); }
    }, 600);
  }, []);

  function handleSubjectChange(e) {
    const v = e.target.value;
    setData('subject', v);
    searchSuggestions(v);
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files);
    if (files.length > 3) { alert('Maximum 3 fichiers.'); return; }
    setData('attachments', files);
    setAttachmentPreviews(files.map(f => ({ name: f.name, size: (f.size / 1024).toFixed(0) + ' Ko' })));
  }

  function removeFile(index) {
    const newFiles = [...data.attachments];
    newFiles.splice(index, 1);
    setData('attachments', newFiles);
    const newPreviews = [...attachmentPreviews];
    newPreviews.splice(index, 1);
    setAttachmentPreviews(newPreviews);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('subject', data.subject);
    formData.append('category', data.category);
    formData.append('priority', data.priority);
    formData.append('message', data.message);
    data.attachments.forEach((f, i) => formData.append(`attachments[${i}]`, f));
    router.post(route('support.tickets.store'), formData, {
      forceFormData: true,
    });
  }

  return (
    <AppLayout>
      <Head title="Nouveau ticket support" />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link href={route('support.tickets.index')} className="hover:text-[#2E86C1]">Tickets</Link>
            <span>/</span><span className="text-gray-900 dark:text-white">Nouveau ticket</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Créer un ticket support</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Notre équipe vous répondra sous 24-48h</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sujet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Sujet <span className="text-red-500">*</span>
            </label>
            <input type="text" value={data.subject} onChange={handleSubjectChange}
              placeholder="Décrivez votre problème en une phrase…"
              className={`w-full px-4 py-3 rounded-xl border ${errors.subject ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-[#2E86C1] focus:ring-1 focus:ring-[#2E86C1]`} />
            {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">
                  📚 Ces articles peuvent répondre à votre question :
                </p>
                {suggestions.map(s => (
                  <Link key={s.id} href={route('help.article', { category: s.category?.slug, article: s.slug })}
                    target="_blank"
                    className="flex items-center gap-2 py-1.5 text-sm text-[#2E86C1] hover:underline">
                    <span>{s.category?.icon}</span> {s.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Catégorie & Priorité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select value={data.category} onChange={e => setData('category', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${errors.category ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-[#2E86C1]`}>
                <option value="">Choisir une catégorie</option>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Priorité <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {priorities.map(p => (
                  <button key={p.value} type="button" onClick={() => setData('priority', p.value)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all text-left
                      ${data.priority === p.value ? PRIORITY_ACTIVE[p.value] : PRIORITY_COLORS[p.value]}`}>
                    <div className="font-semibold">{p.label}</div>
                    <div className="text-xs opacity-70">{p.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea value={data.message} onChange={e => setData('message', e.target.value)} rows={6}
              placeholder="Décrivez votre problème en détail. Plus vous fournissez d'informations, plus nous pourrons vous aider rapidement…"
              className={`w-full px-4 py-3 rounded-xl border ${errors.message ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-[#2E86C1] focus:ring-1 focus:ring-[#2E86C1] resize-y`} />
            {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
          </div>

          {/* Pièces jointes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Pièces jointes <span className="text-gray-400 font-normal">(optionnel · max 3 fichiers · 5 Mo chacun)</span>
            </label>
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer
              hover:border-[#2E86C1] transition-colors" onClick={() => document.getElementById('attachments').click()}>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                📎 Glissez vos fichiers ici ou <span className="text-[#2E86C1]">parcourir</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG, DOCX acceptés</p>
            </div>
            <input id="attachments" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.docx,.doc"
              onChange={handleFileChange} className="hidden" />

            {attachmentPreviews.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachmentPreviews.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                    <span className="text-lg">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.name}</p>
                      <p className="text-xs text-gray-400">{f.size}</p>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <Link href={route('support.tickets.index')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              ← Annuler
            </Link>
            <button type="submit" disabled={processing}
              className="flex items-center gap-2 bg-[#2E86C1] hover:bg-[#1A3A5C] text-white font-semibold
                px-8 py-3 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
              {processing ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Envoi…</>
              ) : '🎫 Envoyer le ticket'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
