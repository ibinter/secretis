<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('error_code', 'Erreur') — IBIG SECRETIS</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --navy:   #1A3A5C;
            --blue:   #2E86C1;
            --gold:   #F39C12;
            --bg:     #F7F9FC;
            --card:   #FFFFFF;
            --text:   #1C2B3A;
            --muted:  #6B7D8F;
            --border: #DDE4EC;
            --code-bg:#EEF3F8;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg:     #0D1B2A;
                --card:   #132233;
                --text:   #D8E4F0;
                --muted:  #7A94AD;
                --border: #1E3048;
                --code-bg:#0A1520;
            }
        }
        :root[data-theme="dark"] {
            --bg:     #0D1B2A;
            --card:   #132233;
            --text:   #D8E4F0;
            --muted:  #7A94AD;
            --border: #1E3048;
            --code-bg:#0A1520;
        }
        :root[data-theme="light"] {
            --bg:     #F7F9FC;
            --card:   #FFFFFF;
            --text:   #1C2B3A;
            --muted:  #6B7D8F;
            --border: #DDE4EC;
            --code-bg:#EEF3F8;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem 1.25rem;
        }

        .wrap {
            width: 100%;
            max-width: 520px;
            text-align: center;
        }

        /* Logo */
        .logo {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 2.5rem;
            text-decoration: none;
        }
        .logo svg { display: block; }

        /* Error code */
        .error-code {
            font-size: clamp(5rem, 20vw, 8rem);
            font-weight: 800;
            line-height: 1;
            letter-spacing: -0.04em;
            color: var(--navy);
            opacity: 0.12;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            user-select: none;
            pointer-events: none;
        }
        @media (prefers-color-scheme: dark) { .error-code { opacity: 0.08; } }
        :root[data-theme="dark"] .error-code { opacity: 0.08; }
        :root[data-theme="light"] .error-code { opacity: 0.12; }

        .icon-wrap {
            position: relative;
            height: 7rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.25rem;
        }

        .icon-emoji {
            font-size: 3rem;
            position: relative;
            z-index: 1;
        }

        /* Card */
        .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 2rem 2rem 1.75rem;
            box-shadow: 0 4px 24px rgba(26,58,92,0.07);
        }

        .error-title {
            font-size: 1.375rem;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 0.625rem;
            text-wrap: balance;
        }

        .error-message {
            font-size: 0.9375rem;
            line-height: 1.65;
            color: var(--muted);
            margin-bottom: 0;
            text-wrap: balance;
        }

        /* Reference badge */
        .ref-badge {
            display: inline-block;
            margin-top: 1rem;
            padding: 0.25rem 0.75rem;
            background: var(--code-bg);
            border-radius: 6px;
            font-size: 0.75rem;
            font-family: 'SF Mono', 'Fira Code', 'Menlo', monospace;
            color: var(--muted);
            letter-spacing: 0.02em;
        }

        /* Actions */
        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.625rem;
            margin-top: 1.5rem;
            justify-content: center;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 0.6rem 1.25rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            border: none;
            transition: opacity 0.15s, transform 0.1s;
        }
        .btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .btn-primary { background: var(--navy); color: #fff; }
        .btn-outline {
            background: transparent;
            color: var(--blue);
            border: 1.5px solid var(--blue);
        }
        .btn-ghost {
            background: transparent;
            color: var(--muted);
            border: 1.5px solid var(--border);
        }
        .btn:focus-visible {
            outline: 3px solid var(--gold);
            outline-offset: 2px;
        }

        /* Suggestions */
        .suggestions {
            margin-top: 1.25rem;
            padding-top: 1.25rem;
            border-top: 1px solid var(--border);
        }
        .suggestions p {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--muted);
            margin-bottom: 0.625rem;
        }
        .suggestions-links {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            justify-content: center;
        }
        .suggestions-links a {
            color: var(--blue);
            font-size: 0.8125rem;
            text-decoration: none;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            transition: background 0.12s;
        }
        .suggestions-links a:hover { background: var(--code-bg); }

        /* Extra slot */
        .extra { margin-top: 1rem; }

        /* Footer */
        footer {
            margin-top: 2rem;
            font-size: 0.75rem;
            color: var(--muted);
            text-align: center;
        }
        footer a { color: var(--muted); text-decoration: underline; }
    </style>
    @stack('styles')
</head>
<body>
    <div class="wrap">

        {{-- Logo --}}
        <a class="logo" href="{{ url('/') }}" aria-label="IBIG SECRETIS — Accueil">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect width="32" height="32" rx="7" fill="#1A3A5C"/>
                <rect x="6" y="9" width="8" height="14" rx="2" fill="#F39C12"/>
                <rect x="17" y="9" width="4" height="14" rx="2" fill="#2E86C1"/>
                <rect x="23" y="9" width="3" height="14" rx="2" fill="#FFFFFF" opacity="0.7"/>
            </svg>
            <span style="font-size:1.0625rem;font-weight:700;letter-spacing:-0.01em;color:var(--navy)">
                IBIG <span style="color:var(--blue)">SECRETIS</span>
            </span>
        </a>

        {{-- Card --}}
        <div class="card">
            <div class="icon-wrap">
                <span class="error-code" aria-hidden="true">@yield('error_code', '')</span>
                <span class="icon-emoji" role="img" aria-label="@yield('icon_label', 'Erreur')">@yield('icon', '⚠️')</span>
            </div>

            <h1 class="error-title">@yield('title', 'Une erreur est survenue')</h1>
            <p class="error-message">@yield('message', 'Nous n\'avons pas pu traiter votre demande.')</p>

            @hasSection('reference')
                <span class="ref-badge">Réf : @yield('reference')</span>
            @endif

            @hasSection('extra')
                <div class="extra">@yield('extra')</div>
            @endif

            <div class="actions">
                @yield('actions')
            </div>

            @hasSection('suggestions')
                <div class="suggestions">
                    <p>Accès rapide</p>
                    <div class="suggestions-links">
                        @yield('suggestions')
                    </div>
                </div>
            @endif
        </div>

        {{-- Footer --}}
        <footer>
            IBIG SECRETIS &nbsp;·&nbsp; version {{ config('app.version', '2.0.0') }}
            &nbsp;·&nbsp; <a href="mailto:support@ibig-soft.ci">support@ibig-soft.ci</a>
        </footer>
    </div>

    @stack('scripts')
</body>
</html>
