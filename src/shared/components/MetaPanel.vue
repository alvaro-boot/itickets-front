<template>
  <aside class="jira-meta-panel">
    <h3 v-if="title" class="jira-meta-panel__title">{{ title }}</h3>
    <slot />
  </aside>
</template>

<script setup>
defineProps({
  title: { type: String, default: 'Detalles' },
});
</script>
