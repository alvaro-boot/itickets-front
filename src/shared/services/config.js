const localApiBase =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:3000'
    : 'https://itickets-ru1k.vercel.app';

export const API_BASE =
  typeof window !== 'undefined' && window.__TICKETS_API_BASE__ ? window.__TICKETS_API_BASE__ : localApiBase;

export const TOKEN_KEY = 'tickets_token';
