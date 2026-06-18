<template>
  <span class="nx-pill" :class="pillClass">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    default: 'open',
  },
  label: {
    type: String,
    required: true,
  },
});

const STATUS_MAP = {
  open: 'nx-pill--open',
  nuevo: 'nx-pill--open',
  in_progress: 'nx-pill--progress',
  en_progreso: 'nx-pill--progress',
  waiting: 'nx-pill--waiting',
  espera: 'nx-pill--waiting',
  resolved: 'nx-pill--done',
  resuelto: 'nx-pill--done',
  closed: 'nx-pill--closed',
  cerrado: 'nx-pill--closed',
};

const pillClass = computed(() => STATUS_MAP[props.status?.toLowerCase()] || 'nx-pill--open');
</script>
