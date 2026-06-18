import { computed, reactive, readonly } from 'vue';

const STORAGE_KEY = 'nexus_ui_enabled';

const state = reactive({
  enabled: true,
});

function setEnabled(value) {
  state.enabled = Boolean(value);
  localStorage.setItem(STORAGE_KEY, 'true');
  document.documentElement.classList.add('nexus-ui-active');
  document.title = 'Nexus Desk';
}

function toggle() {
  setEnabled(true);
}

export function useNexusUi() {
  return {
    state: readonly(state),
    enabled: computed(() => true),
    setEnabled,
    toggle,
  };
}

export function initNexusUi() {
  localStorage.setItem(STORAGE_KEY, 'true');
  state.enabled = true;
  document.documentElement.classList.add('nexus-ui-active');
  document.title = 'Nexus Desk';
}
