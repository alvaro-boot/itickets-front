import { request } from '../../../shared/services/httpClient';

export const dashboardService = {
  monthly: (year, month) => request(`/reports/dashboard?year=${year}&month=${month}`),
  velocity: () => request('/reports/velocity'),
  burndown: (sprintId) => request(`/reports/burndown/${sprintId}`),
};
