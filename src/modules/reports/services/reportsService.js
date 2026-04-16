import { request } from '../../../shared/services/httpClient';

export const reportsService = {
  resolution: (from, to) => request(`/reports/resolution?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  ticketsByUser: (from, to) =>
    request(`/reports/tickets-by-user?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
};
