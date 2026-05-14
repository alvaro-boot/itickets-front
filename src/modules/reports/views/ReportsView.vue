<template>
  <section class="stack">
    <div class="page-header">
      <div class="page-title">
        <h2>Reportes operativos</h2>
        <p>Consulta rendimiento y carga con métricas, gráficos y tablas en un solo flujo.</p>
      </div>
    </div>

    <div class="panel search-panel">
      <form class="grid-2" @submit.prevent="loadReports">
        <div class="field-stack">
          <label for="from">Desde</label>
          <input id="from" v-model="filters.from" type="date" required />
        </div>
        <div class="field-stack">
          <label for="to">Hasta</label>
          <input id="to" v-model="filters.to" type="date" required />
        </div>
        <div class="field-stack">
          <label for="statusId">Estado</label>
          <select id="statusId" v-model="filters.statusId">
            <option value="">Todos</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">{{ status.name }}</option>
          </select>
        </div>
        <div class="field-stack">
          <label for="resolution">Condición</label>
          <select id="resolution" v-model="filters.resolution">
            <option value="all">Todos</option>
            <option value="resolved">Solucionados</option>
            <option value="unresolved">No solucionados</option>
            <option value="pending">Pendientes</option>
          </select>
        </div>
        <div style="grid-column: 1 / -1">
          <button class="btn btn-primary" type="submit" :disabled="isLoading">
            {{ isLoading ? 'Consultando...' : 'Consultar' }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="isLoading" class="panel">
      <div class="skeleton-stack">
        <div class="skeleton-line skeleton-line--lg skeleton-line--w40"></div>
        <div class="skeleton-line skeleton-line--w90"></div>
        <div class="skeleton-line skeleton-line--w75"></div>
      </div>
    </div>

    <div class="cards">
      <article class="card">
        <p class="kpi-label">Tickets resueltos</p>
        <p class="kpi-value">{{ distribution.summary?.resolved || 0 }}</p>
        <p class="kpi-sub">Casos cerrados durante el periodo</p>
      </article>
      <article class="card">
        <p class="kpi-label">Promedio de resolución</p>
        <p class="kpi-value">{{ avgHours.toFixed(2) }} h</p>
        <p class="kpi-sub">Aproximadamente {{ avgMinutes }} minutos registrados por ticket</p>
      </article>
      <article class="card">
        <p class="kpi-label">No solucionados</p>
        <p class="kpi-value">{{ distribution.summary?.unresolved || 0 }}</p>
        <p class="kpi-sub">Tickets activos sin cierre definitivo</p>
      </article>
      <article class="card">
        <p class="kpi-label">Pendientes</p>
        <p class="kpi-value">{{ distribution.summary?.pending || 0 }}</p>
        <p class="kpi-sub">Tickets en estados abiertos o pendientes</p>
      </article>
    </div>

    <div class="panel">
      <h3 style="margin: 0 0 0.6rem">Diagrama de cierre</h3>
      <div class="donut-wrap">
        <div class="donut" :style="{ '--pct': `${solvedPct}%` }"></div>
        <div>
          <p class="kpi-label">Tickets resueltos</p>
          <p class="kpi-value" style="font-size: 1.2rem">
            {{ distribution.summary?.resolved || 0 }} / {{ distribution.summary?.total || 0 }}
          </p>
          <p class="kpi-sub">{{ solvedPct }}% de cierre en el rango seleccionado</p>
        </div>
      </div>
    </div>

    <div class="panel">
      <h3 style="margin: 0 0 0.6rem">Diagrama de carga por asignado</h3>
      <div class="chart-bars">
        <div v-for="row in assigneeData" :key="row.label" class="chart-row">
          <div class="chart-label">{{ row.label }}</div>
          <div class="chart-track"><span :style="{ width: `${barPct(row.value, assigneeMax)}%` }"></span></div>
          <div class="chart-value">{{ row.value }}</div>
        </div>
        <p v-if="assigneeData.length === 0" class="meta">Sin datos suficientes para graficar.</p>
      </div>
    </div>

    <div class="panel">
      <h3 style="margin: 0 0 0.6rem">Diagrama de creación por usuario</h3>
      <div class="chart-bars">
        <div v-for="row in creatorData" :key="row.label" class="chart-row">
          <div class="chart-label">{{ row.label }}</div>
          <div class="chart-track"><span :style="{ width: `${barPct(row.value, creatorMax)}%` }"></span></div>
          <div class="chart-value">{{ row.value }}</div>
        </div>
        <p v-if="creatorData.length === 0" class="meta">Sin datos suficientes para graficar.</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3 style="margin: 0 0 0.6rem">Distribución por producto</h3>
        <DataTable
          :rows="productRows"
          :columns="dimensionColumns"
          row-key="rowKey"
          empty-text="Sin datos por producto"
          :initial-page-size="10"
        />
      </div>
      <div class="panel">
        <h3 style="margin: 0 0 0.6rem">Distribución por tipo</h3>
        <DataTable
          :rows="typeRows"
          :columns="dimensionColumns"
          row-key="rowKey"
          empty-text="Sin datos por tipo"
          :initial-page-size="10"
        />
      </div>
    </div>

    <div class="panel">
      <h3 style="margin: 0 0 0.6rem">Distribución por estado</h3>
      <DataTable
        :rows="statusRows"
        :columns="statusColumns"
        row-key="rowKey"
        empty-text="Sin datos por estado"
        :initial-page-size="10"
      />
    </div>

    <div class="panel">
      <h3 style="margin: 0 0 0.6rem">Horas por producto (tickets cerrados)</h3>
      <p class="meta" style="margin: 0 0 0.8rem">
        Cantidad de horas registradas por producto para tickets cerrados en el rango de fecha (enteras, sin decimales).
      </p>
      <div class="chart-bars">
        <div v-for="row in closedMinutesChart" :key="row.label" class="chart-row">
          <div class="chart-label">{{ row.label }}</div>
          <div class="chart-track"><span :style="{ width: `${barPct(row.value, closedHoursMax)}%` }"></span></div>
          <div class="chart-value">{{ row.value }} h</div>
        </div>
        <p v-if="closedMinutesChart.length === 0" class="meta">Sin datos para graficar.</p>
      </div>
      <p class="kpi-sub" style="margin-top: 0.7rem">
        Total horas (suma por producto): <strong>{{ totalClosedHours }} h</strong>
      </p>
      <div style="margin-top: 1rem">
        <DataTable
          :rows="closedProductMinutesRows"
          :columns="closedHoursColumns"
          row-key="rowKey"
          empty-text="Sin datos para el rango seleccionado"
          :initial-page-size="10"
        />
      </div>
    </div>

    <div class="panel">
      <h3 style="margin: 0 0 0.6rem">Detalle de resolución</h3>
      <DataTable
        :rows="resolutionTicketsRows"
        :columns="resolutionColumns"
        row-key="id"
        empty-text="Sin tickets resueltos en rango"
        :initial-page-size="10"
      />
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3 style="margin: 0 0 0.6rem">Carga por asignado</h3>
        <DataTable
          :rows="assigneeRows"
          :columns="usersColumns"
          row-key="rowKey"
          empty-text="Sin datos"
          :initial-page-size="10"
        />
      </div>

      <div class="panel">
        <h3 style="margin: 0 0 0.6rem">Creación por usuario</h3>
        <DataTable
          :rows="creatorRows"
          :columns="usersColumns"
          row-key="rowKey"
          empty-text="Sin datos"
          :initial-page-size="10"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { reportsService } from '../services/reportsService';
import { useUi } from '../../../shared/composables/useUi';
import { useCatalogs } from '../../../shared/composables/useCatalogs';
import { fmtDate } from '../../../shared/utils/format';
import DataTable from '../../../shared/components/DataTable.vue';

const ui = useUi();
const { fetchCatalogBundle } = useCatalogs();
const now = new Date();

const filters = reactive({
  from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  to: now.toISOString().slice(0, 10),
  statusId: '',
  resolution: 'all',
});

const resolution = ref({});
const byUser = ref({});
const distribution = ref({ summary: { total: 0, resolved: 0, unresolved: 0, pending: 0 } });
const isLoading = ref(false);
const statuses = ref([]);
const resolutionColumns = [
  { key: 'title', label: 'Ticket' },
  { key: 'createdAtFmt', label: 'Creado' },
  { key: 'closedAtFmt', label: 'Fecha de solución' },
  { key: 'resolutionMinutes', label: 'Tiempo registrado (min)' },
];
const usersColumns = [
  { key: 'fullName', label: 'Usuario' },
  { key: 'email', label: 'Email' },
  { key: 'count', label: 'Cantidad' },
];
const dimensionColumns = [
  { key: 'name', label: 'Dimensión' },
  { key: 'count', label: 'Total' },
  { key: 'resolved', label: 'Solucionados' },
  { key: 'pending', label: 'Pendientes' },
];
const statusColumns = [
  { key: 'name', label: 'Estado' },
  { key: 'count', label: 'Cantidad' },
];
const closedHoursColumns = [
  { key: 'name', label: 'Producto' },
  { key: 'tickets', label: 'Tickets cerrados' },
  { key: 'hours', label: 'Horas registradas' },
];

const assigneeData = computed(() =>
  (byUser.value.byAssignee || []).map((user) => ({
    label: user.fullName || user.email || 'Sin nombre',
    value: Number(user.count) || 0,
  })),
);

const creatorData = computed(() =>
  (byUser.value.byCreator || []).map((user) => ({
    label: user.fullName || user.email || 'Sin nombre',
    value: Number(user.count) || 0,
  })),
);

const assigneeMax = computed(() => assigneeData.value.reduce((max, item) => Math.max(max, item.value), 1));
const creatorMax = computed(() => creatorData.value.reduce((max, item) => Math.max(max, item.value), 1));
const avgHours = computed(() => Number(resolution.value.avgResolutionHours) || 0);
const avgMinutes = computed(() => Math.round(avgHours.value * 60));
const totalCreatedByUsers = computed(() => distribution.value.summary?.total || creatorData.value.reduce((sum, item) => sum + item.value, 0));
const solvedPct = computed(() =>
  totalCreatedByUsers.value
    ? Math.round(((Number(distribution.value.summary?.resolved) || 0) / totalCreatedByUsers.value) * 100)
    : 0,
);

const resolutionTicketsRows = computed(() =>
  (resolution.value.tickets || []).map((ticket) => ({
    ...ticket,
    id: ticket.id || `${ticket.title}-${ticket.createdAt}`,
    createdAtFmt: fmtDate(ticket.createdAt),
    closedAtFmt: fmtDate(ticket.closedAt),
    loggedMinutes: ticket.loggedMinutes || 0,
  })),
);

const assigneeRows = computed(() =>
  (byUser.value.byAssignee || []).map((user) => ({
    ...user,
    fullName: user.fullName || '',
    email: user.email || '',
    count: user.count,
    rowKey: `assignee-${user.email || user.fullName || 'na'}-${user.count}`,
  })),
);

const creatorRows = computed(() =>
  (byUser.value.byCreator || []).map((user) => ({
    ...user,
    fullName: user.fullName || '',
    email: user.email || '',
    count: user.count,
    rowKey: `creator-${user.email || user.fullName || 'na'}-${user.count}`,
  })),
);

const productRows = computed(() =>
  (distribution.value.byProduct || []).map((row) => ({
    ...row,
    rowKey: `product-${row.name}`,
    count: Number(row.count || 0),
    resolved: Number(row.resolved || 0),
    pending: Number(row.pending || 0),
  })),
);

const typeRows = computed(() =>
  (distribution.value.byType || []).map((row) => ({
    ...row,
    rowKey: `type-${row.name}`,
    count: Number(row.count || 0),
    resolved: Number(row.resolved || 0),
    pending: Number(row.pending || 0),
  })),
);

const statusRows = computed(() =>
  (distribution.value.byStatus || []).map((row) => ({
    ...row,
    rowKey: `status-${row.name}`,
    count: Number(row.count || 0),
  })),
);

const closedProductMinutesRows = computed(() =>
  (distribution.value.closedProductMinutes || []).map((row) => ({
    ...row,
    rowKey: `closed-minutes-${row.name}`,
    hours: Math.round(Number(row.minutes || 0) / 60),
    tickets: Number(row.tickets || 0),
  })),
);
const closedHoursMax = computed(() =>
  closedProductMinutesRows.value.reduce((max, row) => Math.max(max, Number(row.hours || 0)), 1),
);
const closedMinutesChart = computed(() =>
  closedProductMinutesRows.value.slice(0, 10).map((row) => ({
    label: row.name,
    value: Number(row.hours || 0),
  })),
);
const totalClosedHours = computed(() =>
  closedProductMinutesRows.value.reduce((sum, row) => sum + Number(row.hours || 0), 0),
);

function barPct(value, max) {
  if (!max) return 5;
  return Math.max(5, Math.round((value / max) * 100));
}

async function loadReports() {
  isLoading.value = true;
  try {
    const payloadFilters = {
      statusId: filters.statusId || undefined,
      resolution: filters.resolution || 'all',
    };
    const fromIso = `${filters.from}T00:00:00`;
    const toIso = `${filters.to}T23:59:59`;
    const [resolutionResult, byUserResult, distributionResult] = await Promise.all([
      reportsService.resolution(fromIso, toIso, payloadFilters),
      reportsService.ticketsByUser(fromIso, toIso, payloadFilters),
      reportsService.distribution(fromIso, toIso, payloadFilters),
    ]);
    resolution.value = resolutionResult || {};
    byUser.value = byUserResult || {};
    distribution.value = distributionResult || { summary: { total: 0, resolved: 0, unresolved: 0, pending: 0 } };
  } catch (error) {
    ui.showToast(error.message || 'No se pudieron generar informes.', true);
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  try {
    const bundle = await fetchCatalogBundle();
    statuses.value = bundle?.statuses || [];
  } catch {
    statuses.value = [];
  }
  await loadReports();
});
</script>
