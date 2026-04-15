import { API_BASE, TOKEN_KEY } from './config.js';

const GET_CACHE_TTL_MS = 15000;
const getCache = new Map();
const inflightGet = new Map();

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function parseErrorMessage(payload, status) {
  if (!payload) return `Error ${status}`;
  if (typeof payload.message === 'string') return payload.message;
  if (Array.isArray(payload.message)) return payload.message.join(', ');
  if (payload.error) return String(payload.error);
  return `Error ${status}`;
}

function notifyLoading(isLoading) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('itickets:loading', {
      detail: { isLoading },
    }),
  );
}

function buildCacheKey(path, options, token) {
  const method = String(options.method || 'GET').toUpperCase();
  const body = typeof options.body === 'string' ? options.body : '';
  return `${method}::${path}::${token || ''}::${body}`;
}

function clearRequestCaches() {
  getCache.clear();
  inflightGet.clear();
}

export async function request(path, options = {}, extras = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const shouldShowCreateLoader = Boolean(extras.showLoader);
  const token = getToken();
  const shouldUseGetCache = method === 'GET' && !extras.noCache;
  const cacheKey = buildCacheKey(path, options, token);
  if (shouldUseGetCache) {
    const cached = getCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < GET_CACHE_TTL_MS) {
      return cached.data;
    }
    if (inflightGet.has(cacheKey)) {
      return inflightGet.get(cacheKey);
    }
  } else if (method !== 'GET') {
    clearRequestCaches();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  if (shouldShowCreateLoader) notifyLoading(true);
  const requestPromise = (async () => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!res.ok) {
      throw new Error(parseErrorMessage(data, res.status));
    }
    if (shouldUseGetCache) {
      getCache.set(cacheKey, {
        timestamp: Date.now(),
        data,
      });
    }
    return data;
  })();

  if (shouldUseGetCache) inflightGet.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    if (shouldUseGetCache) inflightGet.delete(cacheKey);
    if (shouldShowCreateLoader) notifyLoading(false);
  }
}

export const auth = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/users/me'),
};

export const catalogs = {
  statuses: () => request('/catalogs/statuses'),
  priorities: () => request('/catalogs/priorities'),
  products: () => request('/catalogs/products'),
  types: () => request('/catalogs/types'),
  createProduct: (body) => request('/catalogs/products', { method: 'POST', body: JSON.stringify(body) }),
  createType: (body) => request('/catalogs/types', { method: 'POST', body: JSON.stringify(body) }),
};

export const users = {
  list: () => request('/users'),
  me: () => request('/users/me'),
  updateMyProfile: (body) => request('/users/me/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  changeMyPassword: (body) => request('/users/me/password', { method: 'PATCH', body: JSON.stringify(body) }),
};

export const tickets = {
  list: ({ q, page = 1, limit = 25 } = {}) => {
    const params = new URLSearchParams();
    if (q && String(q).trim()) params.set('q', String(q).trim());
    params.set('page', String(page));
    params.set('limit', String(limit));
    return request(`/tickets?${params.toString()}`);
  },
  get: (id) => request(`/tickets/${id}`),
  create: (body) =>
    request('/tickets', { method: 'POST', body: JSON.stringify(body) }, { showLoader: true }),
  duplicate: (id, body) =>
    request(`/tickets/${id}/duplicate`, { method: 'POST', body: JSON.stringify(body) }, { showLoader: true }),
  reassign: (id, body) =>
    request(`/tickets/${id}/assignee`, { method: 'PATCH', body: JSON.stringify(body) }, { noCache: true }),
  update: (id, body) => request(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  comment: (id, body) => request(`/tickets/${id}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  addWorklog: (id, body) => request(`/tickets/${id}/worklogs`, { method: 'POST', body: JSON.stringify(body) }),
};

export const reports = {
  resolution: (from, to) => request(`/reports/resolution?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  ticketsByUser: (from, to) =>
    request(`/reports/tickets-by-user?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
};

export const incidents = {
  list: () => request('/incidents'),
  create: (body) =>
    request('/incidents', { method: 'POST', body: JSON.stringify(body) }, { showLoader: true }),
  update: (id, body) => request(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const tasks = {
  mine: () => request('/tasks/mine'),
  create: (body) => request('/tasks', { method: 'POST', body: JSON.stringify(body) }, { showLoader: true }),
  update: (id, body) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const admin = {
  companies: () => request('/admin/companies'),
  createCompany: (body) => request('/admin/companies', { method: 'POST', body: JSON.stringify(body) }),
  companyModules: (companyId) => request(`/admin/companies/${companyId}/modules`),
  setCompanyModules: (companyId, body) =>
    request(`/admin/companies/${companyId}/modules`, { method: 'PATCH', body: JSON.stringify(body) }),
  permissions: () => request('/admin/permissions'),
  roles: (companyId) => request(`/admin/companies/${companyId}/roles`),
  setRolePermissions: (roleId, body) =>
    request(`/admin/roles/${roleId}/permissions`, { method: 'PATCH', body: JSON.stringify(body) }),
  createUser: (body) => request('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
};
