<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: 'DejaVu Sans', sans-serif; }
        body { margin: 0; color: #1f2937; font-size: 12px; line-height: 1.6; }
        .header { border-bottom: 2px solid #9333EA; padding-bottom: 10px; margin-bottom: 18px; }
        .brand { font-size: 15px; font-weight: bold; color: #9333EA; }
        .brand-meta { font-size: 9px; color: #6b7280; margin-top: 2px; }
        h1 { font-size: 18px; color: #111827; margin: 0 0 6px; }
        .meta { font-size: 10px; color: #6b7280; margin-bottom: 18px; }
        .content h2 { font-size: 14px; color: #5b21b6; margin: 18px 0 8px; }
        .content h3 { font-size: 12px; color: #111827; margin: 14px 0 6px; }
        .content p, .content li { font-size: 11px; color: #374151; }
        .content table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .content th, .content td { border: 1px solid #e9d5ff; padding: 6px 8px; font-size: 10px; text-align: left; }
        .footer { margin-top: 26px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">SECRETIS ERP — IBIG Soft</div>
        <div class="brand-meta">RCCM : N°CI-ABJ-03-2023-B13-05718 — NCC : 2302502 V — secretis@ibigsoft.com</div>
    </div>

    <h1>{{ $title }}</h1>
    <div class="meta">
        Version {{ $version ?? '1.0' }} — Document généré le {{ now()->format('d/m/Y') }}
    </div>

    <div class="content">
        {!! $content !!}
    </div>

    <div class="footer">
        © {{ date('Y') }} IBIG Soft — Document légal SECRETIS ERP — secretis.ibigsoft.com
    </div>
</body>
</html>
