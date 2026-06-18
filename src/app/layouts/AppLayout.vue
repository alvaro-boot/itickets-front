<template>
  <NexusShell />
</template>

<script setup>
import { defineAsyncComponent } from 'vue';

const NexusShell = defineAsyncComponent(() => import('../../nexus/layouts/NexusShell.vue'));
</script>
