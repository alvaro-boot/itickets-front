import { computed, reactive, readonly } from 'vue';
import { getToken, setToken } from '../services/httpClient';
import { authService } from '../../modules/auth/services/authService';

const state = reactive({
  token: getToken(),
  profile: null,
  pendingCompanySelection: null,
  initialized: false,
});

async function hydrateProfile() {
  if (!state.token) {
    state.profile = null;
    state.initialized = true;
    return null;
  }

  try {
    state.profile = await authService.me();
    return state.profile;
  } catch (error) {
    logout();
    throw error;
  } finally {
    state.initialized = true;
  }
}

async function initAuth() {
  if (state.initialized) return state.profile;
  return hydrateProfile();
}

async function refreshProfile() {
  state.token = getToken();
  if (!state.token) {
    state.profile = null;
    return null;
  }
  state.profile = await authService.me();
  return state.profile;
}

async function login(credentials) {
  const response = await authService.login(credentials);
  if (response?.requiresCompanySelection) {
    state.pendingCompanySelection = {
      selectionToken: response.selectionToken,
      companies: response.companies || [],
      user: response.user || null,
    };
    state.token = null;
    state.profile = null;
    setToken(null);
    return response;
  }

  state.pendingCompanySelection = null;
  state.token = response.access_token;
  setToken(state.token);
  await refreshProfile();
  return response;
}

async function selectCompany(companyId) {
  const selectionToken = state.pendingCompanySelection?.selectionToken;
  if (!selectionToken) {
    throw new Error('No hay una selección de empresa pendiente.');
  }
  const response = await authService.selectCompany({ selectionToken, companyId });
  state.pendingCompanySelection = null;
  state.token = response.access_token;
  setToken(state.token);
  await refreshProfile();
  return response;
}

async function switchCompany(companyId) {
  const response = await authService.switchCompany({ companyId });
  state.token = response.access_token;
  setToken(state.token);
  await refreshProfile();
  return response;
}

function logout() {
  state.token = null;
  state.profile = null;
  state.pendingCompanySelection = null;
  state.initialized = true;
  setToken(null);
}

export function useAuth() {
  return {
    state: readonly(state),
    isAuthenticated: computed(() => Boolean(state.token)),
    initAuth,
    hydrateProfile,
    refreshProfile,
    login,
    selectCompany,
    switchCompany,
    logout,
  };
}
