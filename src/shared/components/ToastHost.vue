<template>
  <div
    v-if="ui.state.toast.visible"
    class="toast"
    :class="{ error: ui.state.toast.isError }"
    role="status"
    aria-live="polite"
  >
    {{ ui.state.toast.message }}
  </div>
</template>

<script setup>
import { useUi } from '../composables/useUi';

const ui = useUi();
</script>
