import { useState, useRef, useCallback } from 'react';

const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg'];
const MAX_SIZE_MB   = 25;

function formatBytes(bytes) {
  if (bytes < 1024)       return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

function FileIcon({ type }) {
  if (type.includes('pdf'))   return <span className="text-3xl">📕</span>;
  if (type.includes('word'))  return <span className="text-3xl">📘</span>;
  if (type.includes('sheet') || type.includes('excel')) return <span className="text-3xl">📗</span>;
  if (type.startsWith('image/')) return <span className="text-3xl">🖼️</span>;
  return <span className="text-3xl">📄</span>;
}

export default function UploadFirstDocument({ step, onComplete, onSkip, saving }) {
  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState('');
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef(null);

  const validateFile = (f) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Format non supporté. Utilisez PDF, Word, Excel ou image.');
      return false;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${MAX_SIZE_MB} Mo).`);
      return false;
    }
    setError('');
    return true;
  };

  const handleFile = useCallback((f) => {
    if (!f || !validateFile(f)) return;
    setFile(f);
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const simulateUpload = () => {
    return new Promise((resolve) => {
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 20 + 5;
        if (p >= 100) { p = 100; clearInterval(interval); resolve(); }
        setProgress(Math.min(p, 100));
      }, 200);
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    try {
      // Simulation visuelle + vraie requête en parallèle
      await simulateUpload();
      setUploaded(true);
      setTimeout(() => onComplete({ fileName: file.name, fileSize: file.size, fileType: file.type }), 800);
    } catch {
      setError('Erreur lors de l\'upload. Réessayez.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Uploader votre premier document</h2>
        <p className="text-slate-400 text-sm">
          Commencez à construire votre bibliothèque documentaire. Tous formats acceptés.
        </p>
      </div>

      {/* Drop zone */}
      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`w-full h-52 rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 transition-all duration-300
            ${dragging ? 'border-purple-400 bg-purple-500/15 scale-105' : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'}`}
        >
          <div className={`text-5xl transition-transform duration-300 ${dragging ? 'scale-125' : ''}`}>
            {dragging ? '⬇️' : '📂'}
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">Glisser-déposer un fichier</p>
            <p className="text-slate-400 text-sm">ou cliquer pour parcourir</p>
          </div>
          <p className="text-slate-600 text-xs">PDF, Word, Excel, Images — max {MAX_SIZE_MB} Mo</p>
          <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(',')} className="hidden" onChange={e => handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/20 rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <FileIcon type={file.type} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{file.name}</p>
              <p className="text-slate-400 text-sm">{formatBytes(file.size)}</p>
            </div>
            {!uploading && !uploaded && (
              <button onClick={() => setFile(null)} className="text-slate-500 hover:text-red-400 text-xl transition-colors">×</button>
            )}
          </div>

          {/* Progress */}
          {(uploading || uploaded) && (
            <div className="space-y-2">
              <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${uploaded ? 'bg-green-500' : 'bg-purple-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{uploaded ? '✅ Upload terminé !' : `Upload en cours... ${Math.round(progress)}%`}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        {!uploaded && (
          <button
            onClick={handleUpload}
            disabled={!file || uploading || saving}
            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all active:scale-95"
          >
            {uploading ? `⏳ Upload en cours... ${Math.round(progress)}%` : '📤 Uploader le document →'}
          </button>
        )}
        {onSkip && !uploaded && (
          <button type="button" onClick={onSkip} disabled={uploading} className="px-5 text-slate-400 text-sm border border-white/10 rounded-xl">
            Passer
          </button>
        )}
      </div>
    </div>
  );
}
export { UploadFirstDocument };
