{{--
    Page PUBLIQUE de signature électronique (page web, pas un PDF).
    Appelé par : App\Http\Controllers\SignatureController::signPage() (ligne 226)
    Variables :
      $signer       App\Models\SignatureRequestSigner : id, request_id, user_id, name, email,
                    order, status ('pending' ici), signed_at, decline_reason, ip_address,
                    user_agent, token
      $request      App\Models\SignatureRequest (relations chargées : document, signers) :
                    id, organization_id, document_id, title, message, status, signing_order,
                    expires_at, completed_at, created_by
      $documentUrl  string|null  URL temporaire du PDF à signer (peut être null)

    Endpoints attendus par le contrôleur :
      POST {token}          -> submitSignature : { paths: array (min 1), image_base64: string,
                              legal_accepted: bool (accepted) } — réponse JSON
      POST {token}/decline  -> declineSignature : { reason: string (max 500) } — réponse JSON
--}}
@php
    $token = $signer->token ?? '';

    // Les noms de routes vivent dans routes/api/signatures.php ; on retombe sur une URL
    // construite manuellement si ce fichier de routes n'est pas chargé.
    $submitUrl = \Illuminate\Support\Facades\Route::has('signatures.sign.submit')
        ? route('signatures.sign.submit', ['token' => $token])
        : url('/api/signatures/sign/' . $token);

    $declineUrl = \Illuminate\Support\Facades\Route::has('signatures.sign.decline')
        ? route('signatures.sign.decline', ['token' => $token])
        : url('/api/signatures/sign/' . $token . '/decline');

    $expiresAt = $request->expires_at ?? null;
    $signers   = $request->signers ?? collect();
    $docTitle  = $request->document->title
        ?? $request->document->file_name
        ?? $request->title
        ?? 'Document';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="csrf-token" content="{{ csrf_token() }}">
<title>Signature electronique — {{ $request->title ?? 'Document' }}</title>
<style>
    :root { --purple: #9333EA; --purple-dark: #6b21a8; --purple-soft: #faf5ff;
            --border: #e5e7eb; --text: #1f2937; --muted: #6b7280; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f0fa; color: var(--text);
           font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
           font-size: 15px; line-height: 1.6; }

    header.top { background: var(--purple); color: #fff; padding: 18px 20px; text-align: center; }
    header.top .brand { font-size: 18px; font-weight: 700; }
    header.top .tag { font-size: 12px; color: #e9d5ff; }

    .wrap { max-width: 940px; margin: 0 auto; padding: 20px; }
    .card { background: #fff; border: 1px solid var(--border); border-radius: 12px;
            padding: 20px; margin-bottom: 18px; }
    .card h2 { font-size: 16px; margin: 0 0 12px; color: var(--purple-dark); }

    dl.meta { display: grid; grid-template-columns: 1fr; gap: 6px; margin: 0; }
    dl.meta div { display: flex; justify-content: space-between; gap: 12px;
                  border-bottom: 1px solid #f3f4f6; padding: 6px 0; }
    dl.meta dt { color: var(--muted); font-size: 13px; margin: 0; }
    dl.meta dd { margin: 0; font-weight: 600; text-align: right; word-break: break-word; }

    .msg { background: var(--purple-soft); border-left: 3px solid var(--purple);
           padding: 12px 14px; border-radius: 0 8px 8px 0; font-size: 14px; }

    .doc-frame { width: 100%; height: 60vh; min-height: 380px; border: 1px solid var(--border);
                 border-radius: 8px; background: #f9fafb; }
    .doc-missing { border: 1px dashed #d1d5db; border-radius: 8px; padding: 26px;
                   text-align: center; color: var(--muted); font-size: 14px; }
    .doc-missing a { color: var(--purple-dark); }

    ul.signers { list-style: none; margin: 0; padding: 0; font-size: 14px; }
    ul.signers li { display: flex; justify-content: space-between; gap: 10px;
                    padding: 7px 0; border-bottom: 1px solid #f3f4f6; }
    .pill { font-size: 12px; padding: 2px 9px; border-radius: 999px; white-space: nowrap; }
    .pill-pending { background: #fef3c7; color: #92400e; }
    .pill-signed { background: #dcfce7; color: #166534; }
    .pill-declined { background: #fee2e2; color: #991b1b; }

    .pad-wrap { border: 2px dashed #d8b4fe; border-radius: 10px; background: #fff;
                position: relative; touch-action: none; }
    canvas#pad { display: block; width: 100%; height: 210px; border-radius: 10px;
                 cursor: crosshair; touch-action: none; }
    .pad-hint { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%);
                text-align: center; color: #c4b5fd; font-size: 14px; pointer-events: none; }
    .pad-hint.hidden { display: none; }
    .pad-actions { margin-top: 10px; }

    label.consent { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px;
                    color: #374151; margin: 16px 0; cursor: pointer; }
    label.consent input { margin-top: 4px; width: 18px; height: 18px; flex: 0 0 auto; }

    .legal { font-size: 12px; color: var(--muted); background: #f9fafb;
             border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }

    button { font: inherit; border-radius: 8px; border: 1px solid transparent;
             padding: 12px 22px; cursor: pointer; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary { background: var(--purple); color: #fff; font-weight: 700; }
    .btn-ghost { background: #fff; color: var(--muted); border-color: var(--border);
                 padding: 8px 16px; font-size: 14px; }
    .btn-danger { background: #fff; color: #b91c1c; border-color: #fecaca; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }

    .alert { padding: 12px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 14px;
             display: none; }
    .alert.show { display: block; }
    .alert-error { background: #fee2e2; color: #991b1b; }
    .alert-ok { background: #dcfce7; color: #166534; }

    .decline-box { display: none; margin-top: 14px; }
    .decline-box.show { display: block; }
    textarea { width: 100%; min-height: 90px; border: 1px solid var(--border);
               border-radius: 8px; padding: 10px; font: inherit; resize: vertical; }

    footer.bottom { text-align: center; font-size: 12px; color: var(--muted);
                    padding: 10px 20px 34px; }
    footer.bottom strong { color: var(--purple-dark); }

    @media (min-width: 720px) {
        dl.meta { grid-template-columns: 1fr 1fr; column-gap: 26px; }
    }
</style>
</head>
<body>

<header class="top">
    <div class="brand">SECRETIS ERP</div>
    <div class="tag">Signature electronique — IBIG Soft</div>
</header>

<div class="wrap">

    <div id="alert" class="alert" role="alert" aria-live="polite"></div>

    <section class="card">
        <h2>{{ $request->title ?? 'Demande de signature' }}</h2>

        @if (!empty($request->message))
            <p class="msg">{{ $request->message }}</p>
        @endif

        <dl class="meta">
            <div><dt>Signataire</dt><dd>{{ $signer->name ?? '—' }}</dd></div>
            <div><dt>Adresse e-mail</dt><dd>{{ $signer->email ?? '—' }}</dd></div>
            <div><dt>Document</dt><dd>{{ $docTitle }}</dd></div>
            <div>
                <dt>Expiration du lien</dt>
                <dd>
                    {{ $expiresAt
                        ? \Carbon\Carbon::parse($expiresAt)->format('d/m/Y \a\ H:i')
                        : 'Sans expiration' }}
                </dd>
            </div>
        </dl>
    </section>

    <section class="card">
        <h2>Document a signer</h2>
        @if (!empty($documentUrl))
            <object class="doc-frame" data="{{ $documentUrl }}" type="application/pdf">
                <div class="doc-missing">
                    Votre navigateur ne peut pas afficher le document directement.
                    <br><a href="{{ $documentUrl }}" target="_blank" rel="noopener">
                        Ouvrir le document dans un nouvel onglet
                    </a>
                </div>
            </object>
            <p style="font-size:13px;margin:10px 0 0;">
                <a href="{{ $documentUrl }}" target="_blank" rel="noopener"
                   style="color:var(--purple-dark);">Ouvrir dans un nouvel onglet</a>
            </p>
        @else
            <div class="doc-missing">
                L'apercu du document n'est pas disponible pour le moment.
                Contactez l'expediteur de la demande avant de signer si vous n'avez pas
                pu prendre connaissance du contenu.
            </div>
        @endif
    </section>

    @if ($signers->count() > 0)
        <section class="card">
            <h2>Signataires ({{ $signers->count() }})</h2>
            <ul class="signers">
                @foreach ($signers->sortBy('order') as $s)
                    @php
                        $st = $s->status ?? 'pending';
                        $cls = match ($st) {
                            'signed'   => 'pill-signed',
                            'declined' => 'pill-declined',
                            default    => 'pill-pending',
                        };
                        $lbl = match ($st) {
                            'signed'   => 'Signe' . ($s->signed_at
                                            ? ' le ' . \Carbon\Carbon::parse($s->signed_at)->format('d/m/Y')
                                            : ''),
                            'declined' => 'Refuse',
                            default    => 'En attente',
                        };
                    @endphp
                    <li>
                        <span>{{ $s->name ?? $s->email ?? '—' }}</span>
                        <span class="pill {{ $cls }}">{{ $lbl }}</span>
                    </li>
                @endforeach
            </ul>
        </section>
    @endif

    <section class="card" id="signBlock">
        <h2>Votre signature manuscrite</h2>
        <p style="font-size:13.5px;color:var(--muted);margin-top:0;">
            Tracez votre signature ci-dessous avec la souris ou le doigt.
        </p>

        <div class="pad-wrap">
            <canvas id="pad" aria-label="Zone de trace de la signature"></canvas>
            <div class="pad-hint" id="padHint">Signez ici</div>
        </div>

        <div class="pad-actions">
            <button type="button" class="btn-ghost" id="clearBtn">Effacer</button>
        </div>

        <label class="consent">
            <input type="checkbox" id="legal">
            <span>
                J'accepte que ce trace constitue ma signature electronique et j'en reconnais
                la valeur juridique. Je confirme avoir pris connaissance du document
                « {{ $docTitle }} » et en accepter les termes. Mon adresse IP, la date et l'heure
                de signature seront enregistrees a titre de preuve.
            </span>
        </label>

        <div class="legal">
            Conformement a la reglementation sur les transactions electroniques, cette signature
            electronique est archivee avec un journal d'audit horodate. Un certificat de signature
            pourra etre delivre a la demande des parties.
        </div>

        <div class="actions" style="margin-top:18px;">
            <button type="button" class="btn-primary" id="submitBtn" disabled>
                Signer le document
            </button>
            <button type="button" class="btn-danger" id="declineToggle">
                Refuser de signer
            </button>
        </div>

        <div class="decline-box" id="declineBox">
            <label for="reason" style="font-size:13.5px;font-weight:600;">
                Motif du refus (obligatoire, 500 caracteres maximum)
            </label>
            <textarea id="reason" maxlength="500"
                      placeholder="Indiquez la raison de votre refus..."></textarea>
            <div class="actions" style="margin-top:10px;">
                <button type="button" class="btn-danger" id="declineBtn">
                    Confirmer le refus
                </button>
                <button type="button" class="btn-ghost" id="declineCancel">Annuler</button>
            </div>
        </div>
    </section>

</div>

<footer class="bottom">
    SECRETIS ERP — une solution <strong>IBIG Soft</strong><br>
    Ce lien de signature est personnel et ne doit pas etre transfere.
</footer>

<script>
(function () {
    var SUBMIT_URL  = @json($submitUrl);
    var DECLINE_URL = @json($declineUrl);
    var CSRF        = document.querySelector('meta[name="csrf-token"]');
    CSRF = CSRF ? CSRF.getAttribute('content') : '';

    var canvas = document.getElementById('pad');
    var hint = document.getElementById('padHint');
    var clearBtn = document.getElementById('clearBtn');
    var legal = document.getElementById('legal');
    var submitBtn = document.getElementById('submitBtn');
    var declineToggle = document.getElementById('declineToggle');
    var declineBox = document.getElementById('declineBox');
    var declineBtn = document.getElementById('declineBtn');
    var declineCancel = document.getElementById('declineCancel');
    var reason = document.getElementById('reason');
    var alertBox = document.getElementById('alert');
    var signBlock = document.getElementById('signBlock');

    var ctx = canvas.getContext('2d');
    var paths = [];        // [[{x,y}, ...], ...] -> champ "paths" attendu par le controleur
    var current = null;
    var drawing = false;

    function resize() {
        var ratio = window.devicePixelRatio || 1;
        var rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(rect.width * ratio));
        canvas.height = Math.max(1, Math.round(rect.height * ratio));
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1f2937';
        redraw(rect.width, rect.height);
    }

    function redraw(w, h) {
        ctx.clearRect(0, 0, w || canvas.width, h || canvas.height);
        for (var i = 0; i < paths.length; i++) {
            var p = paths[i];
            if (!p.length) continue;
            ctx.beginPath();
            ctx.moveTo(p[0].x, p[0].y);
            for (var j = 1; j < p.length; j++) { ctx.lineTo(p[j].x, p[j].y); }
            ctx.stroke();
        }
    }

    function pos(e) {
        var rect = canvas.getBoundingClientRect();
        var src = (e.touches && e.touches[0]) ? e.touches[0] : e;
        return {
            x: Math.round((src.clientX - rect.left) * 100) / 100,
            y: Math.round((src.clientY - rect.top) * 100) / 100
        };
    }

    function start(e) {
        e.preventDefault();
        drawing = true;
        current = [pos(e)];
        paths.push(current);
        hint.classList.add('hidden');
        refreshState();
    }

    function move(e) {
        if (!drawing) return;
        e.preventDefault();
        var p = pos(e);
        current.push(p);
        var n = current.length;
        ctx.beginPath();
        ctx.moveTo(current[n - 2].x, current[n - 2].y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }

    function end() {
        if (!drawing) return;
        drawing = false;
        current = null;
        refreshState();
    }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchcancel', end);

    function hasSignature() {
        for (var i = 0; i < paths.length; i++) { if (paths[i].length > 1) return true; }
        return false;
    }

    function refreshState() {
        submitBtn.disabled = !(hasSignature() && legal.checked);
    }

    legal.addEventListener('change', refreshState);

    clearBtn.addEventListener('click', function () {
        paths = [];
        var rect = canvas.getBoundingClientRect();
        redraw(rect.width, rect.height);
        hint.classList.remove('hidden');
        refreshState();
    });

    declineToggle.addEventListener('click', function () {
        declineBox.classList.toggle('show');
    });
    declineCancel.addEventListener('click', function () {
        declineBox.classList.remove('show');
    });

    function showAlert(message, ok) {
        alertBox.textContent = message;
        alertBox.className = 'alert show ' + (ok ? 'alert-ok' : 'alert-error');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function post(url, payload, btn, busyLabel) {
        var label = btn.textContent;
        btn.disabled = true;
        btn.textContent = busyLabel;

        return fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': CSRF
            },
            body: JSON.stringify(payload)
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                return { ok: res.ok, data: data };
            });
        }).then(function (r) {
            if (r.ok) {
                signBlock.style.display = 'none';
                showAlert(r.data.message || 'Operation enregistree. Merci.', true);
                return;
            }
            var msg = r.data.message || 'Une erreur est survenue. Veuillez reessayer.';
            if (r.data.errors) {
                var keys = Object.keys(r.data.errors);
                if (keys.length) { msg = r.data.errors[keys[0]][0] || msg; }
            }
            showAlert(msg, false);
            btn.disabled = false;
            btn.textContent = label;
        }).catch(function () {
            showAlert('Connexion impossible. Verifiez votre reseau puis reessayez.', false);
            btn.disabled = false;
            btn.textContent = label;
        });
    }

    submitBtn.addEventListener('click', function () {
        if (!hasSignature()) { showAlert('Veuillez tracer votre signature.', false); return; }
        if (!legal.checked) { showAlert('Veuillez accepter les mentions de consentement.', false); return; }

        post(SUBMIT_URL, {
            paths: paths,
            image_base64: canvas.toDataURL('image/png'),
            legal_accepted: true
        }, submitBtn, 'Signature en cours...');
    });

    declineBtn.addEventListener('click', function () {
        var value = (reason.value || '').trim();
        if (!value) { showAlert('Veuillez indiquer le motif de votre refus.', false); return; }
        post(DECLINE_URL, { reason: value }, declineBtn, 'Envoi en cours...');
    });

    window.addEventListener('resize', resize);
    resize();
    refreshState();
})();
</script>

</body>
</html>
