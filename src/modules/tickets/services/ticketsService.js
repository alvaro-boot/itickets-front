import { request } from '../../../shared/services/httpClient';

export const ticketsService = {
  list: ({ q, from, to, statusId, page = 1, limit = 25 } = {}) => {
    const params = new URLSearchParams();
    if (q && String(q).trim()) params.set('q', String(q).trim());
    if (from && String(from).trim()) params.set('from', String(from).trim());
    if (to && String(to).trim()) params.set('to', String(to).trim());
    if (statusId && String(statusId).trim()) params.set('statusId', String(statusId).trim());
    params.set('page', String(page));
    params.set('limit', String(limit));
    return request(`/tickets?${params.toString()}`);
  },
  get: (id) => request(`/tickets/${id}`),
  create: (body) =>
    request('/tickets', { method: 'POST', body: JSON.stringify(body) }, { showLoader: true }),
  duplicate: (id, body) =>
    request(`/tickets/${id}/duplicate`, { method: 'POST', body: JSON.stringify(body) }, { showLoader: true }),
  reassign: (id, body) =>
    request(`/tickets/${id}/assignee`, { method: 'PATCH', body: JSON.stringify(body) }, { noCache: true }),
  update: (id, body) => request(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  comment: (id, body) => request(`/tickets/${id}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  deleteComment: (id, commentId) => request(`/tickets/${id}/comments/${commentId}`, { method: 'DELETE' }),
  addWorklog: (id, body) => request(`/tickets/${id}/worklogs`, { method: 'POST', body: JSON.stringify(body) }),
};
