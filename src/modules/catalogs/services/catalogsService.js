import { request } from '../../../shared/services/httpClient';

export const catalogsService = {
  statuses: () => request('/catalogs/statuses'),
  priorities: () => request('/catalogs/priorities'),
  products: () => request('/catalogs/products'),
  types: () => request('/catalogs/types'),
  createProduct: (body) => request('/catalogs/products', { method: 'POST', body: JSON.stringify(body) }),
  createType: (body) => request('/catalogs/types', { method: 'POST', body: JSON.stringify(body) }),
};
