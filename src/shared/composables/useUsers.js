import { reactive, readonly } from 'vue';
import { profileService } from '../../modules/profile/services/profileService';

const USERS_LIST_TTL_MS = 30000;

const state = reactive({
  users: null,
  fetchedAt: 0,
});

async function fetchUsersList(force = false) {
  if (!force && state.users && Date.now() - state.fetchedAt < USERS_LIST_TTL_MS) {
    return state.users;
  }
  state.users = await profileService.listUsers().catch(() => []);
  state.fetchedAt = Date.now();
  return state.users;
}

function invalidateUsersCache() {
  state.users = null;
  state.fetchedAt = 0;
}

export function useUsers() {
  return {
    state: readonly(state),
    fetchUsersList,
    invalidateUsersCache,
  };
}
