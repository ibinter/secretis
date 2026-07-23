/**
 * SECRETIS ERP — HelpCenter/Tickets/Create.jsx
 * Formulaire de création d'un ticket support
 *
 * Fonctionnalités :
 * - Sélection catégorie (technique, facturation, question, suggestion)
 * - Module concerné
 * - Objet (obligatoire)
 * - Description détaillée (textarea riche)
 * - Pièces jointes (max 5 fichiers, 10MB chacun)
 * - Priorité (normale/haute/urgente)
 * - Capture automatique : navigateur, OS, résolution, version SECRETIS
 * - Avant soumission : SARA propose des articles connexes
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

// ─── Constantes ───────────────────────────────────────────────────────────────
const MAX_FILES     = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const CATEGORIES = [
  { value: 'technical',       label: 'Problème technique',   emoji: '🔧',
    hint: 'Bug, dysfonctionnement, erreur d\'affichage' },
  { value: 'billing',         label: 'Facturation',           emoji: '💳',
    hint: 'Abonnement, facture, paiement' },
  { value: 'question',        label: 'Question',              emoji: '❓',
    hint: 'Comment faire, procédure, explication' },
  { value: 'feature_request', label: 'Suggestion',            emoji: '💡',
    hint: 'Nouvelle fonctionnalité, amélioration' },
];

const MODULES = [
  'Agenda', 'Courrier', 'GED', 'Réunions', 'Tâches', 'Projets',
  'Communication', 'Réception / Visiteurs', 'Ressources', 'Parc Auto',
  'RH', 'Rapports / BI', 'Comptabilité SYSCOHADA', 'Budget',
  'Achats', 'Qualité', 'Académie', 'Paramètres', 'SARA', 'Autre',
];

const PRIORITIES = [
  { value: 'normal', label: 'Normale',  color: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'high',   label: 'Haute',    color: 'border-orange-200 bg-orange-50 text-orange-700' },
  { value: 'urgent', label: 'Urgente',  color: 'border-red-200 bg-red-50 text-red-700' },
];

// ─── Collecte info technique ──────────────────────────────────────────────────
function collectTechInfo() {
  return {
    browser:          `${navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)[/\s][\d.]+/)?.[0] ?? navigator.userAgent}`,
    os:               navigator.platform ?? 'Inconnu',
    resolution:       `${window.screen.width}x${window.screen.height}`,
    viewport:         `${window.innerWidth}x${window.innerHeight}`,
    language:         navigator.language,
    url:              window.location.href,
    secretis_version: window.__SECRETIS_VERSION__ ?? '1.0.0',
    timestamp:        new Date().toISOString(),
  };
}

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Icon = {
  Paperclip: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
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
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function TicketCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    category: '',
    module:   '',
    subject:  '',
    description: '',
    priority: 'normal',
  });
  const [files, setFiles]       = useState([]);
  const [fileErrors, setFileErrors] = useState([]);
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Suggestions SARA avant soumission
  const [saraArticles, setSaraArticles] = useState([]);
  const [showSaraSuggestions, setShowSaraSuggestions] = useState(false);
  const [saraLoading, setSaraLoading] = useState(false);
  const [saraChecked, setSaraChecked] = useState(false);

  const fileInputRef = useRef(null);

  // ── Validation champ par champ ────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.category)    errs.category    = 'Sélectionnez une catégorie.';
    if (!form.subject.trim()) errs.subject  = 'L\'objet est obligatoire.';
    if (!form.description.trim()) errs.description = 'La description est obligatoire.';
    if (form.description.trim().length < 20) errs.description = 'La description doit faire au moins 20 caractères.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Suggestions SARA (avant soumission) ──────────────────────────────────
  const fetchSaraSuggestions = async () => {
    if (!form.subject.trim() || saraChecked) return;
    setSaraLoading(true);
    try {
      const { data } = await axios.get('/api/v1/help/search', {
        params: { q: form.subject.trim(), limit: 3, type: 'articles' },
      });
      setSaraArticles(data.results ?? []);
      if ((data.results ?? []).length > 0) setShowSaraSuggestions(true);
    } catch {
      setSaraArticles([]);
    } finally {
      setSaraLoading(false);
      setSaraChecked(true);
    }
  };

  // ── Gestion fichiers ──────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files ?? []);
    const errs = [];
    const valid = [];

    selected.forEach(f => {
      if (files.length + valid.length >= MAX_FILES) {
        errs.push(`Limite de ${MAX_FILES} fichiers atteinte.`);
      } else if (f.size > MAX_FILE_SIZE) {
        errs.push(`${f.name} dépasse 10 MB.`);
      } else {
        valid.push(f);
      }
    });

    setFileErrors(errs);
    setFiles(prev => [...prev, ...valid]);
    e.target.value = '';
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Soumission ────────────────────────────────────────────────────────────
  const handleSubmitClick = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Si pas encore proposé les suggestions SARA et qu'il y en a, les afficher d'abord
    if (!saraChecked) {
      await fetchSaraSuggestions();
      if (saraArticles.length > 0) return; // affichage suggestions — l'utilisateur confirme ensuite
    }

    await doSubmit();
  };

  const doSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      files.forEach(f => formData.append('attachments[]', f));
      formData.append('technical_info', JSON.stringify(collectTechInfo()));

      const { data } = await axios.post('/api/v1/help/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate(`/help/tickets/${data.ticket.id}`, {
        state: { success: true, ticketNumber: data.ticket.ticket_number },
      });
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Une erreur est survenue. Veuillez réessayer.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ouvrir un ticket support</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Notre équipe vous répondra dans les plus brefs délais.
            </p>
          </div>
          <Link to="/help/tickets" className="text-sm text-blue-600 hover:underline">
            Mes tickets
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Suggestions SARA ────────────────────────────────────────── */}
        {showSaraSuggestions && saraArticles.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <Icon.Bot />
              </div>
              <div>
                <p className="font-semibold text-blue-900">
                  Avez-vous consulté ces articles avant d'ouvrir un ticket ?
                </p>
                <p className="text-sm text-blue-700 mt-0.5">
                  Ils pourraient répondre à votre question immédiatement.
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {saraArticles.map(art => (
                <a
                  key={art.slug}
                  href={`/help/articles/${art.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border
                             border-blue-100 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <span className="text-sm text-gray-800 flex-1 group-hover:text-blue-700">
                    {art.title?.fr ?? art.title}
                  </span>
                  <Icon.ChevronRight />
                </a>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaraSuggestions(false)}
                className="text-sm text-blue-600 hover:underline"
              >
                Ces articles n'ont pas résolu mon problème — continuer
              </button>
              <button
                onClick={() => {
                  setShowSaraSuggestions(false);
                  doSubmit();
                }}
                className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm
                           hover:bg-blue-700 transition-colors"
              >
                Soumettre quand même
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitClick} noValidate>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, category: cat.value }));
                      setErrors(e => ({ ...e, category: undefined }));
                    }}
                    className={`flex items-start gap-3 p-3 border rounded-xl text-left
                                transition-all
                                ${form.category === cat.value
                                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    <span className="text-lg">{cat.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{cat.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{cat.hint}</p>
                    </div>
                  </button>
                ))}
              </div>
              {errors.category && (
                <p className="mt-1 text-xs text-red-500">{errors.category}</p>
              )}
            </div>

            {/* Module concerné */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Module concerné
              </label>
              <select
                value={form.module}
                onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionnez un module (optionnel)</option>
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Objet */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Objet du ticket <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={e => {
                  setForm(f => ({ ...f, subject: e.target.value }));
                  setErrors(e2 => ({ ...e2, subject: undefined }));
                  setSaraChecked(false); // réinitialiser si l'objet change
                }}
                placeholder="Ex : Impossible d'exporter les rapports en PDF"
                maxLength={200}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm
                            focus:outline-none focus:ring-2 focus:ring-blue-500
                            ${errors.subject ? 'border-red-300' : 'border-gray-200'}`}
              />
              {errors.subject && (
                <p className="mt-1 text-xs text-red-500">{errors.subject}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description détaillée <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => {
                  setForm(f => ({ ...f, description: e.target.value }));
                  setErrors(e2 => ({ ...e2, description: undefined }));
                }}
                rows={6}
                placeholder={'Décrivez le problème en détail :\n- Étapes pour reproduire\n- Ce que vous attendiez\n- Ce qui s\'est passé à la place\n- Messages d\'erreur éventuels'}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm resize-y
                            focus:outline-none focus:ring-2 focus:ring-blue-500
                            ${errors.description ? 'border-red-300' : 'border-gray-200'}`}
              />
              <div className="flex justify-between mt-1">
                {errors.description ? (
                  <p className="text-xs text-red-500">{errors.description}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-gray-400">{form.description.length} caractères</p>
              </div>
            </div>

            {/* Pièces jointes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pièces jointes
                <span className="text-xs font-normal text-gray-400 ml-2">
                  Max {MAX_FILES} fichiers · 10 MB chacun
                </span>
              </label>

              {files.length > 0 && (
                <div className="space-y-2 mb-3">
                  {files.map((f, i) => (
                    <div key={i}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg
                                 border border-gray-200">
                      <Icon.Paperclip />
                      <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-gray-400">{formatBytes(f.size)}</span>
                      <button type="button" onClick={() => removeFile(i)}
                        className="text-gray-400 hover:text-red-500">
                        <Icon.X />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {files.length < MAX_FILES && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.docx,.xlsx,.txt,.csv,.zip"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 border border-dashed
                               border-gray-300 rounded-lg text-sm text-gray-500
                               hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <Icon.Paperclip />
                    Ajouter des fichiers
                  </button>
                </>
              )}

              {fileErrors.map((e, i) => (
                <p key={i} className="mt-1 text-xs text-red-500">{e}</p>
              ))}
            </div>

            {/* Priorité */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Priorité
              </label>
              <div className="flex gap-3">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all
                                ${form.priority === p.value
                                  ? p.color + ' ring-1 ring-offset-1 ring-current'
                                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {form.priority === 'urgent' && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  La priorité Urgente est réservée aux pannes bloquant toute l'organisation.
                  Elle sera vérifiée par notre équipe.
                </p>
              )}
            </div>

            {/* Info technique auto-collectée */}
            <details className="text-xs text-gray-400">
              <summary className="cursor-pointer hover:text-gray-600">
                Informations techniques collectées automatiquement
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg font-mono space-y-1">
                {Object.entries(collectTechInfo()).map(([k, v]) => (
                  <div key={k}><span className="text-gray-500">{k}:</span> {v}</div>
                ))}
              </div>
            </details>
          </div>

          {/* Erreur de soumission */}
          {submitError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Boutons */}
          <div className="flex items-center justify-between mt-6">
            <Link to="/help" className="text-sm text-gray-500 hover:text-gray-700">
              Annuler
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                         text-sm font-medium transition-colors disabled:opacity-60
                         disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Envoi en cours...
                </>
              ) : 'Soumettre le ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
