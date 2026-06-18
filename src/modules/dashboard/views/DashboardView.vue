<template>
  <section class="page page--dashboard">
    <header class="page__header page__header--row">
      <div>
        <h1 class="page__title">Dashboard Scrum</h1>
        <p class="page__subtitle">{{ monthLabel }} · Métricas del equipo</p>
      </div>
      <div class="month-picker">
        <button type="button" class="btn btn-ghost btn--sm" @click="shiftMonth(-1)">←</button>
        <input v-model="monthInput" type="month" class="month-picker__input" @change="load" />
        <button type="button" class="btn btn-ghost btn--sm" @click="shiftMonth(1)">→</button>
      </div>
    </header>

    <div v-if="loading" class="page__loading"><p class="meta">Cargando dashboard...</p></div>

    <template v-else-if="data">
      <div class="kpi-grid">
        <NexusMetricCard label="Creados" :value="data.summary.created" />
        <NexusMetricCard label="Completados" :value="data.summary.completed" trend="up" />
        <NexusMetricCard label="Puntos completados" :value="data.summary.completedStoryPoints" />
        <NexusMetricCard label="Backlog" :value="data.summary.backlog" />
        <NexusMetricCard label="En progreso" :value="data.summary.inProgress" />
        <NexusMetricCard
          label="Velocity prom."
          :value="data.velocity?.averageVelocity || 0"
          :delta="velocityRows.length ? `${velocityRows.length} sprints` : ''"
        />
      </div>

      <div class="dashboard-grid">
        <article class="dash-panel">
          <h2 class="dash-panel__title">Throughput diario</h2>
          <p class="dash-panel__hint">Tickets creados vs completados por día</p>
          <div class="chart-bars chart-bars--daily">
            <div v-for="row in dailyRows" :key="row.date" class="chart-row chart-row--daily">
              <div class="chart-label">{{ row.day }}</div>
              <div class="chart-dual">
                <span class="chart-bar chart-bar--created" :style="{ width: barPct(row.created, dailyMax) }" :title="`Creados: ${row.created}`"></span>
                <span class="chart-bar chart-bar--done" :style="{ width: barPct(row.completed, dailyMax) }" :title="`Completados: ${row.completed}`"></span>
              </div>
            </div>
          </div>
          <div class="chart-legend">
            <span><i class="legend-dot legend-dot--created"></i> Creados</span>
            <span><i class="legend-dot legend-dot--done"></i> Completados</span>
          </div>
        </article>

        <article class="dash-panel">
          <h2 class="dash-panel__title">Velocity (sprints cerrados)</h2>
          <p class="dash-panel__hint">Story points completados por sprint</p>
          <div class="chart-bars">
            <div v-for="row in velocityRows" :key="row.sprintId" class="chart-row">
              <div class="chart-label">{{ row.name }}</div>
              <div class="chart-track"><span :style="{ width: `${barPct(row.completedPoints, velocityMax)}%` }"></span></div>
              <div class="chart-value">{{ row.completedPoints }}<span class="meta"> / {{ row.committedPoints }}</span></div>
            </div>
            <p v-if="velocityRows.length === 0" class="meta">Sin sprints cerrados aún.</p>
          </div>
        </article>

        <article v-if="data.activeSprint" class="dash-panel dash-panel--wide">
          <div class="dash-panel__head">
            <div>
              <h2 class="dash-panel__title">Sprint activo: {{ data.activeSprint.name }}</h2>
              <p class="dash-panel__hint">
                {{ data.activeSprint.startDate }} → {{ data.activeSprint.endDate }}
                · {{ data.activeSprint.completedPoints }}/{{ data.activeSprint.committedPoints }} pts
              </p>
            </div>
            <RouterLink to="/tickets" class="btn btn-ghost btn--sm">Ver board</RouterLink>
          </div>
          <div class="burndown-chart">
            <div v-for="point in burndownRows" :key="point.date" class="burndown-col">
              <div class="burndown-bars">
                <div
                  class="burndown-bar burndown-bar--actual"
                  :style="{ height: burndownHeight(point.remaining) }"
                  :title="`Restante: ${point.remaining}`"
                ></div>
              </div>
              <span class="burndown-day">{{ point.date.slice(8) }}</span>
            </div>
          </div>
        </article>

        <article class="dash-panel">
          <h2 class="dash-panel__title">Por estado</h2>
          <div class="chart-bars">
            <div v-for="row in statusRows" :key="row.name" class="chart-row">
              <div class="chart-label">{{ row.name }}</div>
              <div class="chart-track"><span :style="{ width: `${barPct(row.count, statusMax)}%` }"></span></div>
              <div class="chart-value">{{ row.count }}<span v-if="row.storyPoints" class="meta"> · {{ row.storyPoints }}p</span></div>
            </div>
          </div>
        </article>
      </div>

      <article class="dash-panel sprint-admin">
        <div class="dash-panel__head">
          <h2 class="dash-panel__title">Gestión de sprints</h2>
          <button type="button" class="btn btn-primary btn--sm" @click="showSprintForm = !showSprintForm">
            {{ showSprintForm ? 'Cancelar' : 'Nuevo sprint' }}
          </button>
        </div>

        <form v-if="showSprintForm" class="sprint-form" @submit.prevent="createSprint">
          <div class="field-stack">
            <label for="sprint-name">Nombre</label>
            <input id="sprint-name" v-model.trim="sprintForm.name" required placeholder="Sprint 12" />
          </div>
          <div class="field-stack">
            <label for="sprint-goal">Objetivo</label>
            <input id="sprint-goal" v-model.trim="sprintForm.goal" placeholder="Meta del sprint" />
          </div>
          <div class="field-stack">
            <label for="sprint-start">Inicio</label>
            <input id="sprint-start" v-model="sprintForm.startDate" type="date" required />
          </div>
          <div class="field-stack">
            <label for="sprint-end">Fin</label>
            <input id="sprint-end" v-model="sprintForm.endDate" type="date" required />
          </div>
          <button class="btn btn-primary btn--sm" type="submit" :disabled="sprintSaving">
            {{ sprintSaving ? 'Creando...' : 'Crear sprint' }}
          </button>
        </form>

        <div class="sprint-list">
          <div v-for="sprint in sprints" :key="sprint.id" class="sprint-row">
            <div>
              <strong>{{ sprint.name }}</strong>
              <span class="meta"> · {{ sprint.startDate }} → {{ sprint.endDate }}</span>
            </div>
            <div class="sprint-row__actions">
              <StatusLozenge :label="sprintStatusLabel(sprint.status)" :code="sprintStatusCode(sprint.status)" />
              <button
                v-if="sprint.status !== 'active'"
                type="button"
                class="btn btn-ghost btn--sm"
                @click="setSprintStatus(sprint, 'active')"
              >
                Activar
              </button>
              <button
                v-if="sprint.status !== 'closed'"
                type="button"
                class="btn btn-ghost btn--sm"
                @click="setSprintStatus(sprint, 'closed')"
              >
                Cerrar
              </button>
            </div>
          </div>
          <p v-if="sprints.length === 0" class="meta">No hay sprints. Crea el primero para planificar como en Jira.</p>
        </div>
      </article>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { dashboardService } from '../services/dashboardService';
import { sprintsService } from '../../sprints/services/sprintsService';
import { useUi } from '../../../shared/composables/useUi';
import StatusLozenge from '../../../shared/components/StatusLozenge.vue';
import NexusMetricCard from '../../../nexus/components/NexusMetricCard.vue';

const ui = useUi();
const loading = ref(false);
const data = ref(null);
const sprints = ref([]);
const showSprintForm = ref(false);
const sprintSaving = ref(false);

const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);

const monthInput = computed({
  get: () => `${year.value}-${String(month.value).padStart(2, '0')}`,
  set: (value) => {
    const [y, m] = String(value || '').split('-');
    year.value = Number(y) || now.getFullYear();
    month.value = Number(m) || 1;
  },
});

const monthLabel = computed(() => {
  try {
    return new Date(year.value, month.value - 1, 1).toLocaleDateString('es-CO', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return `${month.value}/${year.value}`;
  }
});

const dailyRows = computed(() => data.value?.daily || []);
const dailyMax = computed(() =>
  Math.max(1, ...dailyRows.value.map((r) => Math.max(r.created, r.completed))),
);
const velocityRows = computed(() => data.value?.velocity?.sprints || []);
const velocityMax = computed(() =>
  Math.max(1, ...velocityRows.value.map((r) => r.completedPoints)),
);
const statusRows = computed(() => data.value?.byStatus || []);
const statusMax = computed(() => Math.max(1, ...statusRows.value.map((r) => r.count)));
const burndownRows = computed(() => data.value?.activeSprint?.burndown?.days || []);
const burndownMax = computed(() => data.value?.activeSprint?.burndown?.totalScope || 1);

const sprintForm = reactive({
  name: '',
  goal: '',
  startDate: '',
  endDate: '',
});

function barPct(value, max) {
  return `${Math.round((Number(value || 0) / Math.max(1, max)) * 100)}%`;
}

function burndownHeight(remaining) {
  const pct = (Number(remaining || 0) / burndownMax.value) * 100;
  return `${Math.max(4, pct)}%`;
}

function sprintStatusLabel(status) {
  if (status === 'active') return 'Activo';
  if (status === 'closed') return 'Cerrado';
  return 'Planificado';
}

function sprintStatusCode(status) {
  if (status === 'active') return 'IN_PROGRESS';
  if (status === 'closed') return 'CLOSED';
  return 'OPEN';
}

function shiftMonth(delta) {
  let m = month.value + delta;
  let y = year.value;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  month.value = m;
  year.value = y;
  load();
}

async function loadSprints() {
  try {
    const payload = await sprintsService.list();
    sprints.value = payload?.items || [];
  } catch {
    sprints.value = [];
  }
}

async function load() {
  loading.value = true;
  try {
    data.value = await dashboardService.monthly(year.value, month.value);
    await loadSprints();
  } catch (error) {
    ui.showToast(error.message || 'No se pudo cargar el dashboard.', true);
  } finally {
    loading.value = false;
  }
}

async function createSprint() {
  sprintSaving.value = true;
  try {
    await sprintsService.create({
      name: sprintForm.name,
      goal: sprintForm.goal || undefined,
      startDate: sprintForm.startDate,
      endDate: sprintForm.endDate,
      status: 'planned',
    });
    sprintForm.name = '';
    sprintForm.goal = '';
    showSprintForm.value = false;
    ui.showToast('Sprint creado.');
    await load();
  } catch (error) {
    ui.showToast(error.message || 'No se pudo crear el sprint.', true);
  } finally {
    sprintSaving.value = false;
  }
}

async function setSprintStatus(sprint, status) {
  try {
    await sprintsService.update(sprint.id, { status });
    ui.showToast(status === 'active' ? 'Sprint activado.' : 'Sprint cerrado.');
    await load();
  } catch (error) {
    ui.showToast(error.message || 'No se pudo actualizar el sprint.', true);
  }
}

onMounted(() => {
  const start = new Date(year.value, month.value - 1, 1);
  const end = new Date(year.value, month.value, 0);
  sprintForm.startDate = start.toISOString().slice(0, 10);
  sprintForm.endDate = end.toISOString().slice(0, 10);
  load();
});
</script>
