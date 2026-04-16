export const API_BASE =
  typeof window !== 'undefined' && window.__TICKETS_API_BASE__
    ? window.__TICKETS_API_BASE__
    : 'https://itickets-ru1k.vercel.app';

export const TOKEN_KEY = 'tickets_token';
