import { request } from '../../../shared/services/httpClient';

export const incidentsService = {
  list: () => request('/incidents'),
  create: (body) =>
    request('/incidents', { method: 'POST', body: JSON.stringify(body) }, { showLoader: true }),
  update: (id, body) => request(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
