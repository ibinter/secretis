/**
 * helpers.js — Fonctions utilitaires globales IBIG SECRETIS
 */

// ─── Monnaie ──────────────────────────────────────────────────────────────────
export function formatCurrency(amount, currency = 'XOF', locale = 'fr-FR') {
  if (amount == null || isNaN(amount)) return '—'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'XOF' ? 0 : 2,
    }).format(amount)
  } catch {
    return `${Number(amount).toLocaleString(locale)} ${currency}`
  }
}

// ─── Date / Heure ─────────────────────────────────────────────────────────────
export function formatDate(date, format = 'short', locale = 'fr-FR') {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'

  const opts = {
    short:    { day: '2-digit', month: '2-digit', year: 'numeric' },
    long:     { day: 'numeric', month: 'long',    year: 'numeric' },
    full:     { weekday: 'long', day: 'numeric',  month: 'long', year: 'numeric' },
    time:     { hour: '2-digit', minute: '2-digit' },
    datetime: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  }
  return new Intl.DateTimeFormat(locale, opts[format] ?? opts.short).format(d)
}

const RTF = (locale) => {
  try { return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }) }
  catch { return new Intl.RelativeTimeFormat('fr', { numeric: 'auto' }) }
}

export function formatRelativeTime(date, locale = 'fr-FR') {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  const diff = (d.getTime() - Date.now()) / 1000  // seconds
  const abs  = Math.abs(diff)
  const rtf  = RTF(locale)
  if (abs < 60)   return rtf.format(Math.round(diff), 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 2592000) return rtf.format(Math.round(diff / 86400), 'day')
  if (abs < 31536000) return rtf.format(Math.round(diff / 2592000), 'month')
  return rtf.format(Math.round(diff / 31536000), 'year')
}

// ─── Texte ────────────────────────────────────────────────────────────────────
export function truncate(text, length = 50) {
  if (!text) return ''
  return text.length <= length ? text : text.slice(0, length - 3) + '...'
}

export function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function capitalize(str = '') {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function slugify(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── Avatar / Couleur déterministe ───────────────────────────────────────────
const AVATAR_COLORS = [
  '#1A3A5C', '#2E86C1', '#1E8449', '#C0392B', '#F39C12',
  '#8E44AD', '#16A085', '#D35400', '#2C3E50', '#C0392B',
]

export function generateColor(string = '') {
  let hash = 0
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Fichiers ─────────────────────────────────────────────────────────────────
export function downloadFile(url, filename = 'download') {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function formatFileSize(bytes = 0) {
  if (bytes === 0) return '0 B'
  const k     = 1024
  const sizes  = ['B', 'KB', 'MB', 'GB', 'TB']
  const i      = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ─── Clipboard ────────────────────────────────────────────────────────────────
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity  = '0'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    return true
  }
}

// ─── Performance ──────────────────────────────────────────────────────────────
export function debounce(fn, delay = 300) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

export function throttle(fn, limit = 300) {
  let inThrottle = false
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => { inThrottle = false }, limit)
    }
  }
}

// ─── Collections ──────────────────────────────────────────────────────────────
export function groupBy(array = [], key) {
  return array.reduce((acc, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key]
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(item)
    return acc
  }, {})
}

export function sortBy(array = [], key, direction = 'asc') {
  return [...array].sort((a, b) => {
    const va = typeof key === 'function' ? key(a) : a[key]
    const vb = typeof key === 'function' ? key(b) : b[key]
    if (va < vb) return direction === 'asc' ? -1 : 1
    if (va > vb) return direction === 'asc' ? 1 : -1
    return 0
  })
}

export function unique(array = [], key) {
  if (!key) return [...new Set(array)]
  const seen = new Set()
  return array.filter((item) => {
    const k = typeof key === 'function' ? key(item) : item[key]
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// ─── Validation ───────────────────────────────────────────────────────────────
export function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function isValidPhone(phone = '') {
  // Accepte les formats internationaux et africains
  return /^[+]?[\d\s\-().]{7,20}$/.test(phone.trim())
}

export function isValidUrl(url = '') {
  try { new URL(url); return true } catch { return false }
}

// ─── Divers ───────────────────────────────────────────────────────────────────
export function clsx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function randomId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function pick(obj = {}, keys = []) {
  return keys.reduce((acc, k) => { if (k in obj) acc[k] = obj[k]; return acc }, {})
}

export function omit(obj = {}, keys = []) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)))
}
