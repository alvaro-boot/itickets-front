export function escapeHtml(value) {
  if (value == null) return '';
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

export function priorityClass(level) {
  const value = Number(level) || 1;
  return `badge badge-priority-${Math.min(Math.max(value, 1), 4)}`;
}

export function showToast(message, isError = true) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.toggle('error', isError);
  clearTimeout(showToast._timeout);
  showToast._timeout = setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}
