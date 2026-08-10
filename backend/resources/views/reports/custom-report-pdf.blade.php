@php
    /**
     * Rapport personnalisé (Report Builder) — SECRETIS ERP
     * Appelée par App\Jobs\GenerateReportJob::generatePdf() — A4 paysage
     * Variables : $reportName (string), $columns (array<array{field,label,type?,visible?,width?}>),
     *             $rows (Illuminate\Support\Collection), $generatedAt (string 'd/m/Y H:i'), $rowCount (int)
     */
    $cols = array_values($columns ?? []);

    $toArray = function ($item): array {
        if ($item instanceof \Illuminate\Database\Eloquent\Model) {
            return $item->getAttributes();
        }
        if ($item instanceof \Illuminate\Contracts\Support\Arrayable) {
            return $item->toArray();
        }
        return (array) $item;
    };

    $render = function ($value, string $type) {
        if ($value === null || $value === '') {
            return $type === 'boolean' ? 'Non' : '—';
        }
        return match ($type) {
            'datetime' => \Carbon\Carbon::parse($value)->format('d/m/Y H:i'),
            'date'     => \Carbon\Carbon::parse($value)->format('d/m/Y'),
            'boolean'  => $value ? 'Oui' : 'Non',
            'currency' => number_format((float) $value, 0, ',', ' '),
            'number', 'integer', 'decimal' => is_numeric($value) ? number_format((float) $value, 0, ',', ' ') : (string) $value,
            default    => is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_UNICODE),
        };
    };

    $alignRight = ['currency', 'number', 'integer', 'decimal'];
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>{{ $reportName ?? 'Rapport' }}</title>
    <style>
        @page { margin: 12mm 10mm 14mm 10mm; }
        * { font-family: 'DejaVu Sans', sans-serif; }
        body { margin: 0; color: #1f2937; font-size: 10px; }

        .header { border-bottom: 2px solid #9333EA; padding-bottom: 8px; margin-bottom: 12px; }
        .brand { font-size: 15px; font-weight: bold; color: #111827; }
        .title { font-size: 12px; color: #4b5563; margin-top: 3px; }
        .meta { font-size: 9px; color: #6b7280; margin-top: 3px; }

        table { width: 100%; border-collapse: collapse; }
        table.data { table-layout: fixed; }
        table.data th { background: #f5f3ff; color: #5b21b6; text-align: left; padding: 5px 6px;
                        font-size: 8px; text-transform: uppercase; border-bottom: 1px solid #ddd6fe; }
        table.data th.num { text-align: right; }
        table.data td { padding: 4px 6px; border-bottom: 1px solid #f3f4f6; font-size: 9px;
                        word-wrap: break-word; overflow-wrap: break-word; }
        .num { text-align: right; }
        .ctr { text-align: center; }
        .muted { color: #9ca3af; }
        .footer { margin-top: 16px; font-size: 8px; color: #9ca3af; text-align: center; line-height: 1.5; }
    </style>
</head>
<body>

<div class="header">
    <div class="brand">SECRETIS ERP</div>
    <div class="title">{{ $reportName ?? 'Rapport personnalisé' }}</div>
    <div class="meta">
        {{ $rowCount ?? 0 }} enregistrement(s) — {{ count($cols) }} colonne(s)
        — Généré le {{ $generatedAt ?? now()->format('d/m/Y H:i') }}
    </div>
</div>

<table class="data">
    <thead>
        <tr>
            @forelse($cols as $col)
                <th class="{{ in_array($col['type'] ?? 'string', $alignRight, true) ? 'num' : '' }}">
                    {{ $col['label'] ?? ($col['field'] ?? '') }}
                </th>
            @empty
                <th>Colonne</th>
            @endforelse
        </tr>
    </thead>
    <tbody>
        @forelse(($rows ?? []) as $item)
            @php $record = $toArray($item); @endphp
            <tr>
                @forelse($cols as $col)
                    @php
                        $type  = $col['type'] ?? 'string';
                        $value = $record[$col['field'] ?? ''] ?? null;
                    @endphp
                    <td class="{{ in_array($type, $alignRight, true) ? 'num' : '' }}">
                        {{ $render($value, $type) }}
                    </td>
                @empty
                    <td class="muted">—</td>
                @endforelse
            </tr>
        @empty
            <tr>
                <td class="muted ctr" colspan="{{ max(count($cols), 1) }}" style="padding:20px;">
                    Aucun élément
                </td>
            </tr>
        @endforelse
    </tbody>
</table>

<div class="footer">
    {{ $reportName ?? 'Rapport personnalisé' }} — {{ $rowCount ?? 0 }} enregistrement(s)<br>
    Document généré le {{ $generatedAt ?? now()->format('d/m/Y H:i') }} — SECRETIS ERP · IBIG Soft
</div>

</body>
</html>
