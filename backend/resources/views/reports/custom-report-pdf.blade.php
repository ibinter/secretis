<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{{ $reportName }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 9pt;
            color: #1a1a2e;
            background: #fff;
        }

        /* ── En-tête ── */
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 20px;
            background: linear-gradient(135deg, #2E86C1 0%, #1a5276 100%);
            color: #fff;
            margin-bottom: 16px;
        }

        .header-left h1 {
            font-size: 14pt;
            font-weight: bold;
            letter-spacing: 0.5px;
        }

        .header-left .subtitle {
            font-size: 8pt;
            opacity: 0.8;
            margin-top: 3px;
        }

        .header-right {
            text-align: right;
            font-size: 8pt;
            opacity: 0.9;
        }

        /* ── Méta ── */
        .meta {
            padding: 0 20px 10px;
            display: flex;
            gap: 24px;
            font-size: 8pt;
            color: #555;
        }

        .meta span {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        /* ── Tableau ── */
        .table-wrap {
            padding: 0 20px;
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
        }

        thead tr {
            background: #2E86C1;
            color: #fff;
        }

        thead th {
            padding: 7px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 7.5pt;
            letter-spacing: 0.3px;
            white-space: nowrap;
        }

        tbody tr:nth-child(even) {
            background: #f0f7ff;
        }

        tbody tr:nth-child(odd) {
            background: #fff;
        }

        tbody tr td {
            padding: 5px 8px;
            border-bottom: 1px solid #e8edf3;
            vertical-align: top;
            max-width: 180px;
            overflow: hidden;
        }

        /* ── Pied de page ── */
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 8px 20px;
            background: #f8f9fa;
            border-top: 1px solid #e0e6ed;
            font-size: 7pt;
            color: #888;
            display: flex;
            justify-content: space-between;
        }

        .footer .brand {
            color: #2E86C1;
            font-weight: bold;
        }

        .no-data {
            text-align: center;
            padding: 40px;
            color: #888;
            font-style: italic;
        }
    </style>
</head>
<body>

    <!-- En-tête -->
    <div class="header">
        <div class="header-left">
            <h1>{{ $reportName }}</h1>
            <div class="subtitle">SECRETIS ERP — Rapport personnalisé</div>
        </div>
        <div class="header-right">
            <div>Généré le {{ $generatedAt }}</div>
            <div>{{ number_format($rowCount, 0, ',', ' ') }} ligne{{ $rowCount > 1 ? 's' : '' }}</div>
        </div>
    </div>

    <!-- Tableau des données -->
    <div class="table-wrap">
        @if(count($rows) === 0)
            <div class="no-data">Aucune donnée à afficher pour ce rapport.</div>
        @else
            <table>
                <thead>
                    <tr>
                        @foreach($columns as $col)
                            @if($col['visible'] ?? true)
                                <th style="width: {{ ($col['width'] ?? 150) }}px">{{ $col['label'] }}</th>
                            @endif
                        @endforeach
                    </tr>
                </thead>
                <tbody>
                    @foreach($rows as $row)
                        <tr>
                            @php
                                $record = is_object($row) ? (array) $row->getAttributes() : (array) $row;
                            @endphp
                            @foreach($columns as $col)
                                @if($col['visible'] ?? true)
                                    @php
                                        $value = $record[$col['field']] ?? null;
                                        $formatted = match($col['type'] ?? 'string') {
                                            'datetime' => $value ? \Carbon\Carbon::parse($value)->format('d/m/Y H:i') : '—',
                                            'date'     => $value ? \Carbon\Carbon::parse($value)->format('d/m/Y') : '—',
                                            'boolean'  => $value ? 'Oui' : 'Non',
                                            'number'   => $value !== null ? number_format((float)$value, 0, ',', ' ') : '—',
                                            default    => $value ?? '—',
                                        };
                                    @endphp
                                    <td>{{ $formatted }}</td>
                                @endif
                            @endforeach
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </div>

    <!-- Pied de page -->
    <div class="footer">
        <div><span class="brand">IBIG SECRETIS ERP</span> — Rapport confidentiel</div>
        <div>{{ $reportName }} — {{ $generatedAt }}</div>
        <div>Page <span class="pagenum"></span></div>
    </div>

</body>
</html>
