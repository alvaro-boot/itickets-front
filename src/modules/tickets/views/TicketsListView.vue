<template>
  <section class="stack">
    <div class="page-header">
      <div class="page-title">
        <h2>Centro de tickets</h2>
        <p>Supervisa el flujo operativo, asigna prioridades y detecta carga sin salir del panel.</p>
      </div>
      <RouterLink class="btn btn-primary" to="/tickets/new">Nuevo ticket</RouterLink>
    </div>

    <div class="surface-grid surface-grid--3">
      <article class="spotlight-card">
        <p class="spotlight-card__eyebrow">Monitoreo activo</p>
        <h3 class="spotlight-card__title">Gestiona la operación con foco en asignación, prioridad y cierre.</h3>
        <p class="spotlight-card__copy">
          Usa este tablero para identificar trabajo pendiente, tickets críticos y distribución de carga del equipo.
        </p>
        <div class="spotlight-card__meta">
          <span class="spotlight-pill">Actualización en tiempo real</span>
          <span class="spotlight-pill">Vista por estado</span>
        </div>
      </article>

      <article class="stat-card">
        <p class="stat-card__label">Total visibles</p>
        <p class="stat-card__value">{{ total }}</p>
        <p class="stat-card__hint">Tickets cargados según el filtro de búsqueda actual</p>
      </article>

      <article class="stat-card">
        <p class="stat-card__label">Mis asignados</p>
        <p class="stat-card__value">{{ filteredByTab('mine').length }}</p>
        <p class="stat-card__hint">Casos asignados directamente a tu usuario</p>
      </article>
    </div>

    <div class="stats-grid">
      <article class="stat-card">
        <p class="stat-card__label">No asignados</p>
        <p class="stat-card__value">{{ filteredByTab('unassigned').length }}</p>
        <p class="stat-card__hint">Oportunidades rápidas para distribuir mejor el trabajo</p>
      </article>
      <article class="stat-card">
        <p class="stat-card__label">Cerrados</p>
        <p class="stat-card__value">{{ filteredByTab('closed').length }}</p>
        <p class="stat-card__hint">Tickets ya resueltos dentro del conjunto visible</p>
      </article>
      <article class="stat-card">
        <p class="stat-card__label">Búsqueda actual</p>
        <p class="stat-card__value">{{ query ? 'Activa' : 'General' }}</p>
        <p class="stat-card__hint">Filtra por título o descripción para reducir el ruido</p>
      </article>
      <article class="stat-card">
        <p class="stat-card__label">Vista seleccionada</p>
        <p class="stat-card__value">{{ activeTabLabel }}</p>
        <p class="stat-card__hint">Tab operativo que estás usando para revisar la cola</p>
      </article>
    </div>

    <div class="panel search-panel" role="region" aria-label="Filtros de tickets">
      <div class="panel-header">
        <div class="page-title">
          <h2 style="font-size: 1.05rem">Exploración y filtros</h2>
          <p>Búsqueda de texto, rango de fechas y paginación tipo dataTable.</p>
        </div>
      </div>

      <form class="search-panel__row" @submit.prevent="applyFilters">
        <div class="field-stack search-panel__input">
          <label for="ticket-search">Buscar ticket</label>
          <input
            id="ticket-search"
            v-model.trim="query"
            placeholder="Buscar por título o descripción"
            @keyup.enter="applyFilters"
          />
        </div>

        <div class="field-stack" style="min-width: 190px">
          <label for="from">Desde</label>
          <input id="from" type="date" v-model="filters.from" />
        </div>

        <div class="field-stack" style="min-width: 190px">
          <label for="to">Hasta</label>
          <input id="to" type="date" v-model="filters.to" />
        </div>

        <div class="field-stack" style="min-width: 220px">
          <label for="statusId">Estado</label>
          <select id="statusId" v-model="filters.statusId">
            <option value="">Todos</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">
              {{ status.name }}
            </option>
          </select>
        </div>

        <div class="actions-row" style="justify-content: flex-end; margin-left: auto; min-width: 220px">
          <button class="btn btn-primary" type="submit">Consultar</button>
          <button class="btn btn-ghost" type="button" @click="clearFilters">Limpiar</button>
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
        {{ tab.label }} <span class="badge">{{ filteredByTab(tab.key).length }}</span>
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
                  <RouterLink :to="`/tickets/${ticket.id}`">{{ ticket.title }}</RouterLink>
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
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { ticketsService } from '../services/ticketsService';
import { useCatalogs } from '../../../shared/composables/useCatalogs';
import { useAuth } from '../../../shared/composables/useAuth';
import { useUi } from '../../../shared/composables/useUi';
import { fmtDate, priorityClass } from '../../../shared/utils/format';

const auth = useAuth();
const ui = useUi();
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

const tabs = [
  { key: 'all', label: 'Tickets en general' },
  { key: 'mine', label: 'Mis asignados' },
  { key: 'unassigned', label: 'No asignados' },
  { key: 'closed', label: 'Cerrados' },
];

function isClosedTicket(ticket) {
  const statusName = String(ticket.status?.name || '').toLowerCase();
  const statusCode = String(ticket.status?.code || '').toLowerCase();
  return Boolean(ticket.closedAt) || statusName.includes('cerrad') || statusCode.includes('closed');
}

function filteredByTab(tab) {
  const meId = auth.state.profile?.id ? String(auth.state.profile.id) : null;
  if (tab === 'mine') {
    return rows.value.filter((ticket) => String(ticket.assigneeId || '') === meId && !isClosedTicket(ticket));
  }
  if (tab === 'unassigned') {
    return rows.value.filter(
      (ticket) => (ticket.assigneeId == null || String(ticket.assigneeId) === '') && !isClosedTicket(ticket),
    );
  }
  if (tab === 'closed') return rows.value.filter(isClosedTicket);
  return rows.value.filter((ticket) => !isClosedTicket(ticket));
}

const visibleRows = computed(() => filteredByTab(activeTab.value));
const activeTabLabel = computed(() => tabs.find((tab) => tab.key === activeTab.value)?.label || 'General');

async function loadTickets() {
  loading.value = true;
  try {
    const payload = await ticketsService.list({
      q: query.value,
      from: filters.from,
      to: filters.to,
      statusId: filters.statusId,
      page: page.value,
      limit: limit.value,
    });
    rows.value = payload?.items || [];
    total.value = payload?.total || 0;
  } catch (error) {
    ui.showToast(error.message || 'No se pudo cargar la lista.', true);
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  page.value = 1;
  loadTickets();
}

function clearFilters() {
  query.value = '';
  filters.from = '';
  filters.to = '';
  filters.statusId = '';
  page.value = 1;
  loadTickets();
}

function handleLimitChange() {
  page.value = 1;
  loadTickets();
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
  loadTickets();
}

function prevPage() {
  if (page.value <= 1) return;
  page.value -= 1;
  loadTickets();
}

function nextPage() {
  if (page.value >= totalPages.value) return;
  page.value += 1;
  loadTickets();
}

onMounted(async () => {
  try {
    const bundle = await fetchCatalogBundle();
    statuses.value = bundle?.statuses || [];
  } catch {
    statuses.value = [];
  }
  await loadTickets();
});
</script>
