import { request } from '../../../shared/services/httpClient';

export const tasksService = {
  mine: ({ page = 1, limit = 25 } = {}) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    return request(`/tasks/mine?${params.toString()}`);
  },
  create: (body) => request('/tasks', { method: 'POST', body: JSON.stringify(body) }, { showLoader: true }),
  update: (id, body) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
