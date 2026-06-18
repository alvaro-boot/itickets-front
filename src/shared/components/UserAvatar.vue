<template>
  <span class="user-avatar" :class="{ 'user-avatar--md': size === 'md' }" :title="name">{{ initials }}</span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  size: { type: String, default: 'sm' },
});

const initials = computed(() => {
  const source = props.name || props.email || '?';
  return String(source)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
});
</script>
