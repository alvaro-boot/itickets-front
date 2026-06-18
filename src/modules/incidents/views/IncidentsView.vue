<template>
  <section class="page page--module page--incidents">
    <header class="page__header">
      <h1 class="page__title">Incidentes</h1>
      <p class="page__subtitle">Total {{ total }} · Abiertos {{ openCount }} · Resueltos {{ resolvedCount }}</p>
    </header>

    <div class="jira-collapsible jira-collapsible--card">
      <button type="button" class="jira-collapsible__toggle" @click="showCreate = !showCreate">
        <span>Registrar incidente</span>
        <span class="jira-collapsible__chevron" :class="{ 'is-open': showCreate }">▼</span>
      </button>
      <div v-if="showCreate" class="jira-collapsible__body">
      <form class="grid-2 module-form" @submit.prevent="createIncident">
        <div class="field-stack" style="grid-column: 1 / -1">
          <label for="incidentTitle">Título</label>
          <input id="incidentTitle" v-model.trim="form.title" minlength="3" required placeholder="Describe el incidente" />
        </div>
        <div class="field-stack" style="grid-column: 1 / -1">
          <label for="incidentDescription">Descripción</label>
          <textarea id="incidentDescription" v-model="form.description" rows="3" placeholder="Detalles adicionales"></textarea>
        </div>
        <div class="field-stack">
          <label for="incidentProductId">Producto</label>
          <select id="incidentProductId" v-model="form.productId" required>
            <option v-for="product in catalogs.products" :key="product.id" :value="product.id">{{ product.name }}</option>
          </select>
        </div>
        <div class="field-stack">
          <label for="incidentTypeId">Tipo</label>
          <select id="incidentTypeId" v-model="form.ticketTypeId" required>
            <option v-for="type in catalogs.types" :key="type.id" :value="type.id">{{ type.name }}</option>
          </select>
        </div>
        <div style="grid-column: 1 / -1">
          <button class="btn btn-primary" type="submit" :disabled="isSubmitting || isLoading">
            {{ isSubmitting ? 'Registrando...' : 'Registrar incidente' }}
          </button>
        </div>
      </form>
      </div>
    </div>

    <div v-if="isLoading" class="panel panel--muted">
      <p class="meta">Cargando incidentes...</p>
    </div>

    <div class="panel panel--elevated">
      <div class="panel-header">
        <h3 class="panel-header__title">Listado</h3>
      </div>
      <DataTable variant="jira" :rows="incidentRows" :columns="incidentColumns" row-key="id" empty-text="Sin incidentes" :initial-page-size="25">
        <template #cell-status="{ row }">
          <div class="cell-status-edit">
            <StatusLozenge :label="statusLabel(row.status)" :code="row.status" />
            <select
              class="status-select"
              :value="row.status"
              :disabled="updatingId === row.id"
              @change="updateStatus(row.id, $event.target.value)"
            >
              <option value="OPEN">Abierto</option>
              <option value="IN_PROGRESS">En progreso</option>
              <option value="RESOLVED">Resuelto</option>
            </select>
          </div>
        </template>
        <template #cell-updatedAt="{ row }">
          <span class="meta">{{ fmtDate(row.updatedAt) }}</span>
        </template>
      </DataTable>
      <div class="table-footer" v-if="totalPages > 1">
        <div class="table-footer__meta">Página {{ page }} de {{ totalPages }}</div>
        <div class="table-footer__controls">
          <button class="btn btn-ghost btn--sm" type="button" :disabled="page <= 1" @click="prevPage">Anterior</button>
          <button class="btn btn-ghost btn--sm" type="button" :disabled="page >= totalPages" @click="nextPage">Siguiente</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { incidentsService } from '../services/incidentsService';
import { useCatalogs } from '../../../shared/composables/useCatalogs';
import { useUi } from '../../../shared/composables/useUi';
import { fmtDate } from '../../../shared/utils/format';
import DataTable from '../../../shared/components/DataTable.vue';
import StatusLozenge from '../../../shared/components/StatusLozenge.vue';

const ui = useUi();
const { fetchCatalogBundle } = useCatalogs();

const rows = ref([]);
const total = ref(0);
const page = ref(1);
const limit = ref(25);
const isLoading = ref(false);
const isSubmitting = ref(false);
const showCreate = ref(false);
const updatingId = ref(null);
const catalogs = reactive({
  products: [],
  types: [],
});
const form = reactive({
  title: '',
  description: '',
  productId: '',
  ticketTypeId: '',
});

const incidentColumns = [
  { key: 'title', label: 'Título' },
  { key: 'productName', label: 'Producto' },
  { key: 'typeName', label: 'Tipo' },
  { key: 'status', label: 'Estado' },
  { key: 'createdByName', label: 'Creado por' },
  { key: 'updatedAt', label: 'Actualizado' },
];

function statusLabel(status) {
  if (status === 'IN_PROGRESS') return 'En progreso';
  if (status === 'RESOLVED') return 'Resuelto';
  return 'Abierto';
}

const incidentRows = computed(() =>
  (rows.value || []).map((incident) => ({
    ...incident,
    productName: incident.product?.name || '',
    typeName: incident.ticketType?.name || '',
    createdByName: incident.createdBy?.fullName || incident.createdBy?.email || '',
  })),
);
const openCount = computed(() => rows.value.filter((incident) => incident.status === 'OPEN').length);
const resolvedCount = computed(() => rows.value.filter((incident) => incident.status === 'RESOLVED').length);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));

async function loadData() {
  isLoading.value = true;
  try {
    const [payload, bundle] = await Promise.all([
      incidentsService.list({ page: page.value, limit: limit.value }),
      fetchCatalogBundle(),
    ]);
    rows.value = payload?.items || [];
    total.value = payload?.total || rows.value.length;
    catalogs.products = bundle.products || [];
    catalogs.types = bundle.types || [];
    form.productId = catalogs.products[0]?.id || '';
    form.ticketTypeId = catalogs.types[0]?.id || '';
  } catch (error) {
    ui.showToast(error.message || 'No se pudieron cargar incidentes.', true);
  } finally {
    isLoading.value = false;
  }
}

async function createIncident() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    await incidentsService.create({
      title: form.title,
      description: form.description || undefined,
      productId: form.productId,
      ticketTypeId: form.ticketTypeId,
    });
    ui.showToast('Incidente registrado', false);
    form.title = '';
    form.description = '';
    await loadData();
  } catch (error) {
    ui.showToast(error.message || 'No se pudo registrar el incidente.', true);
  } finally {
    isSubmitting.value = false;
  }
}

async function updateStatus(id, status) {
  updatingId.value = id;
  const previous = rows.value.find((row) => row.id === id);
  if (previous) previous.status = status;
  try {
    await incidentsService.update(id, { status });
    ui.showToast('Estado de incidente actualizado', false);
  } catch (error) {
    if (previous) await loadData();
    ui.showToast(error.message || 'No se pudo actualizar el incidente.', true);
  } finally {
    updatingId.value = null;
  }
}

function prevPage() {
  if (page.value <= 1) return;
  page.value -= 1;
  loadData();
}

function nextPage() {
  if (page.value >= totalPages.value) return;
  page.value += 1;
  loadData();
}

onMounted(loadData);
</script>
