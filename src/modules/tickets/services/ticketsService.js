import { request } from '../../../shared/services/httpClient';

export const ticketsService = {
  list: ({ q, from, to, statusId, view, page = 1, limit = 25 } = {}) => {
    const params = new URLSearchParams();
    if (q && String(q).trim()) params.set('q', String(q).trim());
    if (from && String(from).trim()) params.set('from', String(from).trim());
    if (to && String(to).trim()) params.set('to', String(to).trim());
    if (statusId && String(statusId).trim()) params.set('statusId', String(statusId).trim());
    if (view && String(view).trim()) params.set('view', String(view).trim());
    params.set('page', String(page));
    params.set('limit', String(limit));
    return request(`/tickets?${params.toString()}`);
  },
  get: (id, options = {}) => {
    const params = new URLSearchParams();
    const add = (key, value) => {
      if (value === undefined || value === null || value === '') return;
      params.set(key, String(value));
    };
    add('includeComments', options.includeComments);
    add('includeEvents', options.includeEvents);
    add('includeWorklogs', options.includeWorklogs);
    add('commentsLimit', options.commentsLimit);
    add('eventsLimit', options.eventsLimit);
    add('worklogsLimit', options.worklogsLimit);
    const query = params.toString();
    return request(`/tickets/${id}${query ? `?${query}` : ''}`);
  },
  create: (body) =>
    request('/tickets', { method: 'POST', body: JSON.stringify(body) }, { showLoader: true }),
  duplicate: (id, body) =>
    request(`/tickets/${id}/duplicate`, { method: 'POST', body: JSON.stringify(body) }, { showLoader: true }),
  update: (id, body) => request(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  comment: (id, body) => request(`/tickets/${id}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  deleteComment: (id, commentId) => request(`/tickets/${id}/comments/${commentId}`, { method: 'DELETE' }),
  addWorklog: (id, body) => request(`/tickets/${id}/worklogs`, { method: 'POST', body: JSON.stringify(body) }),
};
