import { computed, reactive, readonly } from 'vue';
import { getToken, setToken } from '../services/httpClient';
import { authService } from '../../modules/auth/services/authService';

const state = reactive({
  token: getToken(),
  profile: null,
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
  state.token = response.access_token;
  setToken(state.token);
  await refreshProfile();
  return response;
}

function logout() {
  state.token = null;
  state.profile = null;
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
    logout,
  };
}
