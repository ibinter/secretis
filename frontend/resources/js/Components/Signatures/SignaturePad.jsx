import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * SignaturePad — Composant de dessin de signature réutilisable
 *
 * Supporte : souris, tactile (touch), stylet (Pointer Events API).
 * Exporte la signature en PNG base64 et en tableau de paths SVG.
 *
 * Props :
 *   onChange(data) — appelé à chaque fin de tracé : { imageBase64, paths, isEmpty }
 *   width          — largeur (défaut : 100%)
 *   height         — hauteur en px (défaut : 180)
 *   strokeColor    — couleur du tracé (défaut : '#1E3A5F')
 *   strokeWidth    — épaisseur du trait (défaut : 2.5)
 *   disabled       — désactiver le pad
 *   className      — classes CSS supplémentaires
 */
export default function SignaturePad({
    onChange,
    height      = 180,
    strokeColor = '#1E3A5F',
    strokeWidth = 2.5,
    disabled    = false,
    className   = '',
}) {
    const canvasRef      = useRef(null);
    const isDrawingRef   = useRef(false);
    const pathsRef       = useRef([]);      // tableau de [{x,y}[]]
    const currentPathRef = useRef([]);
    const [isEmpty, setIsEmpty] = useState(true);

    // ── Initialisation canvas ──────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Résolution haute densité (Retina)
        const dpr  = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width  * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth   = strokeWidth;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
    }, [strokeColor, strokeWidth]);

    // ── Coordonnées relatives au canvas ────────────────────────────────────
    const getPos = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect   = canvas.getBoundingClientRect();
        const source = e.touches ? e.touches[0] : e;
        return {
            x: source.clientX - rect.left,
            y: source.clientY - rect.top,
        };
    }, []);

    // ── Début du tracé ─────────────────────────────────────────────────────
    const startDraw = useCallback((e) => {
        if (disabled) return;
        e.preventDefault();
        isDrawingRef.current   = true;
        currentPathRef.current = [];
        const pos = getPos(e);
        currentPathRef.current.push(pos);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    }, [disabled, getPos]);

    // ── Tracé en cours ─────────────────────────────────────────────────────
    const draw = useCallback((e) => {
        if (!isDrawingRef.current || disabled) return;
        e.preventDefault();
        const pos = getPos(e);
        currentPathRef.current.push(pos);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    }, [disabled, getPos]);

    // ── Fin du tracé ───────────────────────────────────────────────────────
    const endDraw = useCallback((e) => {
        if (!isDrawingRef.current) return;
        e?.preventDefault();
        isDrawingRef.current = false;

        if (currentPathRef.current.length > 1) {
            pathsRef.current.push([...currentPathRef.current]);
            currentPathRef.current = [];
            setIsEmpty(false);

            // Notifier le parent
            const canvas = canvasRef.current;
            if (canvas && onChange) {
                onChange({
                    imageBase64: canvas.toDataURL('image/png'),
                    paths: pathsRef.current,
                    isEmpty: false,
                });
            }
        }
    }, [onChange]);

    // ── Effacer ────────────────────────────────────────────────────────────
    const clear = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pathsRef.current       = [];
        currentPathRef.current = [];
        setIsEmpty(true);
        onChange?.({ imageBase64: null, paths: [], isEmpty: true });
    }, [onChange]);

    // ── Attacher les événements ────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Pointer events (unifié souris + tactile + stylet)
        canvas.addEventListener('pointerdown', startDraw);
        canvas.addEventListener('pointermove', draw);
        canvas.addEventListener('pointerup',   endDraw);
        canvas.addEventListener('pointerleave', endDraw);

        return () => {
            canvas.removeEventListener('pointerdown', startDraw);
            canvas.removeEventListener('pointermove', draw);
            canvas.removeEventListener('pointerup',   endDraw);
            canvas.removeEventListener('pointerleave', endDraw);
        };
    }, [startDraw, draw, endDraw]);

    return (
        <div className={`relative select-none ${className}`}>
            {/* Canvas de dessin */}
            <div
                style={{ height }}
                className={`
                    relative rounded-xl border-2 overflow-hidden
                    ${disabled
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        : isEmpty
                            ? 'border-dashed border-gray-300 bg-gray-50 cursor-crosshair hover:border-purple-400'
                            : 'border-solid border-purple-400 bg-white cursor-crosshair'
                    }
                    transition-colors duration-200
                `}
            >
                <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
                />

                {/* Placeholder si vide */}
                {isEmpty && !disabled && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-400 gap-2">
                        <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                        <span className="text-sm">Signez ici</span>
                        <span className="text-xs opacity-60">Souris, doigt ou stylet</span>
                    </div>
                )}

                {disabled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
                        <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                    </div>
                )}
            </div>

            {/* Barre d'outils */}
            {!disabled && (
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                        {isEmpty ? 'Aucune signature' : 'Signature dessinée'}
                    </span>
                    <button
                        type="button"
                        onClick={clear}
                        disabled={isEmpty}
                        className="
                            inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg
                            border border-gray-200 text-gray-500
                            hover:border-red-300 hover:text-red-500 hover:bg-red-50
                            disabled:opacity-40 disabled:cursor-not-allowed
                            transition-colors duration-150
                        "
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Effacer
                    </button>
                </div>
            )}
        </div>
    );
}
export { SignaturePad };
