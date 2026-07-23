import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

const Ic = {
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  Mail: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  Copy: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>,
  ArrowRight: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>,
  FileText: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
}

const STATUS_MAP = {
  draft:    { label: 'Brouillon',  cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  sent:     { label: 'Envoyée',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  viewed:   { label: 'Vue',        cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  accepted: { label: 'Acceptée',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  refused:  { label: 'Refusée',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  expired:  { label: 'Expirée',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
}

const MOCK_OFFERS = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  number: `OFF-2026-${String(i + 1).padStart(3, '0')}`,
  prospect_name: ['Awa Diallo', 'Konan N\'Goran', 'Brice Koffi', 'Fatou Touré'][i % 4],
  company: ['MediaGroup CI', 'StartupHub BF', 'TechSN', 'Cabinet RH+'][i % 4],
  software: ['SECRETIS', 'SECRETIS RH'][i % 2],
  plan: ['Starter', 'Pro', 'Enterprise'][i % 3],
  amount: [250000, 750000, 1500000, 450000, 900000, 2000000, 300000, 600000][i],
  currency: 'XOF',
  valid_until: new Date(Date.now() + (30 - i * 5) * 86400000).toISOString(),
  status: ['draft', 'sent', 'viewed', 'accepted', 'refused', 'expired'][i % 6],
  created_at: new Date(Date.now() - i * 86400000 * 4).toISOString(),
}))

export default function OffersIndex({ offers: propOffers }) {
  const offers = propOffers ?? MOCK_OFFERS

  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtAmount = v => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v)

  const sendOffer = async (id) => {
    try { await axios.post(`/superadmin/crm/offers/${id}/send`); alert('Offre envoyée par email.') }
    catch { alert('Erreur envoi') }
  }

  const duplicateOffer = (id) => { router.post(`/superadmin/crm/offers/${id}/duplicate`) }

  const total_draft    = offers.filter(o => o.status === 'draft').length
  const total_sent     = offers.filter(o => ['sent', 'viewed'].includes(o.status)).length
  const total_accepted = offers.filter(o => o.status === 'accepted').length
  const revenue_pipeline = offers.filter(o => !['refused', 'expired'].includes(o.status)).reduce((a, o) => a + o.amount, 0)

  return (
    <SuperAdminLayout title="Offres commerciales">
      <Head title="Offres — CRM Super Admin" />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Brouillons', value: total_draft, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-700/50' },
          { label: 'En cours', value: total_sent, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Acceptées', value: total_accepted, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Pipeline total', value: fmtAmount(revenue_pipeline), color: 'text-[#1A3A5C]', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 ${k.bg}`}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{k.label}</p>
            <p className={`text-xl font-bold mt-0.5 tabular-nums ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end mb-4">
        <Link href="/superadmin/crm/offers/create" className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#1A3A5C] text-white rounded-lg hover:bg-[#122a45] transition-colors">
          <Ic.Plus /> Nouvelle offre
        </Link>
      </div>

      {/* Tableau */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['N° Offre', 'Prospect / Client', 'Logiciel', 'Plan', 'Montant', 'Validité', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {offers.map(o => {
                const stat = STATUS_MAP[o.status] ?? { label: o.status, cls: 'bg-gray-100 text-gray-600' }
                const isExpiringSoon = new Date(o.valid_until) - Date.now() < 86400000 * 5 && !['accepted', 'refused', 'expired'].includes(o.status)
                return (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#1A3A5C] dark:text-blue-400">{o.number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{o.prospect_name}</p>
                      <p className="text-xs text-gray-400">{o.company}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{o.software}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${o.plan === 'Enterprise' ? 'bg-amber-100 text-amber-800' : o.plan === 'Pro' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>{o.plan}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white tabular-nums">{fmtAmount(o.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${isExpiringSoon ? 'text-red-600 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                        {fmtDate(o.valid_until)}
                        {isExpiringSoon && ' ⚠'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${stat.cls}`}>{stat.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a href={`/superadmin/crm/offers/${o.id}/pdf`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-gray-400 hover:text-[#1A3A5C] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Voir PDF"><Ic.FileText /></a>
                        {['draft', 'sent', 'viewed'].includes(o.status) && (
                          <button onClick={() => sendOffer(o.id)} className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Renvoyer"><Ic.Mail /></button>
                        )}
                        <button onClick={() => duplicateOffer(o.id)} className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Dupliquer"><Ic.Copy /></button>
                        {o.status === 'accepted' && (
                          <Link href={`/superadmin/payments/create?offer=${o.id}`} className="p-1.5 rounded-md text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors" title="Convertir en commande"><Ic.ArrowRight /></Link>
                        )}
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
