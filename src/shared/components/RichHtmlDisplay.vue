<template>
  <div ref="root" class="rich-html-content" v-html="safeHtml"></div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue';
import { sanitizeRichHtml, escapeHtml, looksLikeHtml } from '../utils/richHtml';
import { applyCodeHighlight } from '../utils/richHighlight';

const props = defineProps({
  html: { type: String, default: '' },
});

const root = ref(null);

const safeHtml = computed(() => {
  const raw = props.html || '';
  if (looksLikeHtml(raw)) return sanitizeRichHtml(raw);
  return escapeHtml(raw).replace(/\n/g, '<br>');
});

async function highlight() {
  await nextTick();
  applyCodeHighlight(root.value);
}

watch(safeHtml, highlight);
onMounted(highlight);
</script>
