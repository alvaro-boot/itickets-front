import { request } from './httpClient';

export const uploadsService = {
  uploadFile: (file, { folder = 'tickets' } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/uploads?folder=${encodeURIComponent(folder)}`, { method: 'POST', body: formData }, { showLoader: true });
  },
};
