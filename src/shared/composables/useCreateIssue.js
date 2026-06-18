import { computed, reactive } from 'vue';

const state = reactive({
  open: false,
});

export function useCreateIssue() {
  function openCreateIssue() {
    state.open = true;
  }

  function closeCreateIssue() {
    state.open = false;
  }

  return {
    createIssueOpen: computed(() => state.open),
    openCreateIssue,
    closeCreateIssue,
  };
}
