/** Módulos habilitables por tenant/usuario */
export const MODULES = Object.freeze({
  TICKETS: 'tickets',
  INCIDENTS: 'incidents',
  TASKS: 'tasks',
});

/** Permisos granulares (auth v2) */
export const PERMISSIONS = Object.freeze({
  COMPANIES_MANAGE: 'companies.manage',
  CATALOGS_MANAGE: 'catalogs.manage',
  TICKETS_CREATE: 'tickets.create',
  TICKETS_ASSIGN: 'tickets.assign',
  TICKETS_CLOSE: 'tickets.close',
});

/** Estados de work items (unificación futura) */
export const WORK_ITEM_STATUS = Object.freeze({
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WAITING: 'waiting',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
});

export function hasModule(profile, moduleKey) {
  return Boolean(profile?.enabledModules?.includes(moduleKey));
}

export function hasPermission(profile, permission) {
  return Boolean(profile?.permissions?.includes(permission));
}

export function canAccessNavItem(profile, itemKey) {
  if (!profile) return true;
  switch (itemKey) {
    case 'home':
    case 'inbox':
    case 'tickets':
    case 'reports':
      return hasModule(profile, MODULES.TICKETS);
    case 'incidents':
      return hasModule(profile, MODULES.INCIDENTS);
    case 'tasks':
      return hasModule(profile, MODULES.TASKS);
    case 'catalogs':
      return hasPermission(profile, PERMISSIONS.CATALOGS_MANAGE) || hasModule(profile, MODULES.TICKETS);
    case 'admin':
      return hasPermission(profile, PERMISSIONS.COMPANIES_MANAGE);
    default:
      return true;
  }
}
