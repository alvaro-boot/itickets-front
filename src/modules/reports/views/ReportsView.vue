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

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Creado</th>
            <th>Cerrado</th>
            <th>Resolución (min)</th>
            <th>Tiempo trabajado (min)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="(resolution.tickets || []).length === 0">
            <td colspan="5" class="meta">Sin tickets resueltos en rango</td>
          </tr>
          <tr v-for="ticket in resolution.tickets || []" :key="ticket.id || ticket.title">
            <td>{{ ticket.title }}</td>
            <td>{{ fmtDate(ticket.createdAt) }}</td>
            <td>{{ fmtDate(ticket.closedAt) }}</td>
            <td>{{ ticket.resolutionMinutes }}</td>
            <td>{{ ticket.loggedMinutes || 0 }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid-2">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Usuario</th><th>Email</th><th>Cantidad</th></tr>
          </thead>
          <tbody>
            <tr v-if="(byUser.byAssignee || []).length === 0">
              <td colspan="3" class="meta">Sin datos</td>
            </tr>
            <tr v-for="user in byUser.byAssignee || []" :key="`assignee-${user.email}-${user.count}`">
              <td>{{ user.fullName || '' }}</td>
              <td>{{ user.email || '' }}</td>
              <td>{{ user.count }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Usuario</th><th>Email</th><th>Cantidad</th></tr>
          </thead>
          <tbody>
            <tr v-if="(byUser.byCreator || []).length === 0">
              <td colspan="3" class="meta">Sin datos</td>
            </tr>
            <tr v-for="user in byUser.byCreator || []" :key="`creator-${user.email}-${user.count}`">
              <td>{{ user.fullName || '' }}</td>
              <td>{{ user.email || '' }}</td>
              <td>{{ user.count }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { reportsService } from '../services/reportsService';
import { useUi } from '../../../shared/composables/useUi';
import { fmtDate } from '../../../shared/utils/format';

const ui = useUi();
const now = new Date();

const filters = reactive({
  from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  to: now.toISOString().slice(0, 10),
});

const resolution = ref({});
const byUser = ref({});

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
