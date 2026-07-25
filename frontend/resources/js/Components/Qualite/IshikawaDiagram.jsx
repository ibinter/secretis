import React, { useState, useRef } from 'react';

/**
 * IshikawaDiagram — Diagramme en arête de poisson (6M) interactif
 *
 * Props :
 *   value      : { matiere, methode, milieu, main_oeuvre, materiel, management } — tableau de causes par branche
 *   onChange   : (newValue) => void  — callback mise à jour
 *   problem    : string — titre du problème / effet (boîte de droite)
 *   readOnly   : boolean — désactive l'édition
 */
export default function IshikawaDiagram({ value = {}, onChange, problem = 'Problème', readOnly = false }) {
    const svgRef = useRef(null);

    // 6 branches : 3 en haut, 3 en bas
    const BRANCHES = [
        { key: 'matiere',    label: 'Matière',       angle: -45, side: 'top',    x: 180 },
        { key: 'methode',    label: 'Méthode',       angle: -45, side: 'top',    x: 380 },
        { key: 'milieu',     label: 'Milieu',        angle: -45, side: 'top',    x: 580 },
        { key: 'main_oeuvre',label: "Main-d'œuvre",  angle: 45,  side: 'bottom', x: 180 },
        { key: 'materiel',   label: 'Matériel',      angle: 45,  side: 'bottom', x: 380 },
        { key: 'management', label: 'Management',    angle: 45,  side: 'bottom', x: 580 },
    ];

    const W = 800;
    const H = 420;
    const SPINE_Y = H / 2;         // axe central
    const SPINE_X_START = 60;
    const SPINE_X_END   = W - 120;
    const BOX_W = 110;
    const BOX_H = 50;

    // Calcul du point d'intersection branche / épine
    const branchOriginY = (side) => (side === 'top' ? SPINE_Y - 110 : SPINE_Y + 110);

    const addCause = (branchKey) => {
        if (readOnly) return;
        const current = value[branchKey] ?? [];
        onChange({ ...value, [branchKey]: [...current, ''] });
    };

    const updateCause = (branchKey, idx, text) => {
        if (readOnly) return;
        const updated = [...(value[branchKey] ?? [])];
        updated[idx] = text;
        onChange({ ...value, [branchKey]: updated });
    };

    const removeCause = (branchKey, idx) => {
        if (readOnly) return;
        const updated = (value[branchKey] ?? []).filter((_, i) => i !== idx);
        onChange({ ...value, [branchKey]: updated });
    };

    // Export SVG
    const exportSvg = () => {
        const svg = svgRef.current;
        if (!svg) return;
        const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'ishikawa.svg';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Export PNG
    const exportPng = () => {
        const svg    = svgRef.current;
        if (!svg) return;
        const canvas = document.createElement('canvas');
        canvas.width  = W * 2;
        canvas.height = H * 2;
        const ctx     = canvas.getContext('2d');
        const img     = new Image();
        const svgBlob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
        const url     = URL.createObjectURL(svgBlob);
        img.onload = () => {
            ctx.scale(2, 2);
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, W, H);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(blob => {
                const a    = document.createElement('a');
                a.href     = URL.createObjectURL(blob);
                a.download = 'ishikawa.png';
                a.click();
            });
            URL.revokeObjectURL(url);
        };
        img.src = url;
    };

    return (
        <div className="space-y-3">
            {/* Boutons export */}
            <div className="flex justify-end gap-2">
                <button
                    onClick={exportSvg}
                    className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 transition"
                >
                    ↓ SVG
                </button>
                <button
                    onClick={exportPng}
                    className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 transition"
                >
                    ↓ PNG
                </button>
            </div>

            {/* Diagramme SVG */}
            <div className="overflow-x-auto rounded-xl border bg-gray-50">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${W} ${H}`}
                    width="100%"
                    style={{ minWidth: 600 }}
                    xmlns="http://www.w3.org/2000/svg"
                    className="font-sans"
                >
                    {/* Épine dorsale */}
                    <line
                        x1={SPINE_X_START}
                        y1={SPINE_Y}
                        x2={SPINE_X_END}
                        y2={SPINE_Y}
                        stroke="#374151"
                        strokeWidth={3}
                        markerEnd="url(#arrow)"
                    />

                    {/* Flèche */}
                    <defs>
                        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L8,3 z" fill="#374151" />
                        </marker>
                    </defs>

                    {/* Boîte Problème */}
                    <rect
                        x={SPINE_X_END}
                        y={SPINE_Y - BOX_H / 2}
                        width={BOX_W}
                        height={BOX_H}
                        rx={6}
                        fill="#EF4444"
                        stroke="#DC2626"
                        strokeWidth={1.5}
                    />
                    <foreignObject
                        x={SPINE_X_END}
                        y={SPINE_Y - BOX_H / 2}
                        width={BOX_W}
                        height={BOX_H}
                    >
                        <div xmlns="http://www.w3.org/1999/xhtml"
                            className="w-full h-full flex items-center justify-center text-white text-xs font-bold text-center p-1 leading-tight"
                        >
                            {problem}
                        </div>
                    </foreignObject>

                    {/* Branches */}
                    {BRANCHES.map((branch) => {
                        const bx    = branch.x;
                        const isSub = branch.side === 'top';
                        const by    = branchOriginY(branch.side);
                        const endY  = SPINE_Y;

                        return (
                            <g key={branch.key}>
                                {/* Ligne de branche principale */}
                                <line
                                    x1={bx}
                                    y1={by}
                                    x2={bx}
                                    y2={endY}
                                    stroke="#6B7280"
                                    strokeWidth={1.5}
                                    strokeDasharray="4 2"
                                />

                                {/* Label de branche */}
                                <rect
                                    x={bx - 45}
                                    y={isSub ? by - 26 : by + 6}
                                    width={90}
                                    height={20}
                                    rx={4}
                                    fill={isSub ? '#DBEAFE' : '#D1FAE5'}
                                    stroke={isSub ? '#93C5FD' : '#6EE7B7'}
                                />
                                <text
                                    x={bx}
                                    y={isSub ? by - 12 : by + 20}
                                    textAnchor="middle"
                                    fontSize={10}
                                    fontWeight="600"
                                    fill={isSub ? '#1D4ED8' : '#065F46'}
                                >
                                    {branch.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Formulaire causes par branche (sous le SVG) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {BRANCHES.map((branch) => {
                    const causes = value[branch.key] ?? [];
                    return (
                        <div
                            key={branch.key}
                            className="bg-white rounded-xl border p-3 space-y-2"
                        >
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-gray-800">{branch.label}</h4>
                                {!readOnly && (
                                    <button
                                        onClick={() => addCause(branch.key)}
                                        className="text-purple-600 text-xs hover:underline"
                                    >
                                        + Cause
                                    </button>
                                )}
                            </div>
                            {causes.length === 0 && (
                                <p className="text-xs text-gray-400 italic">Aucune cause enregistrée.</p>
                            )}
                            {causes.map((cause, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                    {readOnly
                                        ? <span className="text-xs text-gray-700 flex-1">• {cause}</span>
                                        : <>
                                            <input
                                                type="text"
                                                value={cause}
                                                onChange={e => updateCause(branch.key, idx, e.target.value)}
                                                placeholder="Saisir une cause..."
                                                className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                                            />
                                            <button
                                                onClick={() => removeCause(branch.key, idx)}
                                                className="text-red-400 hover:text-red-600 text-xs px-1"
                                            >
                                                ✕
                                            </button>
                                        </>
                                    }
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
export { IshikawaDiagram };
