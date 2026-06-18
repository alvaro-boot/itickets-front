<template>
  <div class="global-search" ref="rootRef">
    <div class="global-search__input-wrap">
      <svg class="global-search__icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none" />
        <path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <input
        v-model.trim="query"
        class="global-search__input"
        type="search"
        placeholder="Buscar tickets (título o COOT-123)"
        autocomplete="off"
        @focus="open = true"
        @keydown.escape="closeDropdown"
      />
    </div>
    <div v-if="open && query.length >= 2" class="global-search__dropdown">
      <div v-if="loading" class="global-search__empty">Buscando...</div>
      <div v-else-if="results.length === 0" class="global-search__empty">Sin resultados</div>
      <RouterLink
        v-for="item in results"
        :key="item.id"
        class="global-search__item"
        :to="`/tickets/${item.id}`"
        @click="closeDropdown"
      >
        <IssueKeyLink :ticket="item" />
        <span class="global-search__item-title">{{ item.title }}</span>
        <StatusLozenge v-if="item.status?.name" :label="item.status.name" :code="item.status.code" />
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { ticketsService } from '../../modules/tickets/services/ticketsService';
import IssueKeyLink from './IssueKeyLink.vue';
import StatusLozenge from './StatusLozenge.vue';

const query = ref('');
const results = ref([]);
const loading = ref(false);
const open = ref(false);
const rootRef = ref(null);
let debounceTimer = null;

function closeDropdown() {
  open.value = false;
  query.value = '';
  results.value = [];
}

function onDocumentClick(event) {
  if (!rootRef.value?.contains(event.target)) {
    open.value = false;
  }
}

async function runSearch(value) {
  if (!value || value.length < 2) {
    results.value = [];
    return;
  }
  loading.value = true;
  try {
    const payload = await ticketsService.list({ q: value, limit: 8, page: 1 });
    results.value = payload?.items || [];
  } catch {
    results.value = [];
  } finally {
    loading.value = false;
  }
}

watch(query, (value) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => runSearch(value), 300);
});

onMounted(() => document.addEventListener('click', onDocumentClick));
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
  clearTimeout(debounceTimer);
});
</script>
