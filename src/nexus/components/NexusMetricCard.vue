<template>
  <article class="nx-metric">
    <p class="nx-metric__label">{{ label }}</p>
    <p class="nx-metric__value">{{ value }}</p>
    <p v-if="delta" class="nx-metric__delta" :class="deltaClass">{{ delta }}</p>
  </article>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  delta: { type: String, default: '' },
  trend: {
    type: String,
    default: '',
    validator: (v) => !v || ['up', 'down', 'neutral'].includes(v),
  },
});

const deltaClass = computed(() => {
  if (props.trend === 'up') return 'nx-metric__delta--up';
  if (props.trend === 'down') return 'nx-metric__delta--down';
  return '';
});
</script>
