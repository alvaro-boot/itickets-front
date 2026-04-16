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

    <section class="ticket-detail-grid">
      <div class="ticket-detail-grid__main stack">
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
              <div class="actions-row" style="margin-bottom: 0.45rem">
                <button class="btn btn-ghost" type="button" @click="execRich('bold')"><strong>B</strong></button>
                <button class="btn btn-ghost" type="button" @click="execRich('italic')"><em>I</em></button>
                <button class="btn btn-ghost" type="button" @click="execRich('underline')"><u>U</u></button>
                <button class="btn btn-ghost" type="button" @click="execRich('insertUnorderedList')">Lista</button>
                <button class="btn btn-ghost" type="button" @click="insertLink">Link</button>
                <button class="btn btn-ghost" type="button" @click="execRich('removeFormat')">Limpiar</button>
              </div>
              <div
                id="description"
                ref="descriptionEditor"
                class="rich-editor"
                contenteditable="true"
                @input="onEditorInput"
                @blur="onEditorInput"
              ></div>
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
            <div style="grid-column: 1 / -1">
              <button class="btn btn-primary" type="submit">Crear ticket</button>
            </div>
          </form>
        </article>
      </div>

      <aside class="ticket-detail-grid__side stack">
        <article class="panel ticket-panel">
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
        </article>
      </aside>
    </section>
  </section>
</template>

<script setup>
import { nextTick, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ticketsService } from '../services/ticketsService';
import { useCatalogs } from '../../../shared/composables/useCatalogs';
import { useUsers } from '../../../shared/composables/useUsers';
import { useUi } from '../../../shared/composables/useUi';

const router = useRouter();
const ui = useUi();
const { fetchCatalogBundle } = useCatalogs();
const { fetchUsersList } = useUsers();

const catalogs = reactive({
  statuses: [],
  priorities: [],
  products: [],
  types: [],
});

const users = ref([]);
const descriptionEditor = ref(null);
const form = reactive({
  title: '',
  description: '',
  statusId: '',
  priorityId: '',
  productId: '',
  ticketTypeId: '',
  assigneeId: '',
});

function sanitizeRichHtml(input) {
  if (!input) return '';
  const template = document.createElement('template');
  template.innerHTML = String(input);
  const allowedTags = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'A']);
  template.content.querySelectorAll('*').forEach((node) => {
    if (!allowedTags.has(node.tagName)) {
      node.replaceWith(document.createTextNode(node.textContent || ''));
      return;
    }
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const isLinkAttr = node.tagName === 'A' && (name === 'href' || name === 'target' || name === 'rel');
      if (!isLinkAttr) node.removeAttribute(attr.name);
      if (name === 'href' && /^(javascript|data):/i.test(String(attr.value || '').trim())) {
        node.removeAttribute('href');
      }
    });
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return template.innerHTML;
}

function setEditorHtml(html) {
  if (!descriptionEditor.value) return;
  descriptionEditor.value.innerHTML = sanitizeRichHtml(html || '');
}

function onEditorInput() {
  form.description = sanitizeRichHtml(descriptionEditor.value?.innerHTML || '');
}

function execRich(command) {
  descriptionEditor.value?.focus();
  document.execCommand(command, false);
  onEditorInput();
}

function insertLink() {
  const url = window.prompt('Ingresa la URL (https://...)');
  if (!url) return;
  descriptionEditor.value?.focus();
  document.execCommand('createLink', false, String(url).trim());
  onEditorInput();
}

async function loadData() {
  try {
    const [catalogBundle, usersRows] = await Promise.all([fetchCatalogBundle(), fetchUsersList()]);
    Object.assign(catalogs, catalogBundle);
    users.value = usersRows;
    form.statusId = catalogBundle.statuses?.[0]?.id || '';
    form.priorityId = catalogBundle.priorities?.[0]?.id || '';
    form.productId = catalogBundle.products?.[0]?.id || '';
    form.ticketTypeId = catalogBundle.types?.[0]?.id || '';
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
      assigneeId: form.assigneeId || undefined,
    });
    router.push(`/tickets/${ticket.id}`);
  } catch (error) {
    ui.showToast(error.message || 'No se pudo crear el ticket.', true);
  }
}

onMounted(loadData);
onMounted(async () => {
  await nextTick();
  setEditorHtml(form.description || '');
});
</script>
