<template>
  <div class="jira-page" aria-hidden="true" />
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCreateIssue } from '../../../shared/composables/useCreateIssue';

const router = useRouter();
const { openCreateIssue } = useCreateIssue();

onMounted(() => {
  openCreateIssue();
  router.replace({ path: '/tickets' });
});
</script>
