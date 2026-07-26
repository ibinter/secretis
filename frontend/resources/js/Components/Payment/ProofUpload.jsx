import { useState, useRef, useCallback } from 'react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const BLOCKED_EXTENSIONS = ['.php', '.exe', '.js', '.html', '.bat', '.sh', '.py', '.rb'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function IcoUpload() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function IcoFile() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function IcoX() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * ProofUpload — Composant drag-and-drop pour soumettre une preuve de paiement.
 *
 * Props :
 *   file       {File|null}   — valeur contrôlée
 *   onChange   {fn(File)}    — appelé quand un fichier est accepté
 *   onRemove   {fn()}        — appelé quand le fichier est supprimé
 *   uploading  {boolean}     — si true, affiche la barre de progression
 *   progress   {number}      — 0-100
 *   label      {string}      — libellé optionnel de la zone
 *   required   {boolean}
 *   error      {string}      — message d'erreur externe
 */
export default function ProofUpload({
  file,
  onChange,
  onRemove,
  uploading   = false,
  progress    = 0,
  label       = 'Joindre votre preuve de paiement',
  required    = false,
  error: externalError = '',
}) {
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState('');
  const inputRef = useRef();

  const error = externalError || localError;

  const validate = useCallback((f) => {
    if (!f) return 'Aucun fichier sélectionné.';

    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return `Le type de fichier "${ext}" est interdit pour des raisons de sécurité.`;
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      return `Format non accepté. Utilisez JPEG, PNG ou PDF.`;
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `Le fichier dépasse ${MAX_SIZE_MB} Mo (taille : ${(f.size / 1024 / 1024).toFixed(1)} Mo).`;
    }
    return null;
  }, []);

  const handleFile = useCallback((f) => {
    if (!f) return;
    setLocalError('');
    const err = validate(f);
    if (err) {
      setLocalError(err);
      return;
    }
    onChange?.(f);
  }, [validate, onChange]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleInputChange = (e) => handleFile(e.target.files?.[0]);

  const preview = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
            px-6 py-8 cursor-pointer transition-all select-none
            ${dragOver
              ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
              : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600'
            }
          `}
        >
          <span className={`transition-colors ${dragOver ? 'text-indigo-500' : 'text-gray-400'}`}>
            <IcoUpload />
          </span>
          <div className="text-center">
            <p className="text-sm font-medium">
              {dragOver ? 'Déposez le fichier ici' : 'Glissez-déposez ou cliquez pour parcourir'}
            </p>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, PDF — max {MAX_SIZE_MB} Mo</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* Aperçu image */}
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Aperçu de la preuve"
                className="w-full max-h-48 object-contain bg-gray-50"
                onLoad={() => URL.revokeObjectURL(preview)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 bg-gray-50 text-gray-400">
              <IcoFile />
            </div>
          )}

          {/* Infos fichier + barre de progression */}
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} Ko</p>
            </div>
            {!uploading && (
              <button
                type="button"
                onClick={() => { setLocalError(''); onRemove?.(); }}
                className="flex-shrink-0 p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-gray-500 transition-colors"
                aria-label="Supprimer le fichier"
              >
                <IcoX />
              </button>
            )}
          </div>

          {/* Barre de progression */}
          {uploading && (
            <div className="px-4 pb-3 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Envoi en cours…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 flex items-start gap-1.5">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
export { ProofUpload };
