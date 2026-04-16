import { request } from '../../../shared/services/httpClient';

function buildParams(from, to, filters = {}) {
  const params = new URLSearchParams();
  params.set('from', from);
  params.set('to', to);
  if (filters.statusId) params.set('statusId', filters.statusId);
  if (filters.resolution && filters.resolution !== 'all') params.set('resolution', filters.resolution);
  return params.toString();
}

export const reportsService = {
  resolution: (from, to, filters) => request(`/reports/resolution?${buildParams(from, to, filters)}`),
  ticketsByUser: (from, to, filters) => request(`/reports/tickets-by-user?${buildParams(from, to, filters)}`),
  distribution: (from, to, filters) => request(`/reports/distribution?${buildParams(from, to, filters)}`),
};
