<template>
  <Teleport to="body">
    <div v-if="open" class="jira-modal-backdrop" @click.self="close">
      <div class="jira-modal jira-modal--nexus" role="dialog" aria-labelledby="create-issue-title" aria-modal="true">
        <header class="jira-modal__header">
          <div>
            <h2 id="create-issue-title">Nuevo ticket</h2>
            <p class="jira-modal__subtitle">Completa los campos para crear un ticket en el equipo</p>
          </div>
          <button type="button" class="jira-modal__close" aria-label="Cerrar" @click="close">×</button>
        </header>

        <form class="jira-modal__body" @submit.prevent="submit">
          <div class="jira-modal__main">
            <div class="field-stack">
              <label for="create-summary">Resumen *</label>
              <input
                id="create-summary"
                ref="summaryInput"
                v-model.trim="form.title"
                required
                minlength="3"
                placeholder="¿Qué necesitas?"
                class="jira-issue-summary-input"
              />
            </div>
            <div class="field-stack">
              <label for="create-description">Descripción</label>
              <RichTextEditor
                id="create-description"
                v-model="form.description"
                compact
                placeholder="Añade una descripción más detallada..."
              />
            </div>
          </div>

          <aside class="jira-modal__sidebar">
            <JiraFieldRow label="Estado">
              <select v-model="form.statusId" class="jira-field-control">
                <option v-for="s in catalogs.statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </JiraFieldRow>
            <JiraFieldRow label="Prioridad">
              <select v-model="form.priorityId" class="jira-field-control">
                <option v-for="p in catalogs.priorities" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </JiraFieldRow>
            <JiraFieldRow label="Asignado">
              <select v-model="form.assigneeId" class="jira-field-control">
                <option value="">Sin asignar</option>
                <option v-for="u in users" :key="u.id" :value="String(u.id)">{{ u.fullName }}</option>
              </select>
            </JiraFieldRow>
            <JiraFieldRow label="Producto">
              <select v-model="form.productId" required class="jira-field-control">
                <option v-for="p in catalogs.products" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </JiraFieldRow>
            <JiraFieldRow label="Tipo">
              <select v-model="form.ticketTypeId" required class="jira-field-control">
                <option v-for="t in catalogs.types" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </JiraFieldRow>
            <JiraFieldRow label="Área">
              <select v-model="form.areaId" required class="jira-field-control">
                <option v-for="a in catalogs.areas" :key="a.id" :value="a.id">{{ a.name }}</option>
              </select>
            </JiraFieldRow>
            <JiraFieldRow label="Solicitante">
              <input v-model.trim="form.requesterName" required minlength="2" class="jira-field-control" />
            </JiraFieldRow>
          </aside>
        </form>

        <footer class="jira-modal__footer">
          <button type="button" class="btn btn-ghost" @click="close">Cancelar</button>
          <button type="button" class="btn btn-primary" :disabled="submitting" @click="submit">
            {{ submitting ? 'Creando...' : 'Crear' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { defineAsyncComponent, nextTick, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ticketsService } from '../services/ticketsService';
import { useCatalogs } from '../../../shared/composables/useCatalogs';
import { useUsers } from '../../../shared/composables/useUsers';
import { useUi } from '../../../shared/composables/useUi';
import JiraFieldRow from '../../../shared/components/JiraFieldRow.vue';

const RichTextEditor = defineAsyncComponent(
  () => import('../../../shared/components/RichTextEditor.vue'),
);

const props = defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'created']);

const router = useRouter();
const ui = useUi();
const { fetchCatalogBundle } = useCatalogs();
const { fetchUsersList } = useUsers();

const summaryInput = ref(null);
const submitting = ref(false);
const users = ref([]);
const catalogs = reactive({
  statuses: [],
  priorities: [],
  products: [],
  types: [],
  areas: [],
});

const form = reactive({
  title: '',
  description: '',
  statusId: '',
  priorityId: '',
  productId: '',
  ticketTypeId: '',
  areaId: '',
  requesterName: '',
  requesterPhone: '',
  assigneeId: '',
});

function resetForm() {
  form.title = '';
  form.description = '';
  form.requesterName = '';
  form.requesterPhone = '';
  form.assigneeId = '';
  form.statusId = catalogs.statuses?.[0]?.id || '';
  form.priorityId = catalogs.priorities?.[0]?.id || '';
  form.productId = catalogs.products?.[0]?.id || '';
  form.ticketTypeId = catalogs.types?.[0]?.id || '';
  form.areaId = catalogs.areas?.[0]?.id || '';
}

function close() {
  emit('close');
}

async function loadData() {
  const [bundle, usersRows] = await Promise.all([fetchCatalogBundle(), fetchUsersList()]);
  Object.assign(catalogs, bundle);
  users.value = usersRows;
  resetForm();
}

async function submit() {
  if (submitting.value || !form.title) return;
  submitting.value = true;
  try {
    const ticket = await ticketsService.create({
      title: form.title,
      description: form.description || undefined,
      statusId: form.statusId || undefined,
      priorityId: form.priorityId || undefined,
      productId: form.productId,
      ticketTypeId: form.ticketTypeId,
      areaId: form.areaId,
      requesterName: form.requesterName,
      requesterPhone: form.requesterPhone || undefined,
      assigneeId: form.assigneeId || undefined,
    });
    emit('created', ticket);
    close();
    router.push(`/tickets/${ticket.id}`);
  } catch (error) {
    ui.showToast(error.message || 'No se pudo crear el ticket.', true);
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    try {
      await loadData();
      await nextTick();
      summaryInput.value?.focus();
    } catch (error) {
      ui.showToast(error.message || 'No se pudieron cargar catálogos.', true);
      close();
    }
  },
);
</script>
