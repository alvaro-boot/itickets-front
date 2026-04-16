import { request } from '../../../shared/services/httpClient';

export const profileService = {
  me: () => request('/users/me'),
  listUsers: () => request('/users'),
  updateMyProfile: (body) => request('/users/me/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  changeMyPassword: (body) => request('/users/me/password', { method: 'PATCH', body: JSON.stringify(body) }),
};
