<template>
  <div class="datatable">
    <div class="datatable__toolbar">
      <div v-if="searchable" class="field-stack datatable__search">
        <label :for="searchId">Buscar</label>
        <input :id="searchId" v-model.trim="search" placeholder="Filtrar resultados..." />
      </div>
      <label class="meta datatable__limit">
        Mostrar
        <select v-model.number="pageSize">
          <option v-for="size in normalizedPageSizeOptions" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
      </label>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pagedRows.length === 0">
            <td :colspan="columns.length" class="meta">{{ emptyText }}</td>
          </tr>
          <tr v-for="row in pagedRows" :key="rowIdentity(row)">
            <td v-for="column in columns" :key="`${rowIdentity(row)}-${column.key}`">
              <slot :name="`cell-${column.key}`" :row="row">
                {{ row[column.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-footer">
      <div class="table-footer__meta">
        Mostrando {{ startIndex }}-{{ endIndex }} de {{ filteredRows.length }} registros
      </div>
      <div class="table-footer__controls">
        <button class="btn btn-ghost pagination-btn" type="button" :disabled="page === 1" @click="page -= 1">
          Anterior
        </button>
        <div class="pagination-pages">
          <button
            v-for="p in pageButtons"
            :key="p"
            type="button"
            class="btn btn-ghost pagination-page-btn"
            :class="{ 'pagination-page-btn--active': p === page }"
            @click="page = p"
          >
            {{ p }}
          </button>
        </div>
        <button class="btn btn-ghost pagination-btn" type="button" :disabled="page >= totalPages" @click="page += 1">
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  emptyText: { type: String, default: 'Sin datos' },
  searchable: { type: Boolean, default: true },
  pageSizeOptions: { type: Array, default: () => [10, 25, 50] },
  initialPageSize: { type: Number, default: 10 },
});

const search = ref('');
const page = ref(1);
const pageSize = ref(props.initialPageSize);
const searchId = `datatable-search-${Math.random().toString(36).slice(2, 8)}`;

const normalizedPageSizeOptions = computed(() =>
  Array.from(new Set(props.pageSizeOptions.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0))),
);

function rowIdentity(row) {
  return row?.[props.rowKey] ?? JSON.stringify(row);
}

const filteredRows = computed(() => {
  if (!props.searchable || !search.value) return props.rows;
  const term = search.value.toLowerCase();
  return props.rows.filter((row) =>
    props.columns.some((column) => String(row?.[column.key] ?? '').toLowerCase().includes(term)),
  );
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)));

const startIndex = computed(() => (filteredRows.value.length ? (page.value - 1) * pageSize.value + 1 : 0));
const endIndex = computed(() => Math.min(page.value * pageSize.value, filteredRows.value.length));

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

const pageButtons = computed(() => {
  const pages = totalPages.value;
  const cur = page.value;
  const start = Math.max(1, cur - 2);
  const end = Math.min(pages, cur + 2);
  const arr = [];
  for (let i = start; i <= end; i += 1) arr.push(i);
  return arr;
});

watch([search, pageSize, () => props.rows], () => {
  page.value = 1;
});

watch(totalPages, (next) => {
  if (page.value > next) page.value = next;
});
</script>
