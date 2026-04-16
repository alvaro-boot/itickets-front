export function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
}

export function priorityClass(level) {
  const value = Number(level) || 1;
  return `badge badge-priority-${Math.min(Math.max(value, 1), 4)}`;
}

export function eventText(event) {
  if (event?.description) return event.description;
  if (event?.fromValue != null || event?.toValue != null) {
    return `${event.fieldName || 'campo'}: ${event.fromValue || '—'} -> ${event.toValue || '—'}`;
  }
  return event?.eventType || 'Movimiento';
}

export function slugifyCode(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
