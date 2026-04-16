import { API_BASE, TOKEN_KEY } from './config';
import { useUi } from '../composables/useUi';

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
  const ui = useUi();
  const method = String(options.method || 'GET').toUpperCase();
  const token = getToken();
  const shouldUseGetCache = method === 'GET' && !extras.noCache;
  const shouldShowLoader = Boolean(extras.showLoader);
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

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (shouldShowLoader) ui.startLoading();

  const requestPromise = (async () => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      throw new Error(parseErrorMessage(data, response.status));
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
    if (shouldShowLoader) ui.stopLoading();
  }
}
