import { computed } from 'vue';
import { canAccessNavItem, hasModule, hasPermission, PERMISSIONS, MODULES } from '@nexus-desk/shared';
import { useAuth } from './useAuth';

export function usePermissions() {
  const auth = useAuth();

  const profile = computed(() => auth.state.profile);

  function can(permission) {
    return hasPermission(profile.value, permission);
  }

  function moduleEnabled(moduleKey) {
    return hasModule(profile.value, moduleKey);
  }

  function canSeeNav(itemKey) {
    return canAccessNavItem(profile.value, itemKey);
  }

  async function refresh() {
    return auth.refreshProfile();
  }

  return {
    profile,
    can,
    moduleEnabled,
    canSeeNav,
    refresh,
    PERMISSIONS,
    MODULES,
  };
}
