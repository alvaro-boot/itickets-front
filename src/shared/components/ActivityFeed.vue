<template>
  <div class="jira-activity">
    <div v-if="filterTabs" class="jira-activity-tabs" role="tablist">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        type="button"
        class="jira-activity-tab"
        :class="{ active: activeFilter === tab.key }"
        @click="activeFilter = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>
    <div v-if="filteredItems.length === 0" class="meta" style="padding: 0.75rem 0">Sin actividad registrada.</div>
    <article v-for="item in filteredItems" :key="item.id" class="jira-activity-item">
      <UserAvatar :name="item.authorName" :email="item.authorEmail" size="md" />
      <div>
        <div class="jira-activity-item__head">
          <span class="jira-activity-item__author">{{ item.authorName || 'Sistema' }}</span>
          <span class="jira-activity-item__when">{{ fmtDate(item.createdAt) }}</span>
          <StatusLozenge v-if="item.badge" :label="item.badge" code="INFO" />
        </div>
        <div class="jira-activity-item__body">
          <RichHtmlDisplay v-if="item.html" :html="item.html" />
          <template v-else>{{ item.body }}</template>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import UserAvatar from './UserAvatar.vue';
import StatusLozenge from './StatusLozenge.vue';
import RichHtmlDisplay from './RichHtmlDisplay.vue';
import { fmtDate } from '../utils/format';

const props = defineProps({
  items: { type: Array, default: () => [] },
  showFilters: { type: Boolean, default: true },
});

const activeFilter = ref('all');

const filterTabs = computed(() => {
  if (!props.showFilters) return null;
  return [
    { key: 'all', label: 'Todo' },
    { key: 'comments', label: 'Comentarios' },
    { key: 'history', label: 'Historial' },
    { key: 'worklogs', label: 'Tiempo' },
  ];
});

const filteredItems = computed(() => {
  if (!props.showFilters || activeFilter.value === 'all') return props.items;
  return props.items.filter((item) => item.type === activeFilter.value);
});
</script>
