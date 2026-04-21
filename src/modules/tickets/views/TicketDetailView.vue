<template>
  <section class="stack">
    <div class="page-header">
      <div class="page-title">
        <h2>Ticket #{{ route.params.id }}</h2>
        <p>Organiza el seguimiento del caso, controla su contexto y documenta todo el avance en un solo lugar.</p>
      </div>
      <RouterLink class="btn btn-ghost" to="/tickets">Lista</RouterLink>
    </div>

    <div v-if="loading" class="panel">
      <p class="meta">Cargando ticket...</p>
    </div>

    <template v-else-if="ticket">
      <div v-if="isBusy" class="ticket-loading-hint" role="status" aria-live="polite">
        <span class="ticket-loading-hint__dot"></span>
        <span>{{ busyMessage }}</span>
      </div>

      <section class="ticket-overview-card">
        <div class="ticket-overview-card__main">
          <p class="spotlight-card__eyebrow">Resumen del caso</p>
          <h3 class="ticket-overview-card__title">{{ ticket.title }}</h3>
          <RichHtmlDisplay
            v-if="ticket.description && String(ticket.description).trim()"
            class="ticket-overview-card__copy"
            :html="ticket.description"
          />
          <p v-else class="ticket-overview-card__copy">Este ticket aún no tiene una descripción detallada.</p>
        </div>
        <div class="ticket-overview-card__side">
          <div class="status-pill ticket-status-pill">
            <span class="status-dot"></span>
            {{ selectedStatusName }}
          </div>
          <p class="ticket-overview-card__side-meta">Prioridad {{ selectedPriorityName }}</p>
        </div>
      </section>

      <section class="stats-grid">
        <article class="stat-card">
          <p class="stat-card__label">Tiempo registrado</p>
          <p class="stat-card__value">{{ ticket.totalLoggedMinutes || 0 }} min</p>
          <p class="stat-card__hint">{{ ticket.totalLoggedHours || 0 }} horas acumuladas en este ticket</p>
        </article>
        <article class="stat-card">
          <p class="stat-card__label">Última actualización</p>
          <p class="stat-card__value">{{ shortUpdatedAt }}</p>
          <p class="stat-card__hint">Último cambio documentado sobre el caso</p>
        </article>
        <article class="stat-card">
          <p class="stat-card__label">Actividad</p>
          <p class="stat-card__value">{{ activityCount }}</p>
          <p class="stat-card__hint">Eventos, comentarios y registros vinculados</p>
        </article>
      </section>

      <section class="ticket-tabs" role="tablist" aria-label="Secciones del ticket">
        <button
          v-for="tab in workspaceTabs"
          :key="tab.key"
          class="ticket-tab"
          :class="{ active: activeWorkspaceTab === tab.key, 'ticket-tab--disabled': tab.disabled }"
          :disabled="tab.disabled"
          type="button"
          @click="activeWorkspaceTab = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count != null" class="badge">{{ tab.count }}</span>
        </button>
      </section>

      <section class="ticket-workspace">
        <article v-if="activeWorkspaceTab === 'data'" class="panel ticket-panel">
          <div class="panel-header">
            <div class="page-title">
              <h2 style="font-size: 1.05rem">Datos principales</h2>
              <p>Edita el contexto del ticket y mantén limpia la información operativa.</p>
            </div>
          </div>
          <div class="ticket-edit-block">
            <div class="grid-2">
                <div class="field-stack" style="grid-column: 1 / -1">
                  <label for="title">Título</label>
                  <input id="title" v-model.trim="form.title" required minlength="3" />
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
                  <select id="productId" v-model="form.productId">
                    <option v-for="product in catalogs.products" :key="product.id" :value="product.id">{{ product.name }}</option>
                  </select>
                </div>
                <div class="field-stack">
                  <label for="ticketTypeId">Tipo</label>
                  <select id="ticketTypeId" v-model="form.ticketTypeId">
                    <option v-for="type in catalogs.types" :key="type.id" :value="type.id">{{ type.name }}</option>
                  </select>
                </div>
                <div class="field-stack">
                  <label for="areaId">Área solicitante</label>
                  <select id="areaId" v-model="form.areaId">
                    <option value="">— Sin área —</option>
                    <option v-for="area in catalogs.areas" :key="area.id" :value="area.id">{{ area.name }}</option>
                  </select>
                </div>
                <div class="field-stack">
                  <label for="requesterName">Nombre de quien solicita</label>
                  <input
                    id="requesterName"
                    v-model.trim="form.requesterName"
                    placeholder="Nombre completo del solicitante"
                  />
                </div>
                <div class="field-stack" style="grid-column: 1 / -1">
                  <label for="assigneeId">Asignado a</label>
                  <select id="assigneeId" v-model="form.assigneeId">
                    <option value="">— Sin asignar —</option>
                    <option v-for="user in assignableUsers" :key="user.id" :value="String(user.id)">
                      {{ user.fullName }} ({{ user.email }})
                    </option>
                  </select>
                  <p v-if="assignableUsers.length === 0" class="meta">No tienes permiso para reasignar usuarios.</p>
                </div>
            </div>
            <div class="actions-row ticket-sticky-actions">
              <button class="btn btn-primary" type="button" :disabled="isBusy" @click="saveTicket">
                {{ isSaving ? 'Guardando...' : 'Guardar cambios' }}
              </button>
              <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="duplicateTicket">
                {{ isDuplicating ? 'Duplicando...' : 'Duplicar y asignar' }}
              </button>
            </div>
          </div>
        </article>

        <article v-else-if="activeWorkspaceTab === 'comments'" class="panel ticket-panel">
          <div class="panel-header">
            <div class="page-title">
              <h2 style="font-size: 1.05rem">Comentarios</h2>
              <p>Actualizaciones rápidas del equipo sobre el caso.</p>
            </div>
          </div>
          <form class="ticket-inline-form comment-composer" @submit.prevent="addComment">
            <div class="field-stack">
              <label for="body">Nuevo comentario</label>
              <RichTextEditor
                id="body"
                v-model="commentBody"
                compact
                placeholder="Escribe una actualización..."
                :disabled="isBusy"
              />
            </div>
            <div class="actions-row" style="justify-content: space-between">
              <input ref="commentFileInput" type="file" :disabled="isBusy" />
              <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="uploadAttachment">
                Subir archivo/foto
              </button>
            </div>
            <button class="btn btn-primary" type="submit" :disabled="isBusy">
              {{ isCommenting ? 'Publicando...' : 'Publicar' }}
            </button>
          </form>

          <div class="comment-timeline">
            <div v-if="(ticket.comments || []).length === 0" class="meta">Sin comentarios aún.</div>
            <div
              v-for="comment in ticket.comments || []"
              :key="comment.id || comment.createdAt"
              class="timeline-item timeline-item--comment"
            >
              <div class="timeline-item__dot"></div>
              <div class="timeline-item__content">
                <div class="timeline-item__header">
                  <strong>{{ comment.author?.fullName || 'Usuario' }}</strong>
                  <span>{{ fmtDate(comment.createdAt) }}</span>
                </div>
                <RichHtmlDisplay
                  v-if="stripUrlsForDisplay(comment.body)"
                  class="comment-rich-body"
                  :html="stripUrlsForDisplay(comment.body)"
                />
                <p v-else class="meta">Adjunto sin texto</p>
                <div v-if="extractAttachments(comment.body).length" class="stack" style="margin-top: 0.5rem">
                  <article
                    v-for="attachment in extractAttachments(comment.body)"
                    :key="attachment.url"
                    class="panel"
                    style="padding: 0.6rem"
                  >
                    <img
                      v-if="attachment.isImage"
                      :src="attachment.url"
                      alt="Imagen adjunta"
                      style="max-width: 100%; border-radius: 10px; margin-bottom: 0.5rem"
                    />
                    <div class="actions-row" style="justify-content: space-between">
                      <a class="btn btn-ghost" :href="attachment.url" target="_blank" rel="noopener noreferrer">
                        Ver
                      </a>
                      <a class="btn btn-primary" :href="attachment.url" download>
                        Descargar
                      </a>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article v-else-if="activeWorkspaceTab === 'history'" class="panel ticket-panel">
          <div class="panel-header">
            <div class="page-title">
              <h2 style="font-size: 1.05rem">Historial de movimientos</h2>
              <p>Rastrea los cambios importantes del ticket en orden cronológico.</p>
            </div>
          </div>
          <div class="timeline-list">
            <div v-if="(ticket.events || []).length === 0" class="meta">Sin movimientos registrados aún.</div>
            <div
              v-for="event in ticket.events || []"
              :key="event.id || `${event.createdAt}-${event.eventType}`"
              class="timeline-item"
            >
              <div class="timeline-item__dot"></div>
              <div class="timeline-item__content">
                <div class="timeline-item__header">
                  <strong>{{ event.actor?.fullName || 'Sistema' }}</strong>
                  <span>{{ fmtDate(event.createdAt) }}</span>
                </div>
                <p>{{ eventText(event) }}</p>
              </div>
            </div>
          </div>
        </article>

        <article v-else class="panel ticket-panel">
          <div class="panel-header">
            <div class="page-title">
              <h2 style="font-size: 1.05rem">Registro de tiempo</h2>
              <p>Controla dedicación y contexto del trabajo invertido.</p>
            </div>
          </div>
          <div class="comments">
            <div v-if="(ticket.worklogs || []).length === 0" class="meta">Sin registros de tiempo aún.</div>
            <div
              v-for="worklog in ticket.worklogs || []"
              :key="worklog.id || worklog.createdAt"
              class="comment comment--elevated"
            >
              <span class="who">{{ worklog.author?.fullName || 'Usuario' }}</span>
              <span class="when">{{ fmtDate(worklog.createdAt) }}</span>
              <div class="body">
                {{ worklog.minutesSpent }} minutos<span v-if="worklog.note"> · {{ worklog.note }}</span>
              </div>
            </div>
          </div>
          <div class="ticket-inline-form">
            <p class="meta" style="margin: 0 0 0.6rem">
              Para registrar tiempo, completa los minutos y usa “Guardar cambios”.
            </p>
            <div class="grid-2">
              <div class="field-stack">
                <label for="minutesSpent">Minutos trabajados</label>
                <input
                  id="minutesSpent"
                  v-model.number="worklog.minutesSpent"
                  type="number"
                  min="1"
                  max="1440"
                  required
                />
              </div>
              <div class="field-stack">
                <label for="worklogNote">Nota (opcional)</label>
                <input id="worklogNote" v-model="worklog.note" />
              </div>
            </div>
            <div class="actions-row">
              <button class="btn btn-primary" type="button" :disabled="isBusy || !showWorklogs" @click="saveTicket">
                {{ isSaving ? 'Guardando...' : 'Guardar tiempo y cambios' }}
              </button>
            </div>
          </div>
        </article>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ticketsService } from '../services/ticketsService';
import { useCatalogs } from '../../../shared/composables/useCatalogs';
import { useUsers } from '../../../shared/composables/useUsers';
import { useUi } from '../../../shared/composables/useUi';
import { uploadsService } from '../../../shared/services/uploadsService';
import { eventText, fmtDate } from '../../../shared/utils/format';
import RichHtmlDisplay from '../../../shared/components/RichHtmlDisplay.vue';
import RichTextEditor from '../../../shared/components/RichTextEditor.vue';
import { isRichHtmlEmpty, stripUrlsForDisplay } from '../../../shared/utils/richHtml';

const route = useRoute();
const router = useRouter();
const ui = useUi();
const { fetchCatalogBundle } = useCatalogs();
const { fetchUsersList } = useUsers();

const loading = ref(false);
const ticket = ref(null);
const assignableUsers = ref([]);
const commentBody = ref('');
const commentFileInput = ref(null);
const isSaving = ref(false);
const isCommenting = ref(false);
const isDuplicating = ref(false);
const activeWorkspaceTab = ref('data');
const worklog = reactive({
  minutesSpent: null,
  note: '',
});
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
  assigneeId: '',
});

function extractAttachments(body) {
  const text = String(body || '');
  const matches = text.match(/https?:\/\/[^\s)]+/g) || [];
  return matches.map((url) => {
    const lower = url.toLowerCase();
    const isImage =
      lower.includes('/imagenes/') ||
      /\.(png|jpe?g|gif|webp|svg|bmp)(\?|#|$)/i.test(lower) ||
      /[?&](format|ext)=(png|jpg|jpeg|gif|webp|svg|bmp)/i.test(lower);
    return { url, isImage };
  });
}

const selectedStatusName = computed(
  () => catalogs.statuses.find((status) => String(status.id) === String(form.statusId))?.name || ticket.value?.status?.name || 'Sin estado',
);

const selectedPriorityName = computed(
  () =>
    catalogs.priorities.find((priority) => String(priority.id) === String(form.priorityId))?.name ||
    ticket.value?.priority?.name ||
    'Sin prioridad',
);

const shortUpdatedAt = computed(() => {
  if (!ticket.value?.updatedAt) return '—';
  try {
    return new Date(ticket.value.updatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  } catch {
    return String(ticket.value.updatedAt);
  }
});

const activityCount = computed(() => {
  const events = ticket.value?.events?.length || 0;
  const comments = ticket.value?.comments?.length || 0;
  const worklogs = ticket.value?.worklogs?.length || 0;
  return events + comments + worklogs;
});

const SERVERLESS_SAFE_UPLOAD_BYTES = 4 * 1024 * 1024;
const commentsCount = computed(() => ticket.value?.comments?.length || 0);
const eventsCount = computed(() => ticket.value?.events?.length || 0);
const totalLoggedMinutes = computed(() => Number(ticket.value?.totalLoggedMinutes || 0));
const totalLoggedBadge = computed(() => `${totalLoggedMinutes.value}m`);

const selectedStatusCode = computed(() => {
  const st = catalogs.statuses.find((status) => String(status.id) === String(form.statusId));
  return st?.code ? String(st.code) : '';
});

const isClosedStatus = computed(() => {
  if (ticket.value?.closedAt) return true;
  const name = String(selectedStatusName.value || '').toLowerCase();
  const code = String(selectedStatusCode.value || '').toLowerCase();
  return name.includes('cerrad') || code.includes('closed');
});

const showWorklogs = computed(() => isClosedStatus.value);
const workspaceTabs = computed(() => [
  { key: 'data', label: 'Datos' },
  { key: 'comments', label: 'Comentarios', count: commentsCount.value },
  { key: 'history', label: 'Historial', count: eventsCount.value },
  { key: 'time', label: 'Tiempo', count: totalLoggedBadge.value, disabled: !showWorklogs.value },
]);
const isBusy = computed(() => isSaving.value || isCommenting.value || isDuplicating.value);
const busyMessage = computed(() => {
  if (isSaving.value) return 'Guardando cambios del ticket...';
  if (isCommenting.value) return 'Publicando comentario...';
  if (isDuplicating.value) return 'Duplicando ticket...';
  return 'Cargando...';
});

function syncForm() {
  if (!ticket.value) return;
  form.title = ticket.value.title || '';
  form.description = ticket.value.description || '';
  form.statusId = ticket.value.statusId || '';
  form.priorityId = ticket.value.priorityId || '';
  form.productId = ticket.value.productId || '';
  form.ticketTypeId = ticket.value.ticketTypeId || '';
  form.areaId = ticket.value.areaId || '';
  form.requesterName = ticket.value.requesterName || '';
  form.assigneeId = ticket.value.assigneeId == null ? '' : String(ticket.value.assigneeId);
}

function mergeTicketSnapshot(snapshot) {
  if (!snapshot) return;
  if (!ticket.value) {
    ticket.value = snapshot;
    syncForm();
    return;
  }
  ticket.value = {
    ...ticket.value,
    ...snapshot,
    comments: snapshot.comments ?? ticket.value.comments ?? [],
    events: snapshot.events ?? ticket.value.events ?? [],
    worklogs: snapshot.worklogs ?? ticket.value.worklogs ?? [],
  };
  syncForm();
}

async function refreshTicketDataSoft() {
  const fullSnapshot = await ticketsService.get(route.params.id);
  mergeTicketSnapshot(fullSnapshot);
}

async function loadTicket() {
  loading.value = true;
  try {
    const [ticketRow, catalogBundle, userList] = await Promise.all([
      ticketsService.get(route.params.id),
      fetchCatalogBundle(),
      fetchUsersList(),
    ]);

    ticket.value = ticketRow;
    Object.assign(catalogs, catalogBundle);

    const usersMap = new Map((userList || []).map((user) => [String(user.id), user]));
    if (ticketRow.assigneeId && !usersMap.has(String(ticketRow.assigneeId))) {
      usersMap.set(String(ticketRow.assigneeId), {
        id: ticketRow.assigneeId,
        fullName: ticketRow.assignee?.fullName || 'Usuario asignado',
        email: ticketRow.assignee?.email || '',
      });
    }
    assignableUsers.value = Array.from(usersMap.values()).sort((a, b) =>
      String(a.fullName || '').localeCompare(String(b.fullName || ''), 'es'),
    );

    syncForm();
  } catch (error) {
    ui.showToast(error.message || 'No se pudo cargar el ticket.', true);
  } finally {
    loading.value = false;
  }
}

async function saveTicket() {
  if (isBusy.value) return;
  isSaving.value = true;
  try {
    const assigneeId = form.assigneeId || null;
    await ticketsService.reassign(route.params.id, { assigneeId });
    await ticketsService.update(route.params.id, {
      title: form.title,
      description: form.description,
      statusId: form.statusId,
      priorityId: form.priorityId,
      productId: form.productId,
      ticketTypeId: form.ticketTypeId,
      areaId: form.areaId || null,
      requesterName: form.requesterName || null,
    });

    // Registrar tiempo "en el mismo guardado" cuando el ticket está cerrado y el usuario ingresa minutos.
    if (showWorklogs.value) {
      const minutes = Number(worklog.minutesSpent);
      if (!Number.isNaN(minutes) && minutes > 0) {
        await ticketsService.addWorklog(route.params.id, {
          minutesSpent: minutes,
          note: worklog.note || undefined,
        });
        worklog.minutesSpent = null;
        worklog.note = '';
      }
    }

    await refreshTicketDataSoft();
    ui.showToast('Cambios guardados.', false);
  } catch (error) {
    ui.showToast(error.message || 'No se pudo guardar el ticket.', true);
  } finally {
    isSaving.value = false;
  }
}

async function duplicateTicket() {
  if (isBusy.value) return;
  if (!form.assigneeId) {
    ui.showToast('Selecciona un usuario para duplicar y asignar.', true);
    return;
  }
  isDuplicating.value = true;
  try {
    const duplicated = await ticketsService.duplicate(route.params.id, { assigneeId: String(form.assigneeId) });
    ui.showToast(`Ticket duplicado: #${duplicated.id}`, false);
    router.push(`/tickets/${duplicated.id}`);
  } catch (error) {
    ui.showToast(error.message || 'No se pudo duplicar el ticket.', true);
  } finally {
    isDuplicating.value = false;
  }
}

async function addComment() {
  if (isBusy.value) return;
  const body = String(commentBody.value || '').trim();
  if (!body || isRichHtmlEmpty(body)) {
    ui.showToast('Escribe un comentario con contenido.', true);
    return;
  }
  isCommenting.value = true;
  const optimisticId = `tmp-${Date.now()}`;
  if (ticket.value) {
    const optimisticComments = [...(ticket.value.comments || [])];
    optimisticComments.push({
      id: optimisticId,
      body,
      createdAt: new Date().toISOString(),
      author: { fullName: 'Tú' },
    });
    ticket.value = {
      ...ticket.value,
      comments: optimisticComments,
    };
  }
  commentBody.value = '';
  try {
    await ticketsService.comment(route.params.id, { body });
    await refreshTicketDataSoft();
  } catch (error) {
    // Si falla, vuelve al estado completo del servidor sin recargar toda la vista.
    const fallback = await ticketsService.get(route.params.id).catch(() => null);
    if (fallback) mergeTicketSnapshot(fallback);
    ui.showToast(error.message || 'No se pudo registrar el comentario.', true);
  } finally {
    isCommenting.value = false;
  }
}

async function uploadAttachment() {
  if (isBusy.value) return;
  const file = commentFileInput.value?.files?.[0];
  if (!file) {
    ui.showToast('Selecciona un archivo antes de subir.', true);
    return;
  }
  if (file.size > SERVERLESS_SAFE_UPLOAD_BYTES) {
    const currentMb = (file.size / (1024 * 1024)).toFixed(1);
    ui.showToast(
      `El archivo pesa ${currentMb}MB y supera el límite permitido en producción (4MB). Comprime la imagen o usa un archivo más liviano.`,
      true,
    );
    return;
  }
  try {
    const uploaded = await uploadsService.uploadFile(file, { folder: 'tickets' });
    const line = `Archivo adjunto: ${uploaded.url}`;
    const current = String(commentBody.value || '').trim();
    commentBody.value = current ? `${current}\n${line}` : line;
    if (commentFileInput.value) commentFileInput.value.value = '';
    ui.showToast('Archivo subido y agregado al comentario.', false);
  } catch (error) {
    ui.showToast(error.message || 'No se pudo subir el archivo.', true);
  }
}

onMounted(loadTicket);

watch(
  () => route.params.id,
  () => {
    activeWorkspaceTab.value = 'data';
    loadTicket();
  },
);

watch(showWorklogs, (enabled) => {
  if (!enabled && activeWorkspaceTab.value === 'time') {
    activeWorkspaceTab.value = 'data';
  }
});
</script>
