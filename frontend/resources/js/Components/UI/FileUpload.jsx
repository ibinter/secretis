import React, { useRef, useState } from 'react'
import { Upload, File, X, AlertCircle } from 'lucide-react'
import { formatFileSize } from '../../utils/helpers'
import { MAX_FILE_SIZE, ALLOWED_EXTENSIONS } from '../../utils/constants'

export default function FileUpload({
  onChange,
  multiple    = false,
  accept,
  maxSize     = MAX_FILE_SIZE,
  maxFiles    = 10,
  label       = 'Glisser-déposer ou cliquer pour sélectionner',
  hint,
  className   = '',
}) {
  const [files,    setFiles]    = useState([])
  const [dragging, setDragging] = useState(false)
  const [errors,   setErrors]   = useState([])
  const inputRef = useRef(null)

  const validate = (fileList) => {
    const errs = []
    const valid = []
    Array.from(fileList).forEach(f => {
      if (f.size > maxSize) { errs.push(`${f.name} : fichier trop volumineux (max ${formatFileSize(maxSize)})`); return }
      valid.push(f)
    })
    if (valid.length + files.length > maxFiles) errs.push(`Maximum ${maxFiles} fichiers autorisés.`)
    setErrors(errs)
    return valid.slice(0, maxFiles - files.length)
  }

  const addFiles = (fileList) => {
    const valid = validate(fileList)
    const next  = multiple ? [...files, ...valid] : valid.slice(0, 1)
    setFiles(next)
    onChange?.(next)
  }

  const removeFile = (i) => {
    const next = files.filter((_, idx) => idx !== i)
    setFiles(next)
    onChange?.(next)
  }

  return (
    <div className={className}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={[
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragging
            ? 'border-[#7e22ce] bg-[#7e22ce]/5'
            : 'border-gray-300 dark:border-gray-600 hover:border-[#7e22ce] dark:hover:border-[#7e22ce]',
        ].join(' ')}
      >
        <Upload size={32} className={`mx-auto mb-3 ${dragging ? 'text-[#7e22ce]' : 'text-gray-300 dark:text-gray-600'}`} />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        <p className="text-xs text-gray-400 mt-1">Max {formatFileSize(maxSize)}{accept ? ` · ${accept}` : ''}</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={accept}
          onChange={e => addFiles(e.target.files)}
        />
      </div>

      {errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="flex items-center gap-1 text-xs text-[#C0392B]"><AlertCircle size={12} />{e}</p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0F1923] rounded-lg border border-gray-200 dark:border-[#1E3048]">
              <File size={16} className="text-[#7e22ce] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{f.name}</p>
                <p className="text-xs text-gray-400">{formatFileSize(f.size)}</p>
              </div>
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-[#C0392B] transition-colors" aria-label="Supprimer">
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
export { FileUpload };
