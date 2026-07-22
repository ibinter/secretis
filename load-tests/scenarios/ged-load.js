/**
 * IBIG SECRETIS – Test de charge : GED (Gestion Électronique de Documents)
 *
 * Objectifs :
 *  - Upload de 10 fichiers en parallèle (PDF 1 MB)
 *  - Téléchargement via URL signée sous charge
 *  - Recherche OCR full-text : 50 VU simultanés
 *  - Vérifie : pas de timeout sur les uploads
 */

import http   from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { b64encode } from 'k6/encoding';
import { requireLogin, getHeaders, pickAccount } from '../helpers/auth.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  scenarios: {
    // Upload parallèle (10 VU)
    ged_upload: {
      executor:   'constant-vus',
      vus:        10,
      duration:   '5m',
      tags:       { scenario: 'ged-upload' },
      exec:       'uploadDocument',
    },
    // Téléchargement via URL signée (30 VU, démarre après 1m)
    ged_download: {
      executor:   'constant-vus',
      vus:        30,
      duration:   '4m',
      startTime:  '1m',
      tags:       { scenario: 'ged-download' },
      exec:       'downloadDocument',
    },
    // Recherche OCR full-text (50 VU, démarre après 2m)
    ged_search: {
      executor:   'constant-vus',
      vus:        50,
      duration:   '3m',
      startTime:  '2m',
      tags:       { scenario: 'ged-search' },
      exec:       'searchDocuments',
    },
  },
  thresholds: {
    http_req_duration:           ['p(95)<3000', 'p(99)<5000'], // uploads plus lents
    http_req_failed:             ['rate<0.01'],
    'upload_duration':           ['p(95)<5000'],   // 5s max pour upload 1MB
    'upload_timeout_count':      ['count<1'],      // 0 timeout accepté
    'download_duration':         ['p(95)<2000'],
    'ocr_search_duration':       ['p(95)<1000'],
    'signed_url_valid':          ['rate>0.99'],
  },
};

// ---------------------------------------------------------------------------
// Métriques custom
// ---------------------------------------------------------------------------
const uploadDuration      = new Trend('upload_duration',      true);
const downloadDuration    = new Trend('download_duration',    true);
const ocrSearchDuration   = new Trend('ocr_search_duration',  true);
const uploadTimeoutCount  = new Counter('upload_timeout_count');
const signedUrlValid      = new Rate('signed_url_valid');
const uploadSuccessCount  = new Counter('upload_success_count');

// ---------------------------------------------------------------------------
// Génération d'un faux PDF 1 MB
// ---------------------------------------------------------------------------
function generateFakePdfBytes(sizeMb = 1) {
  // En-tête PDF minimal + contenu padding pour atteindre la taille cible
  const header   = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const pages    = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const page     = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>\nendobj\n';
  const xref     = 'xref\n0 4\n0000000000 65535 f\n';
  const trailer  = 'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n0\n%%EOF\n';

  const skeleton    = header + pages + page + xref + trailer;
  const targetBytes = sizeMb * 1024 * 1024;
  const paddingSize = Math.max(0, targetBytes - skeleton.length);

  // Contenu OCR searchable intégré
  const ocrContent = 'Contenu OCR searchable k6 test SECRETIS document gestion electronique ';
  let padding = '';
  while (padding.length < paddingSize) {
    padding += ocrContent;
  }
  padding = padding.slice(0, paddingSize);

  return skeleton.replace('%%EOF\n', `% ${padding}\n%%EOF\n`);
}

// Génération du binaire PDF une seule fois au setup
const FAKE_PDF_CONTENT = generateFakePdfBytes(1);

// ---------------------------------------------------------------------------
// Cache de tokens et d'IDs de documents (local au VU)
// ---------------------------------------------------------------------------
let _token      = null;
let _docIds     = [];

function ensureToken() {
  if (!_token) _token = requireLogin(BASE_URL, pickAccount());
  return _token;
}

// ---------------------------------------------------------------------------
// Scénario 1 : Upload de documents
// ---------------------------------------------------------------------------
export function uploadDocument() {
  const token    = ensureToken();
  const filename = `test-k6-${__VU}-${__ITER}-${Date.now()}.pdf`;

  group('Upload document PDF 1MB', () => {
    // Multipart form data
    const formData = {
      file: http.file(FAKE_PDF_CONTENT, filename, 'application/pdf'),
      title:       `Document Test VU${__VU} Iter${__ITER}`,
      description: 'Document PDF de test k6 contenu OCR searchable SECRETIS',
      folder_id:   '1', // dossier racine de test
      tags:        'k6,test,load',
      public:      'false',
    };

    const start = Date.now();

    const res = http.post(
      `${BASE_URL}/api/documents`,
      formData,
      {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        timeout: '30s', // timeout généreux pour l'upload
        tags:    { operation: 'document_upload' },
      },
    );

    const elapsed = Date.now() - start;
    uploadDuration.add(elapsed);

    // Détecter les timeouts
    if (res.status === 0 || elapsed > 30000) {
      uploadTimeoutCount.add(1);
    }

    const ok = check(res, {
      'upload: status 201':          (r) => r.status === 201,
      'upload: id document présent': (r) => {
        try { return !!JSON.parse(r.body).id; } catch { return false; }
      },
      'upload: path présent':        (r) => {
        try { return !!JSON.parse(r.body).path || !!JSON.parse(r.body).url; } catch { return false; }
      },
      'upload: pas de timeout':      (r) => r.status !== 0,
      'upload: durée < 10s':         (r) => r.timings.duration < 10000,
    });

    if (ok) {
      uploadSuccessCount.add(1);
      try {
        const body = JSON.parse(res.body);
        if (body.id) _docIds.push(body.id);
      } catch { /* ignore */ }
    }
  });

  sleep(Math.random() * 2 + 1);
}

// ---------------------------------------------------------------------------
// Scénario 2 : Téléchargement via URL signée
// ---------------------------------------------------------------------------
export function downloadDocument() {
  const token = ensureToken();

  group('Téléchargement via URL signée', () => {
    // 1. Récupérer la liste des documents disponibles
    const listRes = http.get(
      `${BASE_URL}/api/documents?per_page=50`,
      { headers: getHeaders(token), tags: { operation: 'document_list' } },
    );

    let docId = null;
    try {
      const docs = JSON.parse(listRes.body);
      const arr  = docs.data || docs;
      if (Array.isArray(arr) && arr.length > 0) {
        docId = arr[Math.floor(Math.random() * arr.length)].id;
      }
    } catch { /* ignore */ }

    if (!docId && _docIds.length > 0) {
      docId = _docIds[Math.floor(Math.random() * _docIds.length)];
    }

    if (!docId) {
      sleep(1);
      return;
    }

    // 2. Obtenir l'URL signée
    const signRes = http.post(
      `${BASE_URL}/api/documents/${docId}/signed-url`,
      JSON.stringify({ expires_in: 300 }), // 5 min
      { headers: getHeaders(token), tags: { operation: 'signed_url_generate' } },
    );

    let signedUrl = null;
    try { signedUrl = JSON.parse(signRes.body).url; } catch { /* ignore */ }

    signedUrlValid.add(!!signedUrl && signRes.status === 200);

    check(signRes, {
      'URL signée: status 200':     (r) => r.status === 200,
      'URL signée: URL présente':   () => !!signedUrl,
    });

    // 3. Télécharger via l'URL signée
    if (signedUrl) {
      const dlStart = Date.now();

      const dlRes = http.get(signedUrl, {
        tags:    { operation: 'document_download' },
        timeout: '20s',
      });

      downloadDuration.add(Date.now() - dlStart);

      check(dlRes, {
        'download: status 200':          (r) => r.status === 200,
        'download: contenu non vide':    (r) => r.body && r.body.length > 0,
        'download: Content-Type PDF':    (r) => (r.headers['Content-Type'] || '').includes('pdf'),
        'download: durée < 5s':          (r) => r.timings.duration < 5000,
      });
    }
  });

  sleep(Math.random() * 2 + 0.5);
}

// ---------------------------------------------------------------------------
// Scénario 3 : Recherche OCR full-text
// ---------------------------------------------------------------------------
export function searchDocuments() {
  const token = ensureToken();

  const SEARCH_QUERIES = [
    'OCR searchable',
    'SECRETIS document',
    'gestion electronique',
    'k6 test',
    'PDF contenu',
    'load test document',
  ];

  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

  group('Recherche OCR full-text', () => {
    const start = Date.now();

    const res = http.get(
      `${BASE_URL}/api/documents/search?q=${encodeURIComponent(query)}&ocr=true&per_page=20`,
      {
        headers: getHeaders(token),
        tags:    { operation: 'ocr_search' },
      },
    );

    ocrSearchDuration.add(Date.now() - start);

    check(res, {
      'OCR search: status 200':      (r) => r.status === 200,
      'OCR search: résultats array': (r) => {
        try {
          const b = JSON.parse(r.body);
          return Array.isArray(b.data) || Array.isArray(b);
        } catch { return false; }
      },
      'OCR search: durée < 1s':      (r) => r.timings.duration < 1000,
    });
  });

  sleep(Math.random() * 3 + 1);
}

// ---------------------------------------------------------------------------
// Résumé
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  const timeouts = data.metrics?.upload_timeout_count?.values?.count ?? 0;
  return {
    'stdout': `
=== GED LOAD TEST – RAPPORT ===
p95 upload          : ${data.metrics?.upload_duration?.values?.['p(95)'] ?? 'N/A'} ms
p95 download        : ${data.metrics?.download_duration?.values?.['p(95)'] ?? 'N/A'} ms
p95 recherche OCR   : ${data.metrics?.ocr_search_duration?.values?.['p(95)'] ?? 'N/A'} ms
Uploads réussis     : ${data.metrics?.upload_success_count?.values?.count ?? 0}
TIMEOUTS            : ${timeouts}  ${timeouts > 0 ? 'ALERTE' : 'OK'}
URL signées valides : ${((data.metrics?.signed_url_valid?.values?.rate ?? 0) * 100).toFixed(1)} %
================================
`,
    'reports/ged-load-summary.json': JSON.stringify(data, null, 2),
  };
}
