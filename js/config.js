/** URL base del API NestJS (mismo origen si sirves el front detrás de un proxy). */
export const API_BASE =
  typeof window !== 'undefined' && window.__TICKETS_API_BASE__
    ? window.__TICKETS_API_BASE__
    : 'http://localhost:3000';

export const TOKEN_KEY = 'tickets_token';
