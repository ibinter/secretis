export function formatDate(date, fmt = 'DD/MM/YYYY') {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  if (fmt === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
}
export function formatRelative(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'A l instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff/3600)} h`;
  return formatDate(date);
}
export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  return d.toLocaleString('fr-FR');
}
export function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
}
export default { formatDate, formatRelative, formatDateTime, formatTime };
