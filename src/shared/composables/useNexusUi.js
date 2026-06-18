import { computed, reactive, readonly } from 'vue';

const STORAGE_KEY = 'nexus_ui_enabled';

function readInitialEnabled() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return import.meta.env.VITE_NEXUS_UI === 'true';
}

const state = reactive({
  enabled: readInitialEnabled(),
});

function setEnabled(value) {
  state.enabled = Boolean(value);
  localStorage.setItem(STORAGE_KEY, state.enabled ? 'true' : 'false');
  document.documentElement.classList.toggle('nexus-ui-active', state.enabled);
  if (state.enabled) {
    document.title = 'Nexus Desk';
  } else {
    document.title = 'Service Desk';
  }
}

function toggle() {
  setEnabled(!state.enabled);
}

export function useNexusUi() {
  return {
    state: readonly(state),
    enabled: computed(() => state.enabled),
    setEnabled,
    toggle,
  };
}

export function initNexusUi() {
  document.documentElement.classList.toggle('nexus-ui-active', state.enabled);
  if (state.enabled) {
    document.title = 'Nexus Desk';
  }
}
