export function formatTicketKey(companyCode, ticketId) {
  const code = String(companyCode || 'TK')
    .trim()
    .toUpperCase();
  return `${code}-${ticketId}`;
}

export function parseTicketKey(query) {
  const match = String(query || '').trim().match(/^([A-Za-z0-9]+)-(\d+)$/);
  if (!match) return null;
  return { prefix: match[1].toUpperCase(), id: match[2] };
}
