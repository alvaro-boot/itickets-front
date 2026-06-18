<template>
  <section class="page page--tickets">
    <div class="page__toolbar">
      <div class="jira-tabs jira-tabs--flat" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="jira-tab"
          :class="{ active: activeTab === tab.key }"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span class="badge">{{ tabTotals[tab.key] || 0 }}</span>
        </button>
      </div>

      <div class="page__toolbar-actions">
        <button
          type="button"
          class="btn btn-ghost btn--sm"
          :class="{ 'btn--active': filtersOpen }"
          @click="filtersOpen = !filtersOpen"
        >
          Filtros
        </button>
      </div>
    </div>

    <div v-if="activeFilters.length" class="filter-chips">
      <span v-for="chip in activeFilters" :key="chip.key" class="filter-chip">
        {{ chip.label }}
        <button type="button" aria-label="Quitar filtro" @click="chip.clear()">×</button>
      </span>
      <button type="button" class="filter-chip filter-chip--clear" @click="clearFilters">Limpiar todo</button>
    </div>

    <form v-if="filtersOpen" class="filter-panel" @submit.prevent="applyFilters">
      <div class="field-stack">
        <label for="from">Desde</label>
        <input id="from" type="date" v-model="filters.from" @change="applyFilters" />
      </div>
      <div class="field-stack">
        <label for="to">Hasta</label>
        <input id="to" type="date" v-model="filters.to" @change="applyFilters" />
      </div>
      <div class="field-stack">
        <label for="productId">Producto</label>
        <select id="productId" v-model="filters.productId" @change="applyFilters">
          <option value="">Todos</option>
          <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
        </select>
      </div>
    </form>

    <div class="table-wrap table-wrap--flat">
      <table>
        <thead>
          <tr>
            <th>Clave</th>
            <th>
              <button type="button" class="datatable__sort-btn" :class="{ 'datatable__sort-btn--active': sortBy === 'title' }" @click="toggleSort('title')">
                <span>Resumen</span>
                <span class="datatable__sort-indicator">{{ sortIndicator('title') }}</span>
              </button>
            </th>
            <th class="hide-mobile">Pts</th>
            <th>Estado</th>
            <th>
              <button type="button" class="datatable__sort-btn" :class="{ 'datatable__sort-btn--active': sortBy === 'priority' }" @click="toggleSort('priority')">
                <span>Prioridad</span>
                <span class="datatable__sort-indicator">{{ sortIndicator('priority') }}</span>
              </button>
            </th>
            <th class="hide-mobile">Asignado</th>
            <th class="hide-mobile">
              <button type="button" class="datatable__sort-btn" :class="{ 'datatable__sort-btn--active': sortBy === 'updatedAt' }" @click="toggleSort('updatedAt')">
                <span>Actualizado</span>
                <span class="datatable__sort-indicator">{{ sortIndicator('updatedAt') }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7">
              <div class="skeleton-stack skeleton-rows">
                <div v-for="n in 5" :key="n" class="skeleton-line skeleton-line--lg skeleton-line--w90"></div>
              </div>
            </td>
          </tr>
          <tr v-else-if="visibleRows.length === 0">
            <td colspan="7"><div class="empty-state">No hay tickets en esta vista.</div></td>
          </tr>
          <tr v-for="ticket in visibleRows" :key="ticket.id" class="table-row-clickable">
            <td>
              <IssueKeyLink :ticket="ticket" :to="{ path: `/tickets/${ticket.id}`, query: currentListQuery }" />
            </td>
            <td>
              <RouterLink class="table-summary-link" :to="{ path: `/tickets/${ticket.id}`, query: currentListQuery }">
                {{ ticket.title }}
              </RouterLink>
            </td>
            <td class="meta hide-mobile">{{ ticket.storyPoints ?? '—' }}</td>
            <td>
              <StatusLozenge v-if="ticket.status?.name" :label="ticket.status.name" :code="ticket.status.code" />
            </td>
            <td>
              <StatusLozenge
                v-if="ticket.priority?.name"
                :label="ticket.priority.name"
                :code="ticket.priority.code"
                kind="priority"
              />
            </td>
            <td class="hide-mobile">
              <span v-if="ticket.assignee" class="assignee-cell">
                <UserAvatar :name="ticket.assignee.fullName" :email="ticket.assignee.email" />
                {{ ticket.assignee.fullName || ticket.assignee.email }}
              </span>
              <span v-else class="meta">—</span>
            </td>
            <td class="meta hide-mobile">{{ fmtDate(ticket.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="table-footer table-footer--flat" aria-label="Paginación">
      <span class="table-footer__meta">{{ paginationMeta }}</span>
      <div class="table-footer__controls">
        <select v-model.number="limit" class="page-size-select" @change="handleLimitChange">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
        <button class="btn btn-ghost btn--sm" type="button" :disabled="page === 1" @click="prevPage">←</button>
        <span class="pagination-label">{{ page }} / {{ totalPages }}</span>
        <button class="btn btn-ghost btn--sm" type="button" :disabled="page >= totalPages" @click="nextPage">→</button>
      </div>
    </footer>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ticketsService } from '../services/ticketsService';
import { useCatalogs } from '../../../shared/composables/useCatalogs';
import { useUi } from '../../../shared/composables/useUi';
import { fmtDate } from '../../../shared/utils/format';
import IssueKeyLink from '../../../shared/components/IssueKeyLink.vue';
import StatusLozenge from '../../../shared/components/StatusLozenge.vue';
import UserAvatar from '../../../shared/components/UserAvatar.vue';

defineOptions({ name: 'tickets' });

const ui = useUi();
const route = useRoute();
const router = useRouter();
const { fetchCatalogBundle } = useCatalogs();

const loading = ref(false);
const filtersOpen = ref(false);
const query = ref('');
const filters = reactive({ from: '', to: '', productId: '' });
const rows = ref([]);
const products = ref([]);
const activeTab = ref('all');
const page = ref(1);
const limit = ref(25);
const sortBy = ref('updatedAt');
const sortDir = ref('desc');
const total = ref(0);
const tabTotals = ref({ all: 0, mine: 0, unassigned: 0, closed: 0, backlog: 0 });

const tabs = [
  { key: 'all', label: 'Todos' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'mine', label: 'Míos' },
  { key: 'unassigned', label: 'Sin asignar' },
  { key: 'closed', label: 'Cerrados' },
];

const visibleRows = computed(() => rows.value);

const currentListQuery = computed(() => ({
  q: query.value || undefined,
  from: filters.from || undefined,
  to: filters.to || undefined,
  productId: filters.productId || undefined,
  sortBy: sortBy.value !== 'updatedAt' ? sortBy.value : undefined,
  sortDir: sortBy.value !== 'updatedAt' || sortDir.value !== 'desc' ? sortDir.value : undefined,
  view: activeTab.value !== 'all' ? activeTab.value : undefined,
  page: page.value > 1 ? String(page.value) : undefined,
  limit: limit.value !== 25 ? String(limit.value) : undefined,
}));

const activeFilters = computed(() => {
  const chips = [];
  if (query.value) {
    chips.push({
      key: 'q',
      label: `«${query.value}»`,
      clear: () => {
        query.value = '';
        applyFilters();
      },
    });
  }
  if (filters.from) {
    chips.push({
      key: 'from',
      label: `Desde ${filters.from}`,
      clear: () => {
        filters.from = '';
        applyFilters();
      },
    });
  }
  if (filters.to) {
    chips.push({
      key: 'to',
      label: `Hasta ${filters.to}`,
      clear: () => {
        filters.to = '';
        applyFilters();
      },
    });
  }
  if (filters.productId) {
    const name = products.value.find((p) => String(p.id) === String(filters.productId))?.name || 'Producto';
    chips.push({
      key: 'product',
      label: name,
      clear: () => {
        filters.productId = '';
        applyFilters();
      },
    });
  }
  return chips;
});

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function hydrateFromRouteQuery() {
  query.value = String(route.query.q || '').trim();
  filters.from = String(route.query.from || '').trim();
  filters.to = String(route.query.to || '').trim();
  filters.productId = String(route.query.productId || '').trim();
  const incomingView = String(route.query.view || 'all').trim();
  activeTab.value = tabs.some((tab) => tab.key === incomingView) ? incomingView : 'all';
  page.value = parsePositiveInt(route.query.page, 1);
  const incomingLimit = parsePositiveInt(route.query.limit, 25);
  limit.value = [10, 25, 50].includes(incomingLimit) ? incomingLimit : 25;
  const incomingSortBy = String(route.query.sortBy || 'updatedAt').trim();
  const allowedSortBy = ['title', 'product', 'priority', 'assignee', 'updatedAt'];
  sortBy.value = allowedSortBy.includes(incomingSortBy) ? incomingSortBy : 'updatedAt';
  const incomingSortDir = String(route.query.sortDir || 'desc').trim().toLowerCase();
  sortDir.value = incomingSortDir === 'asc' ? 'asc' : 'desc';
  filtersOpen.value = Boolean(filters.from || filters.to || filters.productId);
}

async function replaceQueryFromState() {
  await router.replace({ path: '/tickets', query: currentListQuery.value });
}

async function loadTickets({ syncRoute = false, refreshTotals = false } = {}) {
  loading.value = true;
  try {
    if (syncRoute) await replaceQueryFromState();
    const payload = await ticketsService.list({
      q: query.value,
      from: filters.from,
      to: filters.to,
      productId: filters.productId,
      sortBy: sortBy.value,
      sortDir: sortDir.value,
      view: activeTab.value,
      page: page.value,
      limit: limit.value,
      includeTabCounts: refreshTotals,
    });
    rows.value = payload?.items || [];
    total.value = payload?.total || 0;
    if (payload?.tabCounts) {
      tabTotals.value = {
        all: Number(payload.tabCounts.all ?? 0),
        mine: Number(payload.tabCounts.mine ?? 0),
        unassigned: Number(payload.tabCounts.unassigned ?? 0),
        closed: Number(payload.tabCounts.closed ?? 0),
        backlog: Number(payload.tabCounts.backlog ?? 0),
      };
    }
    tabTotals.value = { ...tabTotals.value, [activeTab.value]: total.value };
  } catch (error) {
    ui.showToast(error.message || 'No se pudo cargar la lista.', true);
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  page.value = 1;
  loadTickets({ syncRoute: true, refreshTotals: true });
}

function clearFilters() {
  query.value = '';
  filters.from = '';
  filters.to = '';
  filters.productId = '';
  sortBy.value = 'updatedAt';
  sortDir.value = 'desc';
  activeTab.value = 'all';
  page.value = 1;
  filtersOpen.value = false;
  loadTickets({ syncRoute: true, refreshTotals: true });
}

function toggleSort(column) {
  if (sortBy.value !== column) {
    sortBy.value = column;
    sortDir.value = 'asc';
  } else {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  }
  page.value = 1;
  loadTickets({ syncRoute: true });
}

function sortIndicator(column) {
  if (sortBy.value !== column) return '↕';
  return sortDir.value === 'asc' ? '▲' : '▼';
}

function handleLimitChange() {
  page.value = 1;
  loadTickets({ syncRoute: true });
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));
const startIndex = computed(() => (total.value === 0 ? 0 : (page.value - 1) * limit.value + 1));
const endIndex = computed(() => Math.min(page.value * limit.value, total.value));
const paginationMeta = computed(() => `${startIndex.value}–${endIndex.value} de ${total.value}`);

function prevPage() {
  if (page.value <= 1) return;
  page.value -= 1;
  loadTickets({ syncRoute: true });
}

function nextPage() {
  if (page.value >= totalPages.value) return;
  page.value += 1;
  loadTickets({ syncRoute: true });
}

onMounted(async () => {
  hydrateFromRouteQuery();
  try {
    const bundle = await fetchCatalogBundle();
    products.value = bundle?.products || [];
  } catch {
    products.value = [];
  }
  await loadTickets({ syncRoute: true, refreshTotals: true });
});

watch(activeTab, () => {
  page.value = 1;
  loadTickets({ syncRoute: true });
});

watch(
  () => route.query.q,
  (newQ) => {
    const next = String(newQ || '').trim();
    if (next === query.value) return;
    query.value = next;
    page.value = 1;
    loadTickets({ syncRoute: false, refreshTotals: true });
  },
);
</script>
