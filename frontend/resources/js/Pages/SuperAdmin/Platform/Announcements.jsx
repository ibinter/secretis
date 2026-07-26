import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  Info: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  AlertTriangle: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  CheckCircle: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Wrench: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
}

const TYPE_CONFIG = {
  info:        { icon: <Ic.Info />, label: 'Information', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', banner: 'bg-purple-600' },
  warning:     { icon: <Ic.AlertTriangle />, label: 'Avertissement', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', banner: 'bg-amber-500' },
  success:     { icon: <Ic.CheckCircle />, label: 'Succès', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', banner: 'bg-green-600' },
  maintenance: { icon: <Ic.Wrench />, label: 'Maintenance', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', banner: 'bg-red-600' },
}

const MOCK_ANNOUNCEMENTS = [
  { id: 1, title_fr: 'Mise à jour 1.0.1 disponible', title_en: 'Update 1.0.1 available', message_fr: 'De nouvelles fonctionnalités sont disponibles dans SECRETIS.', message_en: 'New features are available in SECRETIS.', type: 'info', target: 'all', starts_at: '2026-07-20', ends_at: '2026-08-01', active: true, cta_link: '/changelog', cta_label: 'Voir le changelog' },
  { id: 2, title_fr: 'Maintenance programmée', title_en: 'Scheduled maintenance', message_fr: 'Le système sera indisponible le 25 juillet de 2h à 4h UTC.', message_en: 'The system will be unavailable on July 25 from 2am to 4am UTC.', type: 'maintenance', target: 'all', starts_at: '2026-07-23', ends_at: '2026-07-26', active: true, cta_link: null, cta_label: null },
]

const EMPTY_FORM = { title_fr: '', title_en: '', message_fr: '', message_en: '', type: 'info', target: 'all', starts_at: '', ends_at: '', cta_link: '', cta_label: '' }

function BannerPreview({ form }) {
  const cfg = TYPE_CONFIG[form.type] ?? TYPE_CONFIG.info
  if (!form.message_fr && !form.title_fr) return (
    <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-400">
      Remplissez le formulaire pour voir l'aperçu
    </div>
  )
  return (
    <div className={`rounded-lg p-4 ${cfg.bg} flex items-start gap-3`}>
      <span className={cfg.text}>{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${cfg.text}`}>{form.title_fr || 'Titre de l\'annonce'}</p>
        <p className={`text-sm mt-0.5 ${cfg.text} opacity-90`}>{form.message_fr || 'Message de l\'annonce'}</p>
        {form.cta_link && form.cta_label && (
          <a href={form.cta_link} className={`text-xs font-medium underline mt-1 inline-block ${cfg.text}`}>{form.cta_label}</a>
        )}
      </div>
      <button className={`${cfg.text} opacity-60 hover:opacity-100 text-lg leading-none shrink-0`}>×</button>
    </div>
  )
}

export default function AnnouncementsPage({ announcements: propAnnouncements }) {
  const [announcements, setAnnouncements] = useState(propAnnouncements ?? MOCK_ANNOUNCEMENTS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [editId, setEditId]     = useState(null)
  const [preview, setPreview]   = useState(false)

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const save = async () => {
    setSaving(true)
    try {
      if (editId) {
        const res = await axios.put(`/superadmin/announcements/${editId}`, form)
        setAnnouncements(a => a.map(x => x.id === editId ? res.data : x))
      } else {
        const res = await axios.post('/superadmin/announcements', form)
        setAnnouncements(a => [...a, res.data])
      }
      setShowForm(false); setForm(EMPTY_FORM); setEditId(null)
    } catch { alert('Erreur sauvegarde') }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Supprimer cette annonce ?')) return
    try {
      await axios.delete(`/superadmin/announcements/${id}`)
      setAnnouncements(a => a.filter(x => x.id !== id))
    } catch { alert('Erreur') }
  }

  const toggleActive = async (ann) => {
    try {
      await axios.patch(`/superadmin/announcements/${ann.id}`, { active: !ann.active })
      setAnnouncements(a => a.map(x => x.id === ann.id ? { ...x, active: !x.active } : x))
    } catch {}
  }

  const startEdit = (ann) => {
    setForm({ ...ann, cta_link: ann.cta_link ?? '', cta_label: ann.cta_label ?? '' })
    setEditId(ann.id); setShowForm(true)
  }

  return (
    <SuperAdminLayout title="Annonces plateforme">
      <Head title="Annonces — Super Admin" />

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Annonces plateforme</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{announcements.length} annonce(s) configurée(s)</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setEditId(null) }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#9333EA] text-white rounded-lg hover:bg-[#122a45] transition-colors">
          <Ic.Plus /> Nouvelle annonce
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900 dark:text-white">{editId ? 'Modifier l\'annonce' : 'Nouvelle annonce'}</h3>
            <div className="flex gap-2">
              <button onClick={() => setPreview(!preview)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Ic.Eye /> Aperçu
              </button>
            </div>
          </div>

          {preview && (
            <div className="mb-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">APERÇU DU BANDEAU</p>
              <BannerPreview form={form} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Titre (FR)"><input value={form.title_fr} onChange={e => setF('title_fr', e.target.value)} placeholder="Titre en français" /></Field>
            <Field label="Titre (EN)"><input value={form.title_en} onChange={e => setF('title_en', e.target.value)} placeholder="Title in English" /></Field>
            <Field label="Message (FR)" className="md:col-span-2"><textarea rows={2} value={form.message_fr} onChange={e => setF('message_fr', e.target.value)} placeholder="Message en français" /></Field>
            <Field label="Message (EN)" className="md:col-span-2"><textarea rows={2} value={form.message_en} onChange={e => setF('message_en', e.target.value)} placeholder="Message in English" /></Field>

            <Field label="Type">
              <select value={form.type} onChange={e => setF('type', e.target.value)}>
                <option value="info">Information</option>
                <option value="warning">Avertissement</option>
                <option value="success">Succès</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </Field>
            <Field label="Cible">
              <select value={form.target} onChange={e => setF('target', e.target.value)}>
                <option value="all">Toutes les organisations</option>
                <option value="trial">Essais uniquement</option>
                <option value="active">Clients actifs</option>
                <option value="enterprise">Plan Enterprise</option>
              </select>
            </Field>
            <Field label="Date début"><input type="date" value={form.starts_at} onChange={e => setF('starts_at', e.target.value)} /></Field>
            <Field label="Date fin"><input type="date" value={form.ends_at} onChange={e => setF('ends_at', e.target.value)} /></Field>
            <Field label="Lien CTA (optionnel)"><input value={form.cta_link} onChange={e => setF('cta_link', e.target.value)} placeholder="https://..." /></Field>
            <Field label="Texte bouton CTA"><input value={form.cta_label} onChange={e => setF('cta_label', e.target.value)} placeholder="En savoir plus" /></Field>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null) }} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
            <button disabled={saving} onClick={save} className="px-4 py-2 text-sm font-medium bg-[#9333EA] text-white rounded-lg hover:bg-[#122a45] disabled:opacity-60">
              {saving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['Titre', 'Type', 'Cible', 'Dates', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {announcements.map(ann => {
                const cfg = TYPE_CONFIG[ann.type] ?? TYPE_CONFIG.info
                return (
                  <tr key={ann.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{ann.title_fr}</p>
                      <p className="text-xs text-gray-400 line-clamp-1">{ann.message_fr}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{ann.target === 'all' ? 'Tous' : ann.target}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{ann.starts_at} → {ann.ends_at}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(ann)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${ann.active ? 'bg-[#9333EA]' : 'bg-gray-200 dark:bg-gray-600'}`}>
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${ann.active ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(ann)} className="p-1.5 rounded-md text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"><Ic.Edit /></button>
                        <button onClick={() => del(ann.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Ic.Trash /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  )
}

function Field({ label, children, className = '' }) {
  const INPUT_CLS = 'w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-transparent dark:text-white dark:bg-gray-700 focus:ring-2 focus:ring-[#9333EA]/30 outline-none resize-none'
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {React.cloneElement(children, { className: INPUT_CLS })}
    </div>
  )
}
export { AnnouncementsPage };
