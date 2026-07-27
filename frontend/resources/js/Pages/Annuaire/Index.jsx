import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

export default function AnnuaireIndex() {
    const { contacts = { data: [] }, stats = { total: 0 }, filters = {} } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const [type, setType]     = useState(filters.type || '');

    const doSearch = (e) => {
        e.preventDefault();
        router.get('/annuaire', { search, type }, { preserveState: true, replace: true });
    };

    const initials = (c) => {
        const fn = c.first_name || '';
        const ln = c.last_name  || '';
        return ((fn[0] || '') + (ln[0] || '')).toUpperCase() || '?';
    };

    const fullName = (c) => [c.first_name, c.last_name].filter(Boolean).join(' ') || '—';

    return (
        <AppLayout>
            <Head title="Annuaire — Contacts" />
            <div style={{ padding: 24, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0b1220', margin: 0 }}>Annuaire</h1>
                        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>{stats.total} contact{stats.total !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                        onClick={() => router.get('/annuaire/create')}
                        style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                    >
                        + Nouveau contact
                    </button>
                </div>
                <form onSubmit={doSearch} style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher nom, email, entreprise…"
                        style={{ flex: 1, minWidth: 200, padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
                    />
                    <select
                        value={type}
                        onChange={e => setType(e.target.value)}
                        style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' }}
                    >
                        <option value="">Tous les types</option>
                        <option value="internal">Internes</option>
                        <option value="external">Externes</option>
                    </select>
                    <button type="submit" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
                        Filtrer
                    </button>
                </form>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    {contacts.data.length === 0 ? (
                        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                            <p style={{ fontSize: 16 }}>Aucun contact trouvé</p>
                        </div>
                    ) : contacts.data.map((c, i) => (
                        <div
                            key={c.id || i}
                            style={{ padding: '14px 20px', borderTop: i === 0 ? 'none' : '1px solid #f1f5f9', display: 'flex', gap: 14, alignItems: 'center' }}
                        >
                            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#ede9fe', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#7c3aed', fontSize: 15, flexShrink: 0 }}>
                                {initials(c)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 15 }}>{fullName(c)}</div>
                                <div style={{ fontSize: 13, color: '#64748b' }}>
                                    {[c.job_title, c.company].filter(Boolean).join(' — ') || c.email || '—'}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
                                {c.email && <span style={{ fontSize: 13, color: '#64748b' }}>{c.email}</span>}
                                {(c.phone || c.mobile) && <span style={{ fontSize: 13, color: '#94a3b8' }}>{c.phone || c.mobile}</span>}
                                <span style={{
                                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                                    background: c.type === 'internal' ? '#dbeafe' : '#f0fdf4',
                                    color: c.type === 'internal' ? '#1d4ed8' : '#15803d',
                                }}>
                                    {c.type === 'internal' ? 'Interne' : 'Externe'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                {contacts.last_page > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                        {contacts.links && contacts.links.map((link, i) => (
                            <button
                                key={i}
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                                style={{
                                    padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                                    background: link.active ? '#7c3aed' : '#fff',
                                    color: link.active ? '#fff' : '#374151',
                                    cursor: link.url ? 'pointer' : 'default', fontSize: 13,
                                    opacity: link.url ? 1 : 0.4,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
