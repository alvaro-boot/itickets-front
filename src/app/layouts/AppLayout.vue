<template>
  <NexusShell v-if="nexusUi.enabled.value" />
  <AppShell v-else />
</template>

<script setup>
import { defineAsyncComponent } from 'vue';
import { useNexusUi } from '../../shared/composables/useNexusUi';

const nexusUi = useNexusUi();
const NexusShell = defineAsyncComponent(() => import('../../nexus/layouts/NexusShell.vue'));
const AppShell = defineAsyncComponent(() => import('./AppShell.vue'));
</script>
