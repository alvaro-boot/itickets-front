import { request } from '../../../shared/services/httpClient';

export const tasksService = {
  mine: () => request('/tasks/mine'),
  create: (body) => request('/tasks', { method: 'POST', body: JSON.stringify(body) }, { showLoader: true }),
  update: (id, body) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
