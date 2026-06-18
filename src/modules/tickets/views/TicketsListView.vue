<template>
  <section class="jira-page stack stack--compact">
    <header class="jira-page-header">
      <h1>Todos los tickets</h1>
      <p class="jira-page-header__sub">
        Total {{ tabTotals.all || 0 }} · Míos {{ tabTotals.mine || 0 }} · Sin asignar {{ tabTotals.unassigned || 0 }}
      </p>
    </header>

    <form class="jira-filters" @submit.prevent="applyFilters">
      <div class="field-stack search-panel__field search-panel__field--query">
        <label for="ticket-search">Buscar</label>
        <input
          id="ticket-search"
          v-model.trim="query"
          placeholder="Título o COOT-123"
          @keyup.enter="applyFilters"
        />
      </div>
      <div class="field-stack">
        <label for="from">Desde</label>
        <input id="from" type="date" v-model="filters.from" />
      </div>
      <div class="field-stack">
        <label for="to">Hasta</label>
        <input id="to" type="date" v-model="filters.to" />
      </div>
      <div class="field-stack">
        <label for="productId">Producto</label>
        <select id="productId" v-model="filters.productId">
          <option value="">Todos</option>
          <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
        </select>
      </div>
      <div class="actions-row">
        <button class="btn btn-primary btn--sm" type="submit">Buscar</button>
        <button class="btn btn-ghost btn--sm" type="button" @click="clearFilters">Limpiar</button>
      </div>
    </form>

    <div class="jira-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="jira-tab"
        :class="{ active: activeTab === tab.key }"
        type="button"
        @click="activeTab = tab.key"
      >
        {{ tab.label }} <span class="badge">{{ tabTotals[tab.key] || 0 }}</span>
      </button>
    </div>

    <div class="table-wrap table-wrap--jira">
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
            <th>Estado</th>
            <th>
              <button type="button" class="datatable__sort-btn" :class="{ 'datatable__sort-btn--active': sortBy === 'priority' }" @click="toggleSort('priority')">
                <span>Prioridad</span>
                <span class="datatable__sort-indicator">{{ sortIndicator('priority') }}</span>
              </button>
            </th>
            <th>
              <button type="button" class="datatable__sort-btn" :class="{ 'datatable__sort-btn--active': sortBy === 'assignee' }" @click="toggleSort('assignee')">
                <span>Asignado</span>
                <span class="datatable__sort-indicator">{{ sortIndicator('assignee') }}</span>
              </button>
            </th>
            <th>
              <button type="button" class="datatable__sort-btn" :class="{ 'datatable__sort-btn--active': sortBy === 'updatedAt' }" @click="toggleSort('updatedAt')">
                <span>Actualizado</span>
                <span class="datatable__sort-indicator">{{ sortIndicator('updatedAt') }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6">
              <div class="skeleton-stack skeleton-rows">
                <div v-for="n in 6" :key="n" class="skeleton-line skeleton-line--lg skeleton-line--w90"></div>
              </div>
            </td>
          </tr>
          <tr v-else-if="visibleRows.length === 0">
            <td colspan="6"><div class="empty-state">No hay tickets para esta vista.</div></td>
          </tr>
          <tr v-for="ticket in visibleRows" :key="ticket.id">
            <td>
              <IssueKeyLink :ticket="ticket" :to="{ path: `/tickets/${ticket.id}`, query: currentListQuery }" />
            </td>
            <td>
              <RouterLink class="table-summary-link" :to="{ path: `/tickets/${ticket.id}`, query: currentListQuery }">
                {{ ticket.title }}
              </RouterLink>
            </td>
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
            <td>
              <span v-if="ticket.assignee" style="display:inline-flex;align-items:center;gap:0.35rem">
                <UserAvatar :name="ticket.assignee.fullName" :email="ticket.assignee.email" />
                {{ ticket.assignee.fullName || ticket.assignee.email }}
              </span>
              <span v-else class="meta">Sin asignar</span>
            </td>
            <td class="meta">{{ fmtDate(ticket.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-footer" aria-label="Paginación de tickets">
      <div class="table-footer__meta">{{ paginationMeta }}</div>
      <div class="table-footer__controls">
        <label class="meta" style="display:flex;gap:0.6rem;align-items:center;margin:0">
          Mostrar
          <select v-model.number="limit" @change="handleLimitChange" style="width: 92px">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </label>
        <button class="btn btn-ghost pagination-btn" type="button" :disabled="page === 1" @click="prevPage">Anterior</button>
        <div class="pagination-pages">
          <button
            v-for="p in pageButtons"
            :key="p"
            type="button"
            class="btn btn-ghost pagination-page-btn"
            :class="{ 'pagination-page-btn--active': p === page }"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
        </div>
        <button class="btn btn-ghost pagination-btn" type="button" :disabled="page >= totalPages" @click="nextPage">Siguiente</button>
      </div>
    </div>
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
const tabTotals = ref({ all: 0, mine: 0, unassigned: 0, closed: 0 });

const tabs = [
  { key: 'all', label: 'Todos' },
  { key: 'mine', label: 'Mis asignados' },
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
const paginationMeta = computed(() => `Mostrando ${startIndex.value}-${endIndex.value} de ${total.value} tickets`);

const pageButtons = computed(() => {
  const pages = totalPages.value;
  const cur = page.value;
  const start = Math.max(1, cur - 2);
  const end = Math.min(pages, cur + 2);
  const arr = [];
  for (let i = start; i <= end; i += 1) arr.push(i);
  return arr;
});

function goToPage(p) {
  page.value = p;
  loadTickets({ syncRoute: true });
}

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
</script>
