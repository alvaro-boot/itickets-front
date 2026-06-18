<template>
  <span class="jira-lozenge" :class="toneClass">{{ displayLabel }}</span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, default: '' },
  code: { type: String, default: '' },
  kind: { type: String, default: 'status' },
});

const displayLabel = computed(() => {
  const raw = String(props.label || '').trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
});

const toneClass = computed(() => {
  const code = String(props.code || '').toUpperCase();
  if (props.kind === 'priority') {
    if (['CRITICAL', 'URGENT', 'HIGH'].includes(code)) return 'jira-lozenge--danger';
    if (['MEDIUM', 'NORMAL'].includes(code)) return 'jira-lozenge--warning';
    if (['LOW'].includes(code)) return 'jira-lozenge--success';
    return 'jira-lozenge--default';
  }
  if (['OPEN', 'NEW', 'IN_PROGRESS', 'ASSIGNED', 'ABIERTO'].includes(code)) return 'jira-lozenge--info';
  if (['RESOLVED', 'CLOSED', 'DONE', 'CERRADO', 'RESUELTO'].includes(code)) return 'jira-lozenge--success';
  if (['CANCELLED', 'REJECTED'].includes(code)) return 'jira-lozenge--danger';
  if (['PENDING', 'WAITING', 'ESPERA'].includes(code)) return 'jira-lozenge--warning';
  return 'jira-lozenge--default';
});
</script>
