import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  ArrowLeft: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>,
  Shield: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Ban: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>,
  Gift: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>,
  Mail: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  Download: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Clock: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  User: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  AlertTriangle: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_ORG = {
  id: 1,
  name: 'Banque Nationale CI',
  email: 'admin@bnci.ci',
  country: 'CI',
  sector: 'Finance / Banque',
  language: 'fr',
  status: 'active',
  plan: { name: 'Enterprise', slug: 'enterprise' },
  users_count: 85,
  created_at: '2025-01-15T10:00:00Z',
  trial_ends_at: null,
  license_expires_at: '2027-01-15T00:00:00Z',
  settings: { modules: ['rh', 'compta', 'ged', 'crm', 'fleet'] },
  users: Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: ['Kouadio N\'Goran', 'Amenan Konaté', 'Brice Koffi', 'Aya Diallo', 'Jean-Marc Ettien'][i],
    email: [`user${i + 1}@bnci.ci`],
    role: ['admin', 'manager', 'user', 'user', 'comptable'][i],
    last_login_at: new Date(Date.now() - i * 86400000).toISOString(),
    mfa_enabled: i < 3,
  })),
  payments: Array.from({ length: 4 }, (_, i) => ({
    id: i + 1,
    amount: [850000, 850000, 750000, 750000][i],
    status: ['validated', 'validated', 'validated', 'pending'][i],
    created_at: new Date(Date.now() - i * 90 * 86400000).toISOString(),
    proof_file: `receipt_${i + 1}.pdf`,
  })),
}

const MOCK_AUDIT = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  action: ['user.login', 'invoice.created', 'document.uploaded', 'employee.created', 'report.exported'][i % 5],
  user_name: ['Kouadio N\'Goran', 'Amenan Konaté', 'Brice Koffi'][i % 3],
  ip_address: `41.66.${i}.${(i * 7) % 255}`,
  created_at: new Date(Date.now() - i * 3600000).toISOString(),
}))

const TABS = ['Profil', 'Licence', 'Utilisateurs', 'Paiements', 'Activité', 'Actions admin']

export default function OrganizationShow({ organization: propOrg, auditLogs: propLogs, activeModules: propModules }) {
  const org        = propOrg ?? MOCK_ORG
  const auditLogs  = propLogs ?? MOCK_AUDIT
  const [tab, setTab]           = useState('Profil')
  const [justification, setJustification] = useState('')
  const [actionModal, setActionModal] = useState(null) // 'suspend' | 'grace' | 'message'
  const [msgSubject, setMsgSubject]   = useState('')
  const [msgBody, setMsgBody]         = useState('')
  const [saving, setSaving]           = useState(false)
  const [alert, setAlert]             = useState(null)

  const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const fmtAmount = v => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v)

  const doAction = async (action) => {
    if (!justification.trim()) { setAlert('Justification obligatoire.'); return }
    setSaving(true)
    try {
      await axios.post(`/superadmin/organisations/${org.id}/${action}`, { justification })
      setAlert(null)
      setActionModal(null)
      setJustification('')
      router.reload()
    } catch (e) {
      setAlert(e.response?.data?.message ?? 'Erreur serveur')
    } finally { setSaving(false) }
  }

  const sendMessage = async () => {
    if (!msgSubject || !msgBody) { setAlert('Objet et message obligatoires.'); return }
    setSaving(true)
    try {
      await axios.post(`/superadmin/organisations/${org.id}/send-message`, { subject: msgSubject, body: msgBody })
      setActionModal(null); setMsgSubject(''); setMsgBody(''); setAlert(null)
    } catch (e) { setAlert('Erreur envoi') }
    finally { setSaving(false) }
  }

  const impersonate = () => {
    if (!confirm('Démarrer une prise en main ? L\'administrateur de l\'organisation sera notifié par email.')) return
    router.post(`/superadmin/organisations/${org.id}/impersonate`)
  }

  const statusCls = {
    active: 'bg-green-100 text-green-700', trial: 'bg-purple-100 text-purple-700',
    suspended: 'bg-red-100 text-red-700', expired: 'bg-gray-100 text-gray-600',
  }[org.status] ?? 'bg-gray-100 text-gray-600'

  return (
    <SuperAdminLayout title={org.name}>
      <Head title={`${org.name} — Super Admin`} />

      {/* ── En-tête ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 mb-6">
        <Link href="/superadmin/organisations" className="mt-1 p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-400">
          <Ic.ArrowLeft />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{org.name}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCls}`}>{org.status}</span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">{org.plan?.name}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {org.email} · {org.country} · Créée le {fmtDate(org.created_at)}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={impersonate} className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[#9333EA] text-white rounded-lg hover:bg-[#122a45] transition-colors">
            <Ic.Eye /> Prise en main
          </button>
          <button onClick={() => setActionModal('message')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Ic.Mail /> Email
          </button>
        </div>
      </div>

      {/* ── Onglets ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                tab === t
                  ? 'border-[#9333EA] text-[#9333EA] dark:border-purple-400 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Contenu des onglets ───────────────────────────────────────────────── */}
      {tab === 'Profil' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card title="Informations organisation">
            <Row label="Nom" value={org.name} />
            <Row label="Email" value={org.email} />
            <Row label="Pays" value={org.country} />
            <Row label="Secteur" value={org.sector} />
            <Row label="Langue" value={org.language?.toUpperCase()} />
            <Row label="Statut" value={<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCls}`}>{org.status}</span>} />
          </Card>
          <Card title="Modules actifs">
            <div className="flex flex-wrap gap-2 pt-1">
              {(org.settings?.modules ?? []).map(m => (
                <span key={m} className="px-2.5 py-1 rounded-lg bg-[#9333EA]/10 text-[#9333EA] dark:bg-purple-900/30 dark:text-purple-300 text-xs font-medium uppercase">{m}</span>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'Licence' && (
        <div className="space-y-5">
          <Card title="Licence actuelle">
            <Row label="Plan" value={org.plan?.name} />
            <Row label="Début" value={fmtDate(org.created_at)} />
            <Row label="Expiration" value={fmtDate(org.license_expires_at)} />
            <Row label="Utilisateurs actifs" value={`${org.users_count}`} />
          </Card>
          <Card title="Actions sur la licence">
            <div className="flex flex-wrap gap-3 pt-1">
              <ActionBtn color="blue" icon={<Ic.Gift />} label="Prolonger" onClick={() => setActionModal('extend')} />
              <ActionBtn color="amber" icon={<Ic.Shield />} label="Période de grâce" onClick={() => setActionModal('grace')} />
              <ActionBtn color="orange" icon={<Ic.Ban />} label="Suspendre" onClick={() => setActionModal('suspend')} />
              <ActionBtn color="red" icon={<Ic.AlertTriangle />} label="Révoquer" onClick={() => setActionModal('revoke')} />
            </div>
          </Card>
        </div>
      )}

      {tab === 'Utilisateurs' && (
        <Card title={`Utilisateurs (${org.users?.length ?? 0})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-700">
                {['Nom', 'Email', 'Rôle', 'Dernière connexion', 'MFA'].map(h => (
                  <th key={h} className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pr-4">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {(org.users ?? []).map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{u.name}</td>
                    <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 text-xs">{Array.isArray(u.email) ? u.email[0] : u.email}</td>
                    <td className="py-3 pr-4"><span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{u.role}</span></td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{fmtDate(u.last_login_at)}</td>
                    <td className="py-3"><span className={`text-xs font-medium ${u.mfa_enabled ? 'text-green-600' : 'text-gray-400'}`}>{u.mfa_enabled ? '✓ Actif' : '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'Paiements' && (
        <Card title="Historique des paiements">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-700">
                {['#', 'Montant', 'Statut', 'Date', 'Preuve'].map(h => (
                  <th key={h} className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pr-4">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {(org.payments ?? []).map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                    <td className="py-3 pr-4 text-gray-400 text-xs">#{p.id}</td>
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white tabular-nums">{fmtAmount(p.amount)}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === 'validated' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.status === 'validated' ? 'Validé' : 'En attente'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{fmtDate(p.created_at)}</td>
                    <td className="py-3">
                      {p.proof_file && (
                        <a href={`/superadmin/payments/${p.id}/proof`} className="text-xs text-[#9333EA] dark:text-purple-400 hover:underline">{p.proof_file}</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'Activité' && (
        <Card title="Journal d'activité (50 dernières actions)">
          <div className="space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-[#9333EA]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Ic.User />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{log.user_name}</span>
                    {' · '}
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{log.action}</code>
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Ic.Clock /> {fmtDate(log.created_at)} · {log.ip_address}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'Actions admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card title="Actions rapides">
            <div className="space-y-3">
              <AdminAction icon={<Ic.Eye />} label="Démarrer prise en main sécurisée" desc="Vous serez connecté comme l'admin principal. Un email d'alerte sera envoyé." onClick={impersonate} color="blue" />
              <AdminAction icon={<Ic.Mail />} label="Envoyer email personnalisé" desc="Envoyer un message à l'administrateur de l'organisation." onClick={() => setActionModal('message')} color="green" />
              <AdminAction icon={<Ic.Ban />} label="Forcer réinitialisation MFA" desc="L'utilisateur devra reconfigurer son authentification." onClick={() => doAction('reset-mfa')} color="amber" />
              <AdminAction icon={<Ic.Download />} label="Exporter toutes les données (RGPD)" desc="Archive ZIP de toutes les données de l'organisation." onClick={() => window.open(`/superadmin/organisations/${org.id}/export-data`)} color="purple" />
            </div>
          </Card>
          <Card title="État de la licence">
            <Row label="Statut" value={<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCls}`}>{org.status}</span>} />
            <Row label="Expiration" value={fmtDate(org.license_expires_at)} />
            <div className="flex flex-wrap gap-2 mt-4">
              <ActionBtn color="blue" icon={<Ic.Gift />} label="Prolonger" onClick={() => setActionModal('extend')} />
              <ActionBtn color="amber" icon={<Ic.Gift />} label="Période de grâce" onClick={() => setActionModal('grace')} />
              <ActionBtn color="red" icon={<Ic.Ban />} label="Suspendre" onClick={() => setActionModal('suspend')} />
            </div>
          </Card>
        </div>
      )}

      {/* ── Modal action avec justification ──────────────────────────────────── */}
      {actionModal && actionModal !== 'message' && (
        <Modal title={`Confirmer l'action : ${actionModal}`} onClose={() => { setActionModal(null); setJustification(''); setAlert(null) }}>
          {alert && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg p-2">{alert}</p>}
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Justification (obligatoire)</label>
          <textarea
            rows={3}
            value={justification}
            onChange={e => setJustification(e.target.value)}
            placeholder="Motif de l'action..."
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm dark:bg-gray-700 dark:text-white resize-none focus:ring-2 focus:ring-[#9333EA]/30 outline-none"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setActionModal(null); setJustification(''); setAlert(null) }} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
            <button disabled={saving} onClick={() => doAction(actionModal)} className="px-4 py-2 text-sm font-medium bg-[#9333EA] text-white rounded-lg hover:bg-[#122a45] disabled:opacity-60">
              {saving ? 'Traitement…' : 'Confirmer'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal message ─────────────────────────────────────────────────────── */}
      {actionModal === 'message' && (
        <Modal title="Envoyer un email à l'organisation" onClose={() => setActionModal(null)}>
          {alert && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg p-2">{alert}</p>}
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objet</label>
          <input value={msgSubject} onChange={e => setMsgSubject(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mb-3 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#9333EA]/30 outline-none" placeholder="Objet du message" />
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
          <textarea rows={5} value={msgBody} onChange={e => setMsgBody(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm dark:bg-gray-700 dark:text-white resize-none focus:ring-2 focus:ring-[#9333EA]/30 outline-none" placeholder="Corps du message..." />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
            <button disabled={saving} onClick={sendMessage} className="px-4 py-2 text-sm font-medium bg-[#9333EA] text-white rounded-lg hover:bg-[#122a45] disabled:opacity-60">
              {saving ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </Modal>
      )}
    </SuperAdminLayout>
  )
}

// ─── Composants utilitaires ───────────────────────────────────────────────────
function Card({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200">{value}</span>
    </div>
  )
}

const BTN_COLORS = {
  blue:   'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  amber:  'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  red:    'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  green:  'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
}

function ActionBtn({ color, icon, label, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${BTN_COLORS[color]}`}>
      {icon} {label}
    </button>
  )
}

function AdminAction({ icon, label, desc, onClick, color }) {
  return (
    <button onClick={onClick} className={`flex items-start gap-3 w-full text-left p-3 rounded-lg border transition-colors ${BTN_COLORS[color]}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs opacity-70 mt-0.5">{desc}</p>
      </div>
    </button>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
export { OrganizationShow };
