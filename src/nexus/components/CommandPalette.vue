<template>
  <Teleport to="body">
    <div v-if="open" class="nx-palette-backdrop" @click.self="close">
      <div class="nx-palette" role="dialog" aria-label="Paleta de comandos" @keydown.escape="close">
        <div class="nx-palette__input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref="inputRef"
            v-model="query"
            class="nx-palette__input"
            type="text"
            placeholder="Buscar comandos y páginas…"
            autocomplete="off"
            @keydown.down.prevent="moveHighlight(1)"
            @keydown.up.prevent="moveHighlight(-1)"
            @keydown.enter.prevent="runHighlighted"
          />
        </div>
        <div class="nx-palette__list" role="listbox">
          <template v-if="filteredGroups.length">
            <div v-for="group in filteredGroups" :key="group.label">
              <p class="nx-palette__group-label">{{ group.label }}</p>
              <button
                v-for="(item, idx) in group.items"
                :key="item.id"
                type="button"
                class="nx-palette__item"
                :class="{ 'nx-palette__item--active': flatIndex(group.label, idx) === highlighted }"
                role="option"
                @click="run(item)"
                @mouseenter="highlighted = flatIndex(group.label, idx)"
              >
                <span>{{ item.label }}</span>
                <span v-if="item.hint" class="nx-palette__item-hint">{{ item.hint }}</span>
              </button>
            </div>
          </template>
          <p v-else class="nx-palette__empty">Sin resultados</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  open: { type: Boolean, default: false },
  commands: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'run']);

const router = useRouter();
const query = ref('');
const highlighted = ref(0);
const inputRef = ref(null);

const normalizedQuery = computed(() => query.value.trim().toLowerCase());

const filteredGroups = computed(() => {
  const q = normalizedQuery.value;
  return props.commands
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!q) return true;
        const haystack = `${item.label} ${item.hint || ''} ${item.keywords || ''}`.toLowerCase();
        return haystack.includes(q);
      }),
    }))
    .filter((group) => group.items.length > 0);
});

const flatItems = computed(() => filteredGroups.value.flatMap((g) => g.items));

function flatIndex(groupLabel, itemIdx) {
  let index = 0;
  for (const group of filteredGroups.value) {
    if (group.label === groupLabel) return index + itemIdx;
    index += group.items.length;
  }
  return 0;
}

function moveHighlight(delta) {
  const total = flatItems.value.length;
  if (!total) return;
  highlighted.value = (highlighted.value + delta + total) % total;
}

function run(item) {
  emit('run', item);
  if (item.to) {
    router.push(item.to);
  } else if (item.action) {
    item.action();
  }
  close();
}

function runHighlighted() {
  const item = flatItems.value[highlighted.value];
  if (item) run(item);
}

function close() {
  query.value = '';
  highlighted.value = 0;
  emit('close');
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      inputRef.value?.focus();
    }
  },
);

watch(normalizedQuery, () => {
  highlighted.value = 0;
});
</script>
