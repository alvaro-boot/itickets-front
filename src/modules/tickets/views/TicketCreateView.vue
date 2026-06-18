<template>
  <section class="stack stack--compact ticket-create-page">
    <header class="view-toolbar ticket-create-toolbar">
      <h1 class="view-toolbar__title">Nuevo ticket</h1>
      <div class="view-toolbar__actions">
        <RouterLink class="btn btn-ghost btn--sm" to="/tickets">Cancelar</RouterLink>
        <button class="btn btn-primary btn--sm" type="button" :disabled="submitting" @click="submit">
          {{ submitting ? 'Creando…' : 'Crear ticket' }}
        </button>
      </div>
    </header>

    <form class="ticket-create-layout" @submit.prevent="submit">
      <section class="panel ticket-create-main">
        <div class="field-stack field-stack--dense">
          <label for="title">Título</label>
          <input
            id="title"
            v-model.trim="form.title"
            required
            minlength="3"
            placeholder="Resume el objetivo del ticket"
            class="input--dense"
          />
        </div>
        <div class="field-stack field-stack--dense ticket-create-description">
          <label for="description">Descripción</label>
          <RichTextEditor
            id="description"
            v-model="form.description"
            compact
            placeholder="Detalle del caso, pasos para reproducir, contexto…"
          />
        </div>
      </section>

      <aside class="panel ticket-create-side">
        <p class="ticket-create-side__heading">Clasificación</p>
        <div class="ticket-create-fields">
          <div class="field-stack field-stack--dense">
            <label for="statusId">Estado</label>
            <select id="statusId" v-model="form.statusId" class="input--dense">
              <option v-for="status in catalogs.statuses" :key="status.id" :value="status.id">
                {{ status.name }}
              </option>
            </select>
          </div>
          <div class="field-stack field-stack--dense">
            <label for="priorityId">Prioridad</label>
            <select id="priorityId" v-model="form.priorityId" class="input--dense">
              <option v-for="priority in catalogs.priorities" :key="priority.id" :value="priority.id">
                {{ priority.name }}
              </option>
            </select>
          </div>
          <div class="field-stack field-stack--dense">
            <label for="productId">Producto</label>
            <select id="productId" v-model="form.productId" required class="input--dense">
              <option v-for="product in catalogs.products" :key="product.id" :value="product.id">
                {{ product.name }}
              </option>
            </select>
          </div>
          <div class="field-stack field-stack--dense">
            <label for="ticketTypeId">Tipo</label>
            <select id="ticketTypeId" v-model="form.ticketTypeId" required class="input--dense">
              <option v-for="type in catalogs.types" :key="type.id" :value="type.id">{{ type.name }}</option>
            </select>
          </div>
        </div>

        <p class="ticket-create-side__heading">Solicitante</p>
        <div class="ticket-create-fields">
          <div class="field-stack field-stack--dense" style="grid-column: 1 / -1">
            <label for="areaId">Área</label>
            <select id="areaId" v-model="form.areaId" required class="input--dense">
              <option v-for="area in catalogs.areas" :key="area.id" :value="area.id">{{ area.name }}</option>
            </select>
          </div>
          <div class="field-stack field-stack--dense">
            <label for="requesterName">Nombre</label>
            <input
              id="requesterName"
              v-model.trim="form.requesterName"
              required
              minlength="2"
              placeholder="Quien solicita"
              class="input--dense"
            />
          </div>
          <div class="field-stack field-stack--dense">
            <label for="requesterPhone">Teléfono</label>
            <input
              id="requesterPhone"
              v-model.trim="form.requesterPhone"
              placeholder="Opcional"
              class="input--dense"
            />
          </div>
        </div>

        <p class="ticket-create-side__heading">Asignación</p>
        <div class="ticket-create-fields ticket-create-fields--single">
          <div class="field-stack field-stack--dense">
            <label for="assigneeId">Asignar a</label>
            <select id="assigneeId" v-model="form.assigneeId" :disabled="users.length === 0" class="input--dense">
              <option value="">Sin asignar</option>
              <option v-for="user in users" :key="user.id" :value="String(user.id)">
                {{ user.fullName }}
              </option>
            </select>
            <p v-if="users.length === 0" class="meta field-hint">Sin usuarios para asignar.</p>
          </div>
          <div class="field-stack field-stack--dense">
            <label for="attachments">Adjuntos</label>
            <input id="attachments" ref="attachmentsInput" type="file" multiple class="input-file--dense" />
            <p class="meta field-hint">Opcional. Se agregan al primer comentario.</p>
          </div>
        </div>
      </aside>
    </form>
  </section>
</template>

<script setup>
import { defineAsyncComponent, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ticketsService } from '../services/ticketsService';
import { useCatalogs } from '../../../shared/composables/useCatalogs';
import { useUsers } from '../../../shared/composables/useUsers';
import { useUi } from '../../../shared/composables/useUi';
import { uploadsService } from '../../../shared/services/uploadsService';

const RichTextEditor = defineAsyncComponent(
  () => import('../../../shared/components/RichTextEditor.vue'),
);

const router = useRouter();
const ui = useUi();
const { fetchCatalogBundle } = useCatalogs();
const { fetchUsersList } = useUsers();

const catalogs = reactive({
  statuses: [],
  priorities: [],
  products: [],
  types: [],
  areas: [],
});

const users = ref([]);
const attachmentsInput = ref(null);
const submitting = ref(false);
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

async function loadData() {
  try {
    const [catalogBundle, usersRows] = await Promise.all([fetchCatalogBundle(), fetchUsersList()]);
    Object.assign(catalogs, catalogBundle);
    users.value = usersRows;
    form.statusId = catalogBundle.statuses?.[0]?.id || '';
    form.priorityId = catalogBundle.priorities?.[0]?.id || '';
    form.productId = catalogBundle.products?.[0]?.id || '';
    form.ticketTypeId = catalogBundle.types?.[0]?.id || '';
    form.areaId = catalogBundle.areas?.[0]?.id || '';
  } catch (error) {
    ui.showToast(error.message || 'No se pudieron cargar catálogos.', true);
  }
}

async function uploadAttachmentsInBackground(ticketId, files) {
  try {
    const uploaded = await Promise.all(
      files.map((file) => uploadsService.uploadFile(file, { folder: `tickets/${ticketId}` })),
    );
    const commentBody = [
      'Adjuntos cargados al crear el ticket:',
      ...uploaded.map((item) => `- ${item.name}: ${item.url}`),
    ].join('\n');
    await ticketsService.comment(ticketId, { body: commentBody });
  } catch {
    ui.showToast('El ticket se creó, pero algunos adjuntos no se subieron.', true);
  }
}

async function submit() {
  if (submitting.value) return;
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
    const files = Array.from(attachmentsInput.value?.files || []);
    if (files.length) {
      void uploadAttachmentsInBackground(ticket.id, files);
    }
    router.push(`/tickets/${ticket.id}`);
  } catch (error) {
    ui.showToast(error.message || 'No se pudo crear el ticket.', true);
  } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>
