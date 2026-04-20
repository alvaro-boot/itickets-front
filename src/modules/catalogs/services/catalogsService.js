import { request } from '../../../shared/services/httpClient';

export const catalogsService = {
  statuses: () => request('/catalogs/statuses'),
  priorities: () => request('/catalogs/priorities'),
  products: () => request('/catalogs/products'),
  types: () => request('/catalogs/types'),
  areas: () => request('/catalogs/areas'),
  createProduct: (body) => request('/catalogs/products', { method: 'POST', body: JSON.stringify(body) }),
  createType: (body) => request('/catalogs/types', { method: 'POST', body: JSON.stringify(body) }),
  createArea: (body) => request('/catalogs/areas', { method: 'POST', body: JSON.stringify(body) }),
};
