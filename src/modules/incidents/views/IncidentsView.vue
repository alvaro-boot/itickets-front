<template>
  <section class="stack">
    <div class="toolbar">
      <h2 style="margin: 0; font-size: 1.25rem">Incidentes generales</h2>
    </div>

    <div class="panel">
      <form class="grid-2" @submit.prevent="createIncident">
        <div class="field-stack" style="grid-column: 1 / -1">
          <label for="incidentTitle">Titulo</label>
          <input id="incidentTitle" v-model.trim="form.title" minlength="3" required />
        </div>
        <div class="field-stack" style="grid-column: 1 / -1">
          <label for="incidentDescription">Descripcion</label>
          <textarea id="incidentDescription" v-model="form.description"></textarea>
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
          <button class="btn btn-primary" type="submit">Registrar incidente</button>
        </div>
      </form>
    </div>

    <DataTable :rows="incidentRows" :columns="incidentColumns" row-key="id" empty-text="Sin incidentes" :initial-page-size="10">
      <template #cell-status="{ row }">
        <select :value="row.status" @change="updateStatus(row.id, $event.target.value)">
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
      </template>
      <template #cell-updatedAt="{ row }">
        <span class="meta">{{ fmtDate(row.updatedAt) }}</span>
      </template>
    </DataTable>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { incidentsService } from '../services/incidentsService';
import { useCatalogs } from '../../../shared/composables/useCatalogs';
import { useUi } from '../../../shared/composables/useUi';
import { fmtDate } from '../../../shared/utils/format';
import DataTable from '../../../shared/components/DataTable.vue';

const ui = useUi();
const { fetchCatalogBundle } = useCatalogs();

const rows = ref([]);
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
  { key: 'title', label: 'Titulo' },
  { key: 'productName', label: 'Producto' },
  { key: 'typeName', label: 'Tipo' },
  { key: 'status', label: 'Estado' },
  { key: 'createdByName', label: 'Creado por' },
  { key: 'updatedAt', label: 'Actualizado' },
];

const incidentRows = computed(() =>
  (rows.value || []).map((incident) => ({
    ...incident,
    productName: incident.product?.name || '',
    typeName: incident.ticketType?.name || '',
    createdByName: incident.createdBy?.fullName || incident.createdBy?.email || '',
  })),
);

async function loadData() {
  try {
    const [incidents, bundle] = await Promise.all([incidentsService.list(), fetchCatalogBundle()]);
    rows.value = incidents || [];
    catalogs.products = bundle.products || [];
    catalogs.types = bundle.types || [];
    form.productId = catalogs.products[0]?.id || '';
    form.ticketTypeId = catalogs.types[0]?.id || '';
  } catch (error) {
    ui.showToast(error.message || 'No se pudieron cargar incidentes.', true);
  }
}

async function createIncident() {
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
  }
}

async function updateStatus(id, status) {
  try {
    await incidentsService.update(id, { status });
    ui.showToast('Estado de incidente actualizado', false);
    await loadData();
  } catch (error) {
    ui.showToast(error.message || 'No se pudo actualizar el incidente.', true);
  }
}

onMounted(loadData);
</script>
