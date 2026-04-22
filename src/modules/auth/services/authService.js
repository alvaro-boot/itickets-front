import { request } from '../../../shared/services/httpClient';

export const authService = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  selectCompany: (body) => request('/auth/select-company', { method: 'POST', body: JSON.stringify(body) }),
  switchCompany: (body) => request('/auth/switch-company', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/users/me'),
};
