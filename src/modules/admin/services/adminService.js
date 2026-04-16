import { request } from '../../../shared/services/httpClient';

export const adminService = {
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
