<template>
  <RouterLink v-if="to" :to="to" class="jira-issue-key">{{ displayKey }}</RouterLink>
  <span v-else class="jira-issue-key">{{ displayKey }}</span>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { formatTicketKey } from '../utils/formatTicketKey';

const props = defineProps({
  ticket: { type: Object, default: null },
  id: { type: [String, Number], default: '' },
  key: { type: String, default: '' },
  companyCode: { type: String, default: '' },
  to: { type: [Object, String], default: null },
});

const displayKey = computed(() => {
  if (props.key) return props.key;
  if (props.ticket?.key) return props.ticket.key;
  const ticketId = props.ticket?.id ?? props.id;
  if (!ticketId) return '';
  return formatTicketKey(props.companyCode || props.ticket?.companyCode, ticketId);
});
</script>
