import { request } from '../../../shared/services/httpClient';

export const incidentsService = {
  list: ({ page = 1, limit = 25 } = {}) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    return request(`/incidents?${params.toString()}`);
  },
  create: (body) =>
    request('/incidents', { method: 'POST', body: JSON.stringify(body) }, { showLoader: true }),
  update: (id, body) => request(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
