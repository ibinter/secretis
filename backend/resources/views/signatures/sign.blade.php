<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Signature électronique — {{ $request->title }}</title>
    <meta name="robots" content="noindex, nofollow" />
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --primary:   #1E3A5F;
            --accent:    #2563EB;
            --success:   #16A34A;
            --danger:    #DC2626;
            --bg:        #F8FAFC;
            --border:    #E2E8F0;
            --text:      #1E293B;
            --muted:     #64748B;
        }

        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
        }

        /* ── Header ── */
        .header {
            background: var(--primary);
            color: white;
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 2px 8px rgba(0,0,0,.2);
        }
        .header img { height: 40px; }
        .header h1 { font-size: 1.1rem; font-weight: 600; }
        .header p  { font-size: .85rem; opacity: .8; }

        /* ── Layout principal ── */
        .layout {
            display: grid;
            grid-template-columns: 1fr 420px;
            gap: 1.5rem;
            padding: 1.5rem;
            max-width: 1400px;
            margin: 0 auto;
        }
        @media (max-width: 900px) {
            .layout { grid-template-columns: 1fr; }
        }

        /* ── PDF Viewer ── */
        .pdf-panel {
            background: white;
            border-radius: 12px;
            border: 1px solid var(--border);
            overflow: hidden;
            min-height: 600px;
        }
        .pdf-panel iframe {
            width: 100%;
            height: 700px;
            border: none;
            display: block;
        }
        .pdf-unavailable {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 400px;
            color: var(--muted);
            gap: .5rem;
        }
        .pdf-unavailable svg { width: 48px; height: 48px; }

        /* ── Panneau de signature ── */
        .sign-panel {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .card {
            background: white;
            border-radius: 12px;
            border: 1px solid var(--border);
            padding: 1.25rem;
        }
        .card h2 {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: .5rem;
            color: var(--primary);
        }

        /* Info document */
        .doc-info p { font-size: .88rem; color: var(--muted); margin: .2rem 0; }
        .doc-info strong { color: var(--text); }

        /* Message de l'expéditeur */
        .message-box {
            background: #EFF6FF;
            border-left: 3px solid var(--accent);
            padding: .75rem 1rem;
            border-radius: 0 8px 8px 0;
            font-size: .88rem;
            color: var(--text);
        }

        /* Badge signataires */
        .signers-list { display: flex; flex-direction: column; gap: .4rem; }
        .signer-item {
            display: flex;
            align-items: center;
            gap: .5rem;
            font-size: .85rem;
        }
        .signer-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .dot-pending  { background: #F59E0B; }
        .dot-signed   { background: #16A34A; }
        .dot-declined { background: #DC2626; }

        /* ── Zone de dessin signature ── */
        .canvas-wrapper {
            position: relative;
            border: 2px dashed var(--border);
            border-radius: 8px;
            background: #FAFAFA;
            cursor: crosshair;
            touch-action: none;
        }
        .canvas-wrapper canvas {
            display: block;
            width: 100%;
            height: 180px;
            border-radius: 6px;
        }
        .canvas-placeholder {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            color: #CBD5E1;
            font-size: .9rem;
            gap: .5rem;
        }
        .canvas-placeholder svg { width: 24px; opacity: .5; }

        /* Boutons canvas */
        .canvas-actions {
            display: flex;
            gap: .5rem;
            margin-top: .5rem;
        }
        .btn-clear {
            flex: 1;
            padding: .5rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: white;
            color: var(--muted);
            cursor: pointer;
            font-size: .85rem;
            transition: all .15s;
        }
        .btn-clear:hover { border-color: var(--danger); color: var(--danger); }

        /* Case légale */
        .legal-check {
            display: flex;
            align-items: flex-start;
            gap: .75rem;
            font-size: .82rem;
            color: var(--muted);
            line-height: 1.5;
        }
        .legal-check input[type="checkbox"] {
            width: 18px; height: 18px;
            flex-shrink: 0;
            margin-top: 2px;
            accent-color: var(--accent);
            cursor: pointer;
        }
        .legal-check a { color: var(--accent); text-decoration: none; }

        /* Boutons d'action principaux */
        .action-buttons { display: flex; flex-direction: column; gap: .75rem; }
        .btn-sign {
            padding: .85rem 1.5rem;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background .2s, transform .1s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: .5rem;
        }
        .btn-sign:hover:not(:disabled)    { background: #1D4ED8; }
        .btn-sign:active:not(:disabled)   { transform: scale(.98); }
        .btn-sign:disabled { opacity: .5; cursor: not-allowed; }

        .btn-decline {
            padding: .75rem;
            background: white;
            color: var(--danger);
            border: 1px solid var(--danger);
            border-radius: 10px;
            font-size: .9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all .15s;
        }
        .btn-decline:hover { background: #FEF2F2; }

        /* Expiration badge */
        .expiry-badge {
            display: flex;
            align-items: center;
            gap: .4rem;
            font-size: .8rem;
            color: #92400E;
            background: #FEF3C7;
            padding: .4rem .75rem;
            border-radius: 6px;
        }

        /* Toast notification */
        .toast {
            position: fixed;
            top: 1rem;
            right: 1rem;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            font-size: .9rem;
            font-weight: 500;
            z-index: 9999;
            transform: translateX(120%);
            transition: transform .3s ease;
            max-width: 380px;
        }
        .toast.show { transform: translateX(0); }
        .toast-success { background: #DCFCE7; color: #166534; border: 1px solid #A7F3D0; }
        .toast-error   { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }

        /* Modal refus */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.5);
            z-index: 1000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .modal-overlay.open { display: flex; }
        .modal {
            background: white;
            border-radius: 16px;
            padding: 1.5rem;
            width: 100%;
            max-width: 440px;
        }
        .modal h3 { font-size: 1.1rem; font-weight: 600; color: var(--danger); margin-bottom: 1rem; }
        .modal textarea {
            width: 100%;
            padding: .75rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: .9rem;
            resize: vertical;
            min-height: 100px;
            outline: none;
        }
        .modal textarea:focus { border-color: var(--accent); }
        .modal-actions { display: flex; gap: .75rem; margin-top: 1rem; }
        .modal-actions button {
            flex: 1;
            padding: .7rem;
            border-radius: 8px;
            font-size: .9rem;
            font-weight: 500;
            cursor: pointer;
            border: 1px solid transparent;
        }
        .btn-modal-cancel  { background: white; border-color: var(--border); color: var(--text); }
        .btn-modal-confirm { background: var(--danger); color: white; }

        /* Success state */
        .success-state {
            display: none;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 2rem;
            gap: 1rem;
        }
        .success-state.show { display: flex; }
        .success-icon { font-size: 4rem; }
        .success-state h2 { color: var(--success); font-size: 1.25rem; }
        .success-state p  { color: var(--muted); font-size: .9rem; }

        /* Spinner */
        .spinner {
            width: 20px; height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin .7s linear infinite;
            display: none;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>

<!-- ── Header ── -->
<header class="header">
    <div>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="white" opacity=".15"/>
            <path d="M18 6L28 12V24L18 30L8 24V12L18 6Z" fill="white" opacity=".9"/>
        </svg>
    </div>
    <div>
        <h1>SECRETIS — Signature Électronique</h1>
        <p>{{ $request->title }}</p>
    </div>
</header>

<!-- ── Layout principal ── -->
<main class="layout">

    <!-- Panneau PDF -->
    <div class="pdf-panel">
        @if($documentUrl)
            <iframe src="{{ $documentUrl }}" title="Document à signer"></iframe>
        @else
            <div class="pdf-unavailable">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p>Aperçu du document non disponible</p>
                <small>Veuillez vous référer au document qui vous a été transmis par email.</small>
            </div>
        @endif
    </div>

    <!-- Panneau de signature -->
    <aside class="sign-panel">

        <!-- Info document -->
        <div class="card doc-info">
            <h2>Document à signer</h2>
            <p><strong>{{ $request->document->title }}</strong></p>
            @if($request->expires_at)
            <div class="expiry-badge" style="margin-top:.5rem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                Expire le {{ \Carbon\Carbon::parse($request->expires_at)->format('d/m/Y à H:i') }}
            </div>
            @endif
        </div>

        <!-- Message de l'expéditeur -->
        @if($request->message)
        <div class="card">
            <h2>Message de l'expéditeur</h2>
            <div class="message-box">{{ $request->message }}</div>
        </div>
        @endif

        <!-- Signataires -->
        <div class="card">
            <h2>Signataires ({{ $request->signers->count() }})</h2>
            <div class="signers-list">
                @foreach($request->signers->sortBy('order') as $s)
                <div class="signer-item">
                    <span class="signer-dot dot-{{ $s->status }}"></span>
                    <span>{{ $s->name }}</span>
                    <span style="color:var(--muted);font-size:.8rem">— {{ $s->email }}</span>
                    @if($s->id === $signer->id)
                        <span style="color:var(--accent);font-size:.75rem;font-weight:600">(vous)</span>
                    @endif
                </div>
                @endforeach
            </div>
        </div>

        <!-- Zone de signature -->
        <div class="card" id="signSection">
            <h2>Votre signature</h2>
            <p style="font-size:.82rem;color:var(--muted);margin-bottom:.75rem">
                Dessinez votre signature dans le cadre ci-dessous.
            </p>
            <div class="canvas-wrapper" id="canvasWrapper">
                <canvas id="signatureCanvas" width="800" height="300"></canvas>
                <div class="canvas-placeholder" id="canvasPlaceholder">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                    Signez ici
                </div>
            </div>
            <div class="canvas-actions">
                <button class="btn-clear" id="btnClear" type="button">
                    ✕ Effacer
                </button>
            </div>
        </div>

        <!-- Acceptation légale -->
        <div class="card">
            <label class="legal-check">
                <input type="checkbox" id="legalCheck" />
                <span>
                    Je, <strong>{{ $signer->name }}</strong>, reconnais avoir lu et approuvé ce document.
                    Ma signature électronique a valeur probante conformément à la
                    <strong>loi n°2013-546 sur les transactions électroniques</strong>.
                </span>
            </label>
        </div>

        <!-- Boutons d'action -->
        <div class="action-buttons" id="formSection">
            <button class="btn-sign" id="btnSign" type="button" disabled>
                <span class="spinner" id="signSpinner"></span>
                <svg id="signIcon" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Signer le document
            </button>
            <button class="btn-decline" id="btnDecline" type="button">
                Refuser de signer
            </button>
        </div>

        <!-- État succès -->
        <div class="success-state card" id="successState">
            <div class="success-icon">✅</div>
            <h2>Document signé</h2>
            <p>Votre signature a été enregistrée avec succès.<br>
               Un email de confirmation vous a été envoyé.</p>
        </div>

    </aside>
</main>

<!-- Modal de refus -->
<div class="modal-overlay" id="declineModal">
    <div class="modal">
        <h3>⚠ Refus de signature</h3>
        <p style="font-size:.88rem;color:var(--muted);margin-bottom:1rem">
            Veuillez indiquer la raison de votre refus. L'expéditeur sera notifié.
        </p>
        <textarea id="declineReason" placeholder="Motif du refus..." maxlength="500"></textarea>
        <div class="modal-actions">
            <button class="btn-modal-cancel" id="btnModalCancel">Annuler</button>
            <button class="btn-modal-confirm" id="btnModalConfirm">Confirmer le refus</button>
        </div>
    </div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<script>
(function () {
    'use strict';

    const canvas      = document.getElementById('signatureCanvas');
    const ctx         = canvas.getContext('2d');
    const wrapper     = document.getElementById('canvasWrapper');
    const placeholder = document.getElementById('canvasPlaceholder');
    const btnClear    = document.getElementById('btnClear');
    const btnSign     = document.getElementById('btnSign');
    const btnDecline  = document.getElementById('btnDecline');
    const legalCheck  = document.getElementById('legalCheck');
    const signSpinner = document.getElementById('signSpinner');
    const signIcon    = document.getElementById('signIcon');
    const successState = document.getElementById('successState');
    const formSection  = document.getElementById('formSection');
    const signSection  = document.getElementById('signSection');
    const modal        = document.getElementById('declineModal');

    // ── Variables d'état ────────────────────────────────────────────────────
    let isDrawing   = false;
    let hasSigned   = false;
    let paths       = [];      // [{x, y}[]]
    let currentPath = [];

    // ── Configuration du canvas ─────────────────────────────────────────────
    ctx.strokeStyle = '#1E3A5F';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / rect.width;
        const scaleY = canvas.height / rect.height;
        const touch  = e.touches ? e.touches[0] : e;
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top)  * scaleY,
        };
    }

    function startDraw(e) {
        e.preventDefault();
        isDrawing   = true;
        currentPath = [];
        const pos   = getPos(e);
        currentPath.push(pos);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        placeholder.style.display = 'none';
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        currentPath.push(pos);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    function endDraw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        isDrawing = false;
        if (currentPath.length > 1) {
            paths.push([...currentPath]);
            hasSigned = true;
        }
        updateSignButton();
    }

    // Souris
    canvas.addEventListener('mousedown',  startDraw);
    canvas.addEventListener('mousemove',  draw);
    canvas.addEventListener('mouseup',    endDraw);
    canvas.addEventListener('mouseleave', endDraw);

    // Tactile
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove',  draw,      { passive: false });
    canvas.addEventListener('touchend',   endDraw,   { passive: false });

    // Pointer events (stylet)
    canvas.addEventListener('pointerdown', startDraw);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup',   endDraw);

    // ── Effacer ─────────────────────────────────────────────────────────────
    btnClear.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        paths       = [];
        currentPath = [];
        hasSigned   = false;
        placeholder.style.display = '';
        updateSignButton();
    });

    // ── Case légale ─────────────────────────────────────────────────────────
    legalCheck.addEventListener('change', updateSignButton);

    function updateSignButton() {
        btnSign.disabled = !(hasSigned && legalCheck.checked);
    }

    // ── Soumettre la signature ───────────────────────────────────────────────
    btnSign.addEventListener('click', async () => {
        if (!hasSigned || !legalCheck.checked) return;

        const imageBase64 = canvas.toDataURL('image/png');

        btnSign.disabled    = true;
        signSpinner.style.display = 'block';
        signIcon.style.display    = 'none';

        try {
            const res = await fetch(window.location.pathname, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '{{ csrf_token() }}',
                    'Accept':       'application/json',
                },
                body: JSON.stringify({
                    paths:          paths,
                    image_base64:   imageBase64,
                    legal_accepted: true,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                signSection.style.display  = 'none';
                formSection.style.display  = 'none';
                successState.classList.add('show');
                showToast('Signature enregistrée avec succès !', 'success');
            } else {
                throw new Error(data.message || 'Erreur lors de la signature.');
            }
        } catch (err) {
            showToast(err.message, 'error');
            btnSign.disabled          = false;
            signSpinner.style.display = 'none';
            signIcon.style.display    = '';
        }
    });

    // ── Refuser ─────────────────────────────────────────────────────────────
    btnDecline.addEventListener('click', () => {
        modal.classList.add('open');
        document.getElementById('declineReason').value = '';
    });

    document.getElementById('btnModalCancel').addEventListener('click', () => {
        modal.classList.remove('open');
    });

    document.getElementById('btnModalConfirm').addEventListener('click', async () => {
        const reason = document.getElementById('declineReason').value.trim();
        if (!reason) {
            showToast('Veuillez indiquer un motif.', 'error');
            return;
        }

        try {
            const res = await fetch(window.location.pathname + '/decline', {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '{{ csrf_token() }}',
                    'Accept':       'application/json',
                },
                body: JSON.stringify({ reason }),
            });

            const data = await res.json();
            if (res.ok) {
                modal.classList.remove('open');
                showToast('Refus enregistré.', 'success');
                setTimeout(() => window.close(), 2000);
            } else {
                throw new Error(data.message || 'Erreur.');
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // ── Toast ────────────────────────────────────────────────────────────────
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className   = `toast toast-${type} show`;
        setTimeout(() => toast.classList.remove('show'), 4000);
    }
})();
</script>
</body>
</html>
