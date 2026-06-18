<template>
  <section class="page page--home">
    <header class="page__header page__header--row">
      <div>
        <h1 class="page__title">Inicio</h1>
        <p class="page__subtitle">
          Hola{{ userName ? `, ${userName}` : '' }} · Resumen de tu mesa de ayuda
        </p>
      </div>
      <button v-if="canCreate" type="button" class="nx-btn nx-btn--primary" @click="openCreateIssue">
        Crear ticket
      </button>
    </header>

    <div v-if="loading" class="panel panel--muted">
      <p class="meta">Cargando resumen...</p>
    </div>

    <template v-else>
      <div class="kpi-grid home-kpi-grid">
        <NexusMetricCard label="Abiertos" :value="tabCounts.all" />
        <NexusMetricCard label="Míos" :value="tabCounts.mine" />
        <NexusMetricCard label="Sin asignar" :value="tabCounts.unassigned" />
        <NexusMetricCard label="Cerrados" :value="tabCounts.closed" />
        <NexusMetricCard
          v-if="monthStats"
          label="Resueltos este mes"
          :value="monthStats.resolved"
          :delta="monthLabel"
        />
        <NexusMetricCard
          v-if="monthStats"
          label="Pendientes"
          :value="monthStats.pending"
        />
      </div>

      <div class="home-grid">
        <article class="dash-panel home-panel">
          <div class="dash-panel__head">
            <div>
              <h2 class="dash-panel__title">Mis tickets recientes</h2>
              <p class="dash-panel__hint">Últimos asignados a ti</p>
            </div>
            <RouterLink to="/tickets?view=mine" class="btn btn-ghost btn--sm">Ver bandeja</RouterLink>
          </div>
          <div v-if="recentTickets.length === 0" class="meta home-empty">No tienes tickets asignados.</div>
          <ul v-else class="home-ticket-list">
            <li v-for="ticket in recentTickets" :key="ticket.id">
              <RouterLink :to="`/tickets/${ticket.id}`" class="home-ticket-list__link">
                <IssueKeyLink :ticket="ticket" />
                <span class="home-ticket-list__title">{{ ticket.title }}</span>
                <StatusLozenge
                  v-if="ticket.status?.name"
                  :label="ticket.status.name"
                  :code="ticket.status.code"
                />
              </RouterLink>
            </li>
          </ul>
        </article>

        <article class="dash-panel home-panel">
          <h2 class="dash-panel__title">Accesos rápidos</h2>
          <div class="home-quick-links">
            <RouterLink to="/tickets" class="home-quick-link">Todos los tickets</RouterLink>
            <RouterLink to="/tickets?view=unassigned" class="home-quick-link">Sin asignar</RouterLink>
            <RouterLink to="/reports" class="home-quick-link">Reportes</RouterLink>
            <RouterLink v-if="showIncidents" to="/incidents" class="home-quick-link">Incidentes</RouterLink>
            <RouterLink v-if="showTasks" to="/tasks" class="home-quick-link">Mis tareas</RouterLink>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import NexusMetricCard from '../../../nexus/components/NexusMetricCard.vue';
import IssueKeyLink from '../../../shared/components/IssueKeyLink.vue';
import StatusLozenge from '../../../shared/components/StatusLozenge.vue';
import { ticketsService } from '../../tickets/services/ticketsService';
import { reportsService } from '../../reports/services/reportsService';
import { useAuth } from '../../../shared/composables/useAuth';
import { usePermissions } from '../../../shared/composables/usePermissions';
import { useCreateIssue } from '../../../shared/composables/useCreateIssue';
import { useUi } from '../../../shared/composables/useUi';

const auth = useAuth();
const perms = usePermissions();
const ui = useUi();
const { openCreateIssue } = useCreateIssue();

const loading = ref(true);
const recentTickets = ref([]);
const tabCounts = ref({ all: 0, mine: 0, unassigned: 0, closed: 0 });
const monthStats = ref(null);

const userName = computed(() => auth.state.profile?.fullName?.split(' ')?.[0] || '');
const canCreate = computed(() => perms.moduleEnabled(perms.MODULES.TICKETS));
const showIncidents = computed(() => perms.moduleEnabled(perms.MODULES.INCIDENTS));
const showTasks = computed(() => perms.moduleEnabled(perms.MODULES.TASKS));

const monthLabel = computed(() => {
  try {
    return new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  } catch {
    return 'Este mes';
  }
});

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

async function load() {
  loading.value = true;
  try {
    const { from, to } = monthRange();
    const [listPayload, distribution] = await Promise.all([
      ticketsService.list({ view: 'mine', limit: 8, page: 1, includeTabCounts: true }),
      reportsService.distribution(from, to).catch(() => null),
    ]);
    recentTickets.value = listPayload?.items || [];
    if (listPayload?.tabCounts) {
      tabCounts.value = {
        all: Number(listPayload.tabCounts.all ?? 0),
        mine: Number(listPayload.tabCounts.mine ?? 0),
        unassigned: Number(listPayload.tabCounts.unassigned ?? 0),
        closed: Number(listPayload.tabCounts.closed ?? 0),
      };
    }
    if (distribution?.summary) {
      monthStats.value = {
        resolved: Number(distribution.summary.resolved ?? 0),
        pending: Number(distribution.summary.pending ?? 0),
      };
    }
  } catch (error) {
    ui.showToast(error.message || 'No se pudo cargar el inicio.', true);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
