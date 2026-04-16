import { reactive, readonly } from 'vue';

const state = reactive({
  loadingCount: 0,
  sidebarOpen: false,
  toast: {
    visible: false,
    message: '',
    isError: true,
  },
});

let toastTimeout = null;

function showToast(message, isError = true) {
  state.toast.visible = true;
  state.toast.message = String(message || '');
  state.toast.isError = isError;
  clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    state.toast.visible = false;
  }, 4200);
}

function startLoading() {
  state.loadingCount += 1;
}

function stopLoading() {
  state.loadingCount = Math.max(0, state.loadingCount - 1);
}

function setSidebarOpen(open) {
  state.sidebarOpen = Boolean(open);
}

export function useUi() {
  return {
    state: readonly(state),
    showToast,
    startLoading,
    stopLoading,
    setSidebarOpen,
  };
}
