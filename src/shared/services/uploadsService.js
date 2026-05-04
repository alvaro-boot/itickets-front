import { request } from './httpClient';

export const uploadsService = {
  uploadFile: (file, { folder = 'tickets' } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/uploads?folder=${encodeURIComponent(folder)}`, { method: 'POST', body: formData }, { showLoader: true });
  },
  /** URL nueva (firmada o pública) para abrir un adjunto guardado en un comentario. */
  getViewUrl: (storedUrl) =>
    request(
      '/uploads/view-url',
      { method: 'POST', body: JSON.stringify({ url: storedUrl }) },
      { showLoader: false },
    ),
};
