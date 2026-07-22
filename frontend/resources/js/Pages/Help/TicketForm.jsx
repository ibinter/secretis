/**
 * SECRETIS ERP — Help/TicketForm.jsx
 * Formulaire de ticket de support avec suggestions FAQ en temps réel
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { debounce } from 'lodash';

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Icon = {
  ChevronLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Upload: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Bot: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Lightbulb: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
};

const CATEGORIES = [
  { value: 'technique',    label: 'Problème technique',   emoji: '⚙️' },
  { value: 'facturation',  label: 'Facturation & licence', emoji: '💳' },
  { value: 'fonctionnel',  label: 'Aide fonctionnelle',   emoji: '📘' },
  { value: 'securite',     label: 'Sécurité & accès',     emoji: '🔒' },
  { value: 'autre',        label: 'Autre demande',         emoji: '📋' },
];

const PRIORITIES = [
  { value: 'low',      label: 'Faible',    color: 'text-green-600  bg-green-50  border-green-200' },
  { value: 'medium',   label: 'Normale',   color: 'text-blue-600   bg-blue-50   border-blue-200' },
  { value: 'high',     label: 'Haute',     color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'critical', label: 'Critique',  color: 'text-red-600    bg-red-50    border-red-200' },
];

// ─── Composant zone de texte enrichi (simplifié sans TipTap) ─────────────────
// En production, remplacer par <EditorContent editor={editor} />
function RichTextArea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={8}
      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm
        outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-y
        placeholder:text-gray-400 leading-relaxed"
    />
  );
}

// ─── Card suggestion FAQ ──────────────────────────────────────────────────────
function FaqSuggestion({ faq, onDismiss }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-blue-100/50 transition-colors"
      >
        <span className="text-blue-500 flex-shrink-0 mt-0.5"><Icon.Lightbulb /></span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900 line-clamp-2">{faq.question}</p>
          <p className="text-xs text-blue-600 mt-0.5">{faq.category_name}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDismiss(faq.id); }}
          className="text-blue-400 hover:text-blue-700 flex-shrink-0"
        >
          <Icon.X />
        </button>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-blue-200 bg-white">
          <div
            className="prose prose-sm max-w-none text-gray-700 mt-3"
            dangerouslySetInnerHTML={{ __html: faq.answer_html || faq.answer }}
          />
          <Link
            to={`/help/faq/${faq.id}`}
            className="inline-block mt-3 text-xs text-blue-600 hover:underline font-medium"
          >
            Voir l'article complet →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function TicketForm() {
  const navigate = useNavigate();
  const { t }    = useTranslation();
  const fileRef  = useRef(null);

  const [form, setForm] = useState({
    subject:     '',
    category:    '',
    priority:    'medium',
    description: '',
  });

  const [attachments, setAttachments]         = useState([]);
  const [faqSuggestions, setFaqSuggestions]   = useState([]);
  const [dismissedFaqs, setDismissedFaqs]     = useState(new Set());
  const [saraChecking, setSaraChecking]       = useState(false);
  const [saraResult, setSaraResult]           = useState(null);
  const [errors, setErrors]                   = useState({});
  const [submitting, setSubmitting]           = useState(false);
  const [submitted, setSubmitted]             = useState(null);

  // ── Suggestions FAQ en temps réel ──────────────────────────────────────────
  const fetchSuggestions = useCallback(
    debounce(async (text) => {
      if (!text || text.length < 10) { setFaqSuggestions([]); return; }
      try {
        const res = await axios.get('/api/help/faq/search', {
          params: { q: text, limit: 3 },
        });
        setFaqSuggestions(res.data.results || []);
      } catch {
        setFaqSuggestions([]);
      }
    }, 500),
    []
  );

  useEffect(() => {
    fetchSuggestions(form.subject + ' ' + form.description);
  }, [form.subject, form.description, fetchSuggestions]);

  const visibleSuggestions = faqSuggestions.filter(f => !dismissedFaqs.has(f.id));

  // ── Gestion des fichiers ────────────────────────────────────────────────────
  function handleFiles(files) {
    const allowed  = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];
    const maxSize  = 5 * 1024 * 1024; // 5 Mo
    const newFiles = Array.from(files).filter(f => allowed.includes(f.type) && f.size <= maxSize);
    setAttachments(prev => {
      const combined = [...prev, ...newFiles].slice(0, 5); // max 5 fichiers
      return combined;
    });
  }

  function removeAttachment(index) {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  // ── Vérification SARA ────────────────────────────────────────────────────────
  async function checkWithSara() {
    setSaraChecking(true);
    setSaraResult(null);
    try {
      const res = await axios.post('/api/help/sara/check', {
        subject:     form.subject,
        description: form.description,
        category:    form.category,
      });
      setSaraResult(res.data);
    } catch {
      setSaraResult({ has_answer: false, message: 'SARA est indisponible pour le moment.' });
    } finally {
      setSaraChecking(false);
    }
  }

  // ── Validation ───────────────────────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!form.subject.trim())     errs.subject  = 'Sujet requis (min. 10 caractères)';
    else if (form.subject.length < 10) errs.subject = 'Sujet trop court (min. 10 caractères)';
    if (!form.category)           errs.category = 'Veuillez sélectionner une catégorie';
    if (!form.description.trim()) errs.description = 'Description requise (min. 30 caractères)';
    else if (form.description.length < 30) errs.description = 'Description trop courte (min. 30 caractères)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Soumission ───────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('subject',     form.subject);
      fd.append('category',    form.category);
      fd.append('priority',    form.priority);
      fd.append('description', form.description);
      attachments.forEach((file, idx) => fd.append(`attachments[${idx}]`, file));

      const res = await axios.post('/api/help/tickets', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(res.data);
    } catch (err) {
      const serverErrors = err.response?.data?.errors || {};
      setErrors({ ...serverErrors, submit: err.response?.data?.message || 'Erreur lors de la création du ticket.' });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Succès ───────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600"><Icon.Check /></span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ticket créé !</h2>
          <p className="text-gray-500 mb-4">
            Votre ticket <strong>#{submitted.ticket_number}</strong> a été créé.
            Un email de confirmation a été envoyé à votre adresse.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Délai de réponse estimé : <strong>{submitted.estimated_response}</strong>
          </p>
          <div className="flex gap-3">
            <Link to="/help" className="flex-1 py-2.5 rounded-xl border border-gray-300
              text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center">
              Centre d'aide
            </Link>
            <Link to={`/help/tickets/${submitted.id}`}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold
              hover:bg-blue-700 transition-colors text-center">
              Voir le ticket
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulaire ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <Link to="/help" className="flex items-center gap-1.5 text-sm text-gray-500
            hover:text-gray-900 transition-colors mb-4">
            <Icon.ChevronLeft /> Centre d'aide
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Ouvrir un ticket de support</h1>
          <p className="text-gray-500 mt-1">
            Décrivez votre problème et nous vous répondrons dans les plus brefs délais.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Formulaire (2/3) ── */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
            {/* Sujet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Sujet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="Décrivez brièvement votre problème…"
                maxLength={150}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none
                  focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all
                  ${errors.subject ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}
                `}
              />
              {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
              <p className="text-xs text-gray-400 mt-1 text-right">{form.subject.length}/150</p>
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, category: cat.value }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm
                      font-medium transition-all text-left
                      ${form.category === cat.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'}
                    `}
                  >
                    <span>{cat.emoji}</span>
                    <span className="leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
            </div>

            {/* Priorité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priorité</label>
              <div className="flex gap-2 flex-wrap">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, priority: p.value }))}
                    className={`px-4 py-2 rounded-xl border-2 text-xs font-semibold transition-all
                      ${form.priority === p.value ? p.color + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300'}
                    `}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <RichTextArea
                value={form.description}
                onChange={v => setForm(p => ({ ...p, description: v }))}
                placeholder="Décrivez votre problème en détail : quand est-il apparu, quelles actions avez-vous effectuées, quel message d'erreur avez-vous vu…"
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            </div>

            {/* Pièces jointes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Captures d'écran / Pièces jointes
                <span className="text-gray-400 font-normal ml-1">(max 5 fichiers, 5 Mo chacun)</span>
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center
                  cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <Icon.Upload />
                <p className="text-sm text-gray-500 mt-2">
                  Glissez-déposez vos fichiers ici ou{' '}
                  <span className="text-blue-600 font-medium group-hover:underline">cliquez pour choisir</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, WEBP, PDF acceptés</p>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={e => handleFiles(e.target.files)}
                />
              </div>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 text-sm">
                      <span>📎</span>
                      <span className="max-w-[120px] truncate text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(1)}Mo
                      </span>
                      <button type="button" onClick={() => removeAttachment(idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors">
                        <Icon.X />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Résultat SARA */}
            {saraResult && (
              <div className={`p-4 rounded-xl border ${saraResult.has_answer
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">{saraResult.has_answer ? '✅' : '🤖'}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{saraResult.message}</p>
                    {saraResult.answer && (
                      <p className="text-sm text-gray-600 mt-1">{saraResult.answer}</p>
                    )}
                    {saraResult.faq_id && (
                      <Link to={`/help/faq/${saraResult.faq_id}`}
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                        Voir l'article complet →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {errors.submit}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={checkWithSara}
                disabled={saraChecking || !form.subject || !form.description}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2
                  border-blue-300 text-blue-700 text-sm font-medium hover:bg-blue-50
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {saraChecking ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon.Bot />
                )}
                Vérifier avec SARA
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                  bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                {submitting ? 'Envoi en cours…' : 'Soumettre le ticket'}
              </button>
            </div>
          </form>

          {/* ── Sidebar suggestions (1/3) ── */}
          <aside className="space-y-4">
            {/* Suggestions FAQ */}
            {visibleSuggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Icon.Lightbulb />
                  Articles suggérés
                </h3>
                <div className="space-y-3">
                  {visibleSuggestions.map(faq => (
                    <FaqSuggestion
                      key={faq.id}
                      faq={faq}
                      onDismiss={id => setDismissedFaqs(prev => new Set([...prev, id]))}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Infos délais */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm space-y-3">
              <h3 className="font-semibold text-gray-800">⏱ Délais de réponse</h3>
              {[
                { label: 'Critique', delay: '< 4h',   color: 'text-red-600' },
                { label: 'Haute',    delay: '< 24h',  color: 'text-orange-600' },
                { label: 'Normale',  delay: '1–3 j',  color: 'text-blue-600' },
                { label: 'Faible',   delay: '3–5 j',  color: 'text-gray-600' },
              ].map(({ label, delay, color }) => (
                <div key={label} className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-semibold ${color}`}>{delay}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
