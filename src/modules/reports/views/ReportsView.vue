<template>
  <section class="stack">
    <div class="panel">
      <form class="grid-2" @submit.prevent="loadReports">
        <div class="field-stack">
          <label for="from">Desde</label>
          <input id="from" v-model="filters.from" type="date" required />
        </div>
        <div class="field-stack">
          <label for="to">Hasta</label>
          <input id="to" v-model="filters.to" type="date" required />
        </div>
        <div style="grid-column: 1 / -1">
          <button class="btn btn-primary" type="submit">Consultar</button>
        </div>
      </form>
    </div>

    <div class="cards">
      <article class="card">
        <p class="kpi-label">Tickets resueltos</p>
        <p class="kpi-value">{{ resolution.totalResolved || 0 }}</p>
        <p class="kpi-sub">Casos cerrados durante el periodo</p>
      </article>
      <article class="card">
        <p class="kpi-label">Promedio de resolución</p>
        <p class="kpi-value">{{ avgHours.toFixed(2) }} h</p>
        <p class="kpi-sub">Aproximadamente {{ avgMinutes }} minutos por ticket</p>
      </article>
      <article class="card">
        <p class="kpi-label">Creación en el periodo</p>
        <p class="kpi-value">{{ totalCreatedByUsers }}</p>
        <p class="kpi-sub">Total de tickets contabilizados por creador</p>
      </article>
      <article class="card">
        <p class="kpi-label">Tiempo trabajado</p>
        <p class="kpi-value">{{ resolution.totalLoggedHours || 0 }} h</p>
        <p class="kpi-sub">{{ resolution.totalLoggedMinutes || 0 }} minutos registrados</p>
      </article>
    </div>

    <div class="panel">
      <h3 style="margin: 0 0 0.6rem">Diagrama de cierre</h3>
      <div class="donut-wrap">
        <div class="donut" :style="{ '--pct': `${solvedPct}%` }"></div>
        <div>
          <p class="kpi-label">Tickets resueltos</p>
          <p class="kpi-value" style="font-size: 1.2rem">{{ resolution.totalResolved || 0 }} / {{ totalCreatedByUsers }}</p>
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

    <DataTable
      :rows="resolutionTicketsRows"
      :columns="resolutionColumns"
      row-key="id"
      empty-text="Sin tickets resueltos en rango"
      :initial-page-size="10"
    />

    <div class="grid-2">
      <DataTable
        :rows="assigneeRows"
        :columns="usersColumns"
        row-key="rowKey"
        empty-text="Sin datos"
        :initial-page-size="10"
      />

      <DataTable
        :rows="creatorRows"
        :columns="usersColumns"
        row-key="rowKey"
        empty-text="Sin datos"
        :initial-page-size="10"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { reportsService } from '../services/reportsService';
import { useUi } from '../../../shared/composables/useUi';
import { fmtDate } from '../../../shared/utils/format';
import DataTable from '../../../shared/components/DataTable.vue';

const ui = useUi();
const now = new Date();

const filters = reactive({
  from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  to: now.toISOString().slice(0, 10),
});

const resolution = ref({});
const byUser = ref({});
const resolutionColumns = [
  { key: 'title', label: 'Ticket' },
  { key: 'createdAtFmt', label: 'Creado' },
  { key: 'closedAtFmt', label: 'Cerrado' },
  { key: 'resolutionMinutes', label: 'Resolución (min)' },
  { key: 'loggedMinutes', label: 'Tiempo trabajado (min)' },
];
const usersColumns = [
  { key: 'fullName', label: 'Usuario' },
  { key: 'email', label: 'Email' },
  { key: 'count', label: 'Cantidad' },
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
const totalCreatedByUsers = computed(() => creatorData.value.reduce((sum, item) => sum + item.value, 0));
const solvedPct = computed(() =>
  totalCreatedByUsers.value ? Math.round(((Number(resolution.value.totalResolved) || 0) / totalCreatedByUsers.value) * 100) : 0,
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

function barPct(value, max) {
  if (!max) return 5;
  return Math.max(5, Math.round((value / max) * 100));
}

async function loadReports() {
  try {
    const fromIso = `${filters.from}T00:00:00`;
    const toIso = `${filters.to}T23:59:59`;
    const [resolutionResult, byUserResult] = await Promise.all([
      reportsService.resolution(fromIso, toIso),
      reportsService.ticketsByUser(fromIso, toIso),
    ]);
    resolution.value = resolutionResult || {};
    byUser.value = byUserResult || {};
  } catch (error) {
    ui.showToast(error.message || 'No se pudieron generar informes.', true);
  }
}

onMounted(loadReports);
</script>
