<template>
  <section class="stack">
    <div class="page-header">
      <div class="page-title">
        <h2>Centro de tickets</h2>
        <p>{{ paginationMeta }}</p>
      </div>
      <RouterLink class="btn btn-primary" :to="{ path: '/tickets/new', query: currentListQuery }">Nuevo ticket</RouterLink>
    </div>

    <div class="panel search-panel" role="region" aria-label="Filtros de tickets">
      <div class="panel-header">
        <div class="page-title">
          <h2 style="font-size: 1.05rem">Exploración y filtros</h2>
          <p>Búsqueda de texto, rango de fechas y paginación tipo dataTable.</p>
        </div>
      </div>

      <form class="search-panel__row" @submit.prevent="applyFilters">
        <div class="field-stack search-panel__field search-panel__field--query">
          <label for="ticket-search">Buscar ticket</label>
          <input
            id="ticket-search"
            v-model.trim="query"
            placeholder="Buscar por título o descripción"
            @keyup.enter="applyFilters"
          />
        </div>

        <div class="field-stack search-panel__field">
          <label for="from">Desde</label>
          <input id="from" type="date" v-model="filters.from" />
        </div>

        <div class="field-stack search-panel__field">
          <label for="to">Hasta</label>
          <input id="to" type="date" v-model="filters.to" />
        </div>

        <div class="field-stack search-panel__field">
          <label for="statusId">Estado</label>
          <select id="statusId" v-model="filters.statusId">
            <option value="">Todos</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">
              {{ status.name }}
            </option>
          </select>
        </div>

        <div class="actions-row search-panel__actions">
          <button class="btn btn-primary search-panel__btn" type="submit">Consultar</button>
          <button class="btn btn-ghost search-panel__btn" type="button" @click="clearFilters">Limpiar</button>
        </div>
      </form>
    </div>

    <div class="ticket-tabs" role="tablist" aria-label="Vistas de tickets">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="ticket-tab"
        :class="{ active: activeTab === tab.key }"
        type="button"
        @click="activeTab = tab.key"
      >
        {{ tab.label }} <span class="badge">{{ tabTotals[tab.key] || 0 }}</span>
      </button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Asignado a</th>
            <th>Actualizado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5">
              <div class="skeleton-stack">
                <div class="skeleton-line skeleton-line--lg skeleton-line--w75"></div>
                <div class="skeleton-line skeleton-line--w90"></div>
                <div class="skeleton-line skeleton-line--w60"></div>
              </div>
            </td>
          </tr>
          <tr v-else-if="visibleRows.length === 0">
            <td colspan="5">
              <div class="empty-state">No hay tickets para esta vista.</div>
            </td>
          </tr>
          <tr v-for="ticket in visibleRows" :key="ticket.id">
            <td>
              <div class="table-title-cell">
                <strong>
                  <RouterLink :to="{ path: `/tickets/${ticket.id}`, query: currentListQuery }">{{ ticket.title }}</RouterLink>
                </strong>
                <span>#{{ ticket.id }}</span>
              </div>
            </td>
            <td>
              <span class="status-pill">
                <span class="status-dot"></span>
                {{ ticket.status?.name || '' }}
              </span>
            </td>
            <td><span :class="priorityClass(ticket.priority?.level)">{{ ticket.priority?.name || '' }}</span></td>
            <td>{{ ticket.assignee?.fullName || ticket.assignee?.email || 'Sin asignar' }}</td>
            <td class="meta">{{ fmtDate(ticket.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-footer" aria-label="Paginación de tickets">
      <div class="table-footer__meta">{{ paginationMeta }}</div>
      <div class="table-footer__controls">
        <div class="actions-row" style="gap: 0.6rem">
          <label class="meta" style="display:flex;gap:0.6rem;align-items:center;margin:0">
            Mostrar
            <select v-model.number="limit" @change="handleLimitChange" style="width: 92px">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
            </select>
          </label>
        </div>

        <button class="btn btn-ghost pagination-btn" type="button" :disabled="page === 1" @click="prevPage">
          Anterior
        </button>

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

        <button
          class="btn btn-ghost pagination-btn"
          type="button"
          :disabled="page >= totalPages"
          @click="nextPage"
        >
          Siguiente
        </button>
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
import { fmtDate, priorityClass } from '../../../shared/utils/format';

const ui = useUi();
const route = useRoute();
const router = useRouter();
const { fetchCatalogBundle } = useCatalogs();

const loading = ref(false);
const query = ref('');
const filters = reactive({
  from: '',
  to: '',
  statusId: '',
});
const rows = ref([]);
const statuses = ref([]);
const activeTab = ref('all');
const page = ref(1);
const limit = ref(50);
const total = ref(0);
const tabTotals = ref({
  all: 0,
  mine: 0,
  unassigned: 0,
  closed: 0,
});

const tabs = [
  { key: 'all', label: 'Tickets en general' },
  { key: 'mine', label: 'Mis asignados' },
  { key: 'unassigned', label: 'No asignados' },
  { key: 'closed', label: 'Cerrados' },
];

const visibleRows = computed(() => rows.value);
const currentListQuery = computed(() => ({
  q: query.value || undefined,
  from: filters.from || undefined,
  to: filters.to || undefined,
  statusId: filters.statusId || undefined,
  view: activeTab.value !== 'all' ? activeTab.value : undefined,
  page: page.value > 1 ? String(page.value) : undefined,
  limit: limit.value !== 50 ? String(limit.value) : undefined,
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
  filters.statusId = String(route.query.statusId || '').trim();
  const incomingView = String(route.query.view || 'all').trim();
  activeTab.value = tabs.some((tab) => tab.key === incomingView) ? incomingView : 'all';
  page.value = parsePositiveInt(route.query.page, 1);
  const incomingLimit = parsePositiveInt(route.query.limit, 50);
  limit.value = [10, 25, 50].includes(incomingLimit) ? incomingLimit : 50;
}

async function replaceQueryFromState() {
  await router.replace({
    path: '/tickets',
    query: currentListQuery.value,
  });
}

async function loadTabTotals() {
  try {
    const [allRes, mineRes, unassignedRes, closedRes] = await Promise.all([
      ticketsService.list({
        q: query.value,
        from: filters.from,
        to: filters.to,
        statusId: filters.statusId,
        view: 'all',
        page: 1,
        limit: 1,
      }),
      ticketsService.list({
        q: query.value,
        from: filters.from,
        to: filters.to,
        statusId: filters.statusId,
        view: 'mine',
        page: 1,
        limit: 1,
      }),
      ticketsService.list({
        q: query.value,
        from: filters.from,
        to: filters.to,
        statusId: filters.statusId,
        view: 'unassigned',
        page: 1,
        limit: 1,
      }),
      ticketsService.list({
        q: query.value,
        from: filters.from,
        to: filters.to,
        statusId: filters.statusId,
        view: 'closed',
        page: 1,
        limit: 1,
      }),
    ]);
    tabTotals.value = {
      all: Number(allRes?.total || 0),
      mine: Number(mineRes?.total || 0),
      unassigned: Number(unassignedRes?.total || 0),
      closed: Number(closedRes?.total || 0),
    };
  } catch {
    tabTotals.value = { all: 0, mine: 0, unassigned: 0, closed: 0 };
  }
}

async function loadTickets({ syncRoute = false, refreshTotals = false } = {}) {
  loading.value = true;
  try {
    if (syncRoute) {
      await replaceQueryFromState();
    }
    const payload = await ticketsService.list({
      q: query.value,
      from: filters.from,
      to: filters.to,
      statusId: filters.statusId,
      view: activeTab.value,
      page: page.value,
      limit: limit.value,
    });
    rows.value = payload?.items || [];
    total.value = payload?.total || 0;
    if (refreshTotals) {
      await loadTabTotals();
    }
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
  filters.statusId = '';
  activeTab.value = 'all';
  page.value = 1;
  loadTickets({ syncRoute: true, refreshTotals: true });
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
    statuses.value = bundle?.statuses || [];
  } catch {
    statuses.value = [];
  }
  await loadTickets({ syncRoute: true, refreshTotals: true });
});

watch(activeTab, () => {
  page.value = 1;
  loadTickets({ syncRoute: true });
});
</script>
