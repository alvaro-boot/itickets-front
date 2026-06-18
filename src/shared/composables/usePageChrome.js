import { computed, reactive } from 'vue';

const state = reactive({
  breadcrumbCurrent: '',
});

export function usePageChrome() {
  function setBreadcrumbCurrent(label) {
    state.breadcrumbCurrent = String(label || '').trim();
  }

  function clearBreadcrumbCurrent() {
    state.breadcrumbCurrent = '';
  }

  return {
    breadcrumbCurrent: computed(() => state.breadcrumbCurrent),
    setBreadcrumbCurrent,
    clearBreadcrumbCurrent,
  };
}
