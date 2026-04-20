<template>
  <section class="stack">
    <div class="page-header">
      <div class="page-title">
        <h2>Nuevo ticket</h2>
        <p>Registra un caso con mejor contexto, prioridad y asignación desde una vista más clara.</p>
      </div>
      <RouterLink class="btn btn-ghost" to="/tickets">Volver</RouterLink>
    </div>

    <section class="ticket-overview-card">
      <div class="ticket-overview-card__main">
        <p class="spotlight-card__eyebrow">Preparación del caso</p>
        <h3 class="ticket-overview-card__title">Construye tickets mejor definidos para acelerar asignación y resolución.</h3>
        <p class="ticket-overview-card__copy">
          Documenta el objetivo, selecciona correctamente producto y tipo, y deja lista la información esencial para que el equipo actúe sin fricción.
        </p>
      </div>
      <div class="ticket-overview-card__side">
        <div class="status-pill ticket-status-pill">
          <span class="status-dot"></span>
          Nuevo caso
        </div>
        <p class="ticket-overview-card__side-meta">Formulario guiado de registro</p>
      </div>
    </section>

    <section class="ticket-workspace">
      <article class="panel ticket-panel">
        <div class="panel-header">
          <div class="page-title">
            <h2 style="font-size: 1.05rem">Información principal</h2>
            <p>Define el caso con el contexto suficiente para facilitar triage y ejecución.</p>
          </div>
        </div>
        <form class="grid-2" @submit.prevent="submit">
            <div class="field-stack" style="grid-column: 1 / -1">
              <label for="title">Título</label>
              <input id="title" v-model.trim="form.title" required minlength="3" placeholder="Resume el objetivo del ticket" />
            </div>
            <div class="field-stack" style="grid-column: 1 / -1">
              <label for="description">Descripción</label>
              <RichTextEditor id="description" v-model="form.description" />
            </div>
            <div class="field-stack">
              <label for="statusId">Estado</label>
              <select id="statusId" v-model="form.statusId">
                <option v-for="status in catalogs.statuses" :key="status.id" :value="status.id">{{ status.name }}</option>
              </select>
            </div>
            <div class="field-stack">
              <label for="priorityId">Prioridad</label>
              <select id="priorityId" v-model="form.priorityId">
                <option v-for="priority in catalogs.priorities" :key="priority.id" :value="priority.id">
                  {{ priority.name }}
                </option>
              </select>
            </div>
            <div class="field-stack">
              <label for="productId">Producto</label>
              <select id="productId" v-model="form.productId" required>
                <option v-for="product in catalogs.products" :key="product.id" :value="product.id">{{ product.name }}</option>
              </select>
            </div>
            <div class="field-stack">
              <label for="ticketTypeId">Tipo</label>
              <select id="ticketTypeId" v-model="form.ticketTypeId" required>
                <option v-for="type in catalogs.types" :key="type.id" :value="type.id">{{ type.name }}</option>
              </select>
            </div>
            <div class="field-stack">
              <label for="areaId">Área solicitante</label>
              <select id="areaId" v-model="form.areaId" required>
                <option v-for="area in catalogs.areas" :key="area.id" :value="area.id">{{ area.name }}</option>
              </select>
            </div>
            <div class="field-stack">
              <label for="requesterName">Nombre de quien solicita</label>
              <input
                id="requesterName"
                v-model.trim="form.requesterName"
                required
                minlength="2"
                placeholder="Nombre completo del solicitante"
              />
            </div>
            <div class="field-stack" style="grid-column: 1 / -1">
              <label for="assigneeId">Asignar a (opcional)</label>
              <select id="assigneeId" v-model="form.assigneeId" :disabled="users.length === 0">
                <option value="">— Sin asignar —</option>
                <option v-for="user in users" :key="user.id" :value="String(user.id)">
                  {{ user.fullName }} ({{ user.email }})
                </option>
              </select>
              <p v-if="users.length === 0" class="meta">No hay usuarios disponibles para asignación.</p>
            </div>
            <div class="field-stack" style="grid-column: 1 / -1">
              <label for="attachments">Adjuntos (opcional)</label>
              <input id="attachments" ref="attachmentsInput" type="file" multiple />
              <p class="meta">Puedes subir fotos o archivos al crear el ticket.</p>
            </div>
            <div style="grid-column: 1 / -1">
              <button class="btn btn-primary" type="submit">Crear ticket</button>
            </div>
          </form>
        <div class="ticket-inline-form">
          <div class="panel-header">
            <div class="page-title">
              <h2 style="font-size: 1.05rem">Guía rápida</h2>
              <p>Buenas prácticas para que el ticket quede claro desde el inicio.</p>
            </div>
          </div>
          <div class="ticket-facts">
            <div class="ticket-fact">
              <span>Título</span>
              <strong>Específico y orientado al resultado</strong>
            </div>
            <div class="ticket-fact">
              <span>Descripción</span>
              <strong>Incluye contexto, fecha y fuente de información</strong>
            </div>
            <div class="ticket-fact">
              <span>Producto y tipo</span>
              <strong>Úsalos para clasificar y enrutar mejor</strong>
            </div>
            <div class="ticket-fact">
              <span>Asignación</span>
              <strong>Déjalo listo si ya conoces al responsable</strong>
            </div>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ticketsService } from '../services/ticketsService';
import { useCatalogs } from '../../../shared/composables/useCatalogs';
import { useUsers } from '../../../shared/composables/useUsers';
import { useUi } from '../../../shared/composables/useUi';
import { uploadsService } from '../../../shared/services/uploadsService';
import RichTextEditor from '../../../shared/components/RichTextEditor.vue';

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
const form = reactive({
  title: '',
  description: '',
  statusId: '',
  priorityId: '',
  productId: '',
  ticketTypeId: '',
  areaId: '',
  requesterName: '',
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

async function submit() {
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
      assigneeId: form.assigneeId || undefined,
    });
    const files = Array.from(attachmentsInput.value?.files || []);
    if (files.length) {
      const uploaded = await Promise.all(
        files.map((file) => uploadsService.uploadFile(file, { folder: `tickets/${ticket.id}` })),
      );
      const commentBody = [
        'Adjuntos cargados al crear el ticket:',
        ...uploaded.map((item) => `- ${item.name}: ${item.url}`),
      ].join('\n');
      await ticketsService.comment(ticket.id, { body: commentBody });
    }
    router.push(`/tickets/${ticket.id}`);
  } catch (error) {
    ui.showToast(error.message || 'No se pudo crear el ticket.', true);
  }
}

onMounted(loadData);
</script>
