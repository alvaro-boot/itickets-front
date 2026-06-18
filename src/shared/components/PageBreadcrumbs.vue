<template>
  <nav class="jira-breadcrumb" aria-label="Breadcrumb">
    <template v-for="(crumb, index) in crumbs" :key="`${crumb.label}-${index}`">
      <span v-if="index > 0" class="jira-breadcrumb__sep" aria-hidden="true">/</span>
      <RouterLink v-if="crumb.to" :to="crumb.to">{{ crumb.label }}</RouterLink>
      <span v-else class="jira-breadcrumb__current">{{ crumb.label }}</span>
    </template>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const props = defineProps({
  items: { type: Array, default: null },
  currentLabel: { type: String, default: '' },
});

const route = useRoute();

const crumbs = computed(() => {
  if (props.items?.length) {
    return props.items;
  }
  const metaCrumbs = route.meta?.breadcrumb;
  if (Array.isArray(metaCrumbs) && metaCrumbs.length) {
    const list = [...metaCrumbs];
    if (props.currentLabel) {
      list.push({ label: props.currentLabel });
    }
    return list;
  }
  const title = props.currentLabel || route.meta?.title;
  return title ? [{ label: title }] : [];
});
</script>
