import React, { useRef } from 'react';

// ─── BadgePreview — Composant de previsualisation du badge visiteur ───────────
// Rendu A6 (105x148mm) en HTML/CSS, imprimable via window.print()
export default function BadgePreview({ visit, visitor, host, org, qrCodeBase64, badgeColor = '#27AE60', mode = 'paper' }) {
    const badgeRef = useRef(null);

    const handlePrint = () => {
        window.print();
    };

    const colors = {
        '#27AE60': { bg: '#27AE60', label: 'Accès libre' },
        '#F39C12': { bg: '#F39C12', label: 'Escorte requise' },
        '#E74C3C': { bg: '#E74C3C', label: 'Zone confidentielle' },
    };
    const colorInfo = colors[badgeColor] || colors['#27AE60'];

    const formatTime = (dt) => dt ? new Date(dt).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) : '—';
    const formatDate = (dt) => dt ? new Date(dt).toLocaleDateString('fr-FR') : '—';

    const initials = (name) => name?.split(' ').map(p => p[0]).join('').toUpperCase().substring(0, 2) || '?';

    return (
        <>
            {/* Badge affiche a l ecran */}
            <div ref={badgeRef} id="visitor-badge" className="badge-wrapper">
                <div className="badge" style={{ '--badge-color': badgeColor }}>
                    {/* En-tete organisation */}
                    <div className="badge-header">
                        {org?.logo_path ? (
                            <img src={`/storage/${org.logo_path}`} alt={org.name} className="org-logo" />
                        ) : (
                            <div className="org-logo-placeholder">{initials(org?.name || 'IBIG')}</div>
                        )}
                        <div>
                            <div className="org-name">{org?.name || 'IBIG SECRETIS'}</div>
                            <div className="org-addr">{org?.address || ''}</div>
                        </div>
                    </div>

                    {/* Bandeau VISITEUR */}
                    <div className="badge-type">VISITEUR</div>

                    {/* Corps */}
                    <div className="badge-body">
                        {/* Photo */}
                        <div className="photo-area">
                            {visitor?.photo_path ? (
                                <img src={`/storage/${visitor.photo_path}`} alt={visitor.full_name} className="visitor-photo" />
                            ) : (
                                <div className="visitor-photo-placeholder">{initials(visitor?.full_name)}</div>
                            )}
                        </div>

                        {/* Nom */}
                        <div className="visitor-name">{visitor?.full_name}</div>
                        {visitor?.company && <div className="visitor-company">{visitor.company}</div>}

                        {/* Badge d acces */}
                        <div className="access-badge" style={{ background: badgeColor }}>
                            {colorInfo.label}
                        </div>

                        <hr className="divider" />

                        {/* Details visite */}
                        <div className="info-grid">
                            <InfoRow label="Hôte"     value={host?.name || '—'} />
                            <InfoRow label="Motif"    value={visit?.purpose ? visit.purpose.charAt(0).toUpperCase() + visit.purpose.slice(1) : '—'} />
                            <InfoRow label="Arrivée"  value={formatTime(visit?.check_in_at)} />
                            {visit?.location && <InfoRow label="Lieu" value={visit.location} />}
                        </div>

                        <hr className="divider" />

                        {/* QR Code */}
                        <div className="qr-section">
                            {qrCodeBase64 && (
                                <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR" className="qr-img" />
                            )}
                            <div className="qr-info">
                                <div className="badge-num">{visitor?.badge_number}</div>
                                <div className="qr-hint">Scan pour check-out</div>
                                <div className="validity">Valable : {formatDate(visit?.check_in_at)} uniquement</div>
                            </div>
                        </div>
                    </div>

                    {/* Pied */}
                    <div className="badge-footer">
                        Badge personnel non transmissible — IBIG SECRETIS
                    </div>
                </div>
            </div>

            {/* Boutons d action */}
            <div className="badge-actions no-print">
                <button onClick={handlePrint} className="btn-print">
                    🖨️ Imprimer le badge
                </button>
                {mode === 'screen' && (
                    <div className="screen-note">
                        📱 Mode tablette — montrez ce badge à la caméra de contrôle
                    </div>
                )}
            </div>

            {/* Styles inline pour l impression */}
            <style>{`
                .badge-wrapper {
                    display: flex;
                    justify-content: center;
                    padding: 16px;
                }
                .badge {
                    width: 105mm;
                    min-height: 148mm;
                    background: #fff;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0,0,0,.15);
                    display: flex;
                    flex-direction: column;
                    font-family: 'Segoe UI', Arial, sans-serif;
                }
                .badge-header {
                    background: var(--badge-color, #27AE60);
                    color: #fff;
                    padding: 10px 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .org-logo { width: 38px; height: 38px; object-fit: contain; border-radius: 6px; background: rgba(255,255,255,.2); padding: 3px; }
                .org-logo-placeholder {
                    width: 38px; height: 38px; border-radius: 6px; background: rgba(255,255,255,.3);
                    display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;
                }
                .org-name { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }
                .org-addr { font-size: 8px; opacity: .7; }
                .badge-type {
                    background: var(--badge-color, #27AE60);
                    color: #fff;
                    text-align: center;
                    font-size: 22px;
                    font-weight: 900;
                    letter-spacing: 5px;
                    padding: 5px 0;
                    border-top: 2px solid rgba(0,0,0,.1);
                }
                .badge-body { padding: 10px 12px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
                .photo-area { display: flex; justify-content: center; }
                .visitor-photo, .visitor-photo-placeholder {
                    width: 62px; height: 62px; border-radius: 50%; border: 3px solid var(--badge-color);
                }
                .visitor-photo { object-fit: cover; }
                .visitor-photo-placeholder {
                    background: #e0e0e0; display: flex; align-items: center; justify-content: center;
                    font-size: 24px; font-weight: 800; color: #999;
                }
                .visitor-name { font-size: 15px; font-weight: 800; color: #1a1a2e; text-align: center; }
                .visitor-company { font-size: 10px; color: #666; text-align: center; }
                .access-badge {
                    align-self: center; color: #fff; font-size: 9px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: .5px; padding: 3px 10px; border-radius: 20px;
                }
                .divider { border: none; border-top: 1px dashed #ddd; margin: 3px 0; }
                .info-grid { display: flex; flex-direction: column; gap: 3px; }
                .info-row { display: flex; gap: 6px; font-size: 9px; }
                .info-label { color: #888; min-width: 52px; font-weight: 600; }
                .info-value { color: #1a1a2e; font-weight: 500; flex: 1; }
                .qr-section { display: flex; align-items: center; gap: 8px; background: #f8f9fa; border-radius: 6px; padding: 6px; margin-top: auto; }
                .qr-img { width: 58px; height: 58px; }
                .badge-num { font-size: 11px; font-weight: 800; color: var(--badge-color); }
                .qr-hint { font-size: 8px; color: #888; }
                .validity { font-size: 8px; color: #666; margin-top: 2px; }
                .badge-footer {
                    background: #9333EA; color: rgba(255,255,255,.6);
                    font-size: 7px; text-align: center; padding: 5px;
                }
                .badge-actions { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 12px; }
                .btn-print {
                    background: #9333EA; color: #fff; border: none; border-radius: 10px;
                    padding: 10px 28px; font-size: 14px; font-weight: 700; cursor: pointer;
                }
                .btn-print:hover { background: #0f2640; }
                .screen-note { font-size: 12px; color: #888; text-align: center; }

                @media print {
                    body > * { display: none !important; }
                    #visitor-badge, #visitor-badge * { display: block !important; visibility: visible !important; }
                    #visitor-badge { position: fixed !important; top: 0 !important; left: 0 !important; }
                    .no-print { display: none !important; }
                    .badge { box-shadow: none; }
                }
            `}</style>
        </>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="info-row">
            <span className="info-label">{label} :</span>
            <span className="info-value">{value}</span>
        </div>
    );
}
export { BadgePreview };
