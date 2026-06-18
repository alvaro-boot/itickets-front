import { request } from '../../../shared/services/httpClient';

export const sprintsService = {
  list: () => request('/sprints'),
  active: () => request('/sprints/active'),
  create: (payload) => request('/sprints', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/sprints/${id}`, { method: 'PATCH', body: payload }),
};
