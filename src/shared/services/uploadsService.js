import { request } from './httpClient';

export const uploadsService = {
  uploadFile: (file, { folder = 'tickets' } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/uploads?folder=${encodeURIComponent(folder)}`, { method: 'POST', body: formData }, { showLoader: true });
  },
  getViewUrl: (storedUrl) =>
    request(
      '/uploads/view-url',
      { method: 'POST', body: JSON.stringify({ url: storedUrl }) },
      { showLoader: false },
    ),
  getViewUrls: (urls) =>
    request(
      '/uploads/view-urls',
      { method: 'POST', body: JSON.stringify({ urls }) },
      { showLoader: false },
    ),
};
