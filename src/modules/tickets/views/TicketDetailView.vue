<template>
  <section class="jira-page jira-issue-view">
    <div v-if="loading" class="jira-issue-view__loading"><p class="meta">Cargando ticket...</p></div>

    <template v-else-if="ticket">
      <div v-if="isBusy" class="ticket-loading-hint" role="status" aria-live="polite">
        <span class="ticket-loading-hint__dot"></span>
        <span>{{ busyMessage }}</span>
      </div>

      <div class="jira-issue-view__layout">
        <div class="jira-issue-view__main">
          <header class="jira-issue-view__header">
            <div class="jira-issue-view__type-row">
              <span class="jira-issue-view__type-icon" aria-hidden="true">◆</span>
              <IssueKeyLink :ticket="ticket" />
              <RouterLink class="jira-issue-view__back" :to="backToList">← Volver</RouterLink>
            </div>
            <input
              id="title"
              v-model.trim="form.title"
              class="jira-issue-summary-input"
              required
              minlength="3"
              aria-label="Resumen del ticket"
            />
          </header>

          <section class="jira-issue-view__section">
            <h2 class="jira-issue-view__section-title">Descripción</h2>
            <RichTextEditor id="description" v-model="form.description" />
          </section>

          <section class="jira-issue-view__section jira-issue-view__activity">
            <h2 class="jira-issue-view__section-title">Actividad</h2>
            <form class="jira-issue-view__comment-form" @submit.prevent="addComment">
              <RichTextEditor
                id="body"
                v-model="commentBody"
                compact
                placeholder="Añadir un comentario..."
                :disabled="isBusy"
              />
              <div class="jira-issue-view__comment-actions">
                <input ref="commentFileInput" type="file" :disabled="isBusy" />
                <button class="btn btn-ghost btn--sm" type="button" :disabled="isBusy" @click="uploadAttachment">Adjuntar</button>
                <button class="btn btn-primary btn--sm" type="submit" :disabled="isBusy">
                  {{ isCommenting ? 'Publicando...' : 'Comentar' }}
                </button>
              </div>
            </form>

            <ActivityFeed :items="activityItems" />

            <div v-for="comment in ticket.comments || []" :key="`att-${comment.id}`">
              <div v-if="extractAttachments(comment.body).length" class="jira-issue-view__attachments">
                <article
                  v-for="(attachment, attIdx) in extractAttachments(comment.body)"
                  :key="`${String(comment.id)}-${attIdx}`"
                  class="jira-issue-view__attachment"
                >
                  <template v-if="attachment.isImage">
                    <img
                      v-if="resolvedImageSrc[attachmentPreviewKey(comment, attIdx)]"
                      :src="resolvedImageSrc[attachmentPreviewKey(comment, attIdx)]"
                      alt="Imagen adjunta"
                      @error="onAttachmentImageError(comment, attIdx)"
                    />
                  </template>
                  <div class="actions-row">
                    <button type="button" class="btn btn-ghost btn--sm" @click="openStoredAttachment(attachment.storedUrl, 'tab')">Ver</button>
                    <button type="button" class="btn btn-primary btn--sm" @click="openStoredAttachment(attachment.storedUrl, 'download')">Descargar</button>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </div>

        <aside class="jira-issue-view__sidebar jira-meta-panel">
          <h2 class="jira-issue-view__sidebar-title">Detalles</h2>

          <JiraFieldRow label="Estado">
            <select id="statusId" v-model="form.statusId" class="jira-field-control">
              <option v-for="status in catalogs.statuses" :key="status.id" :value="status.id">{{ status.name }}</option>
            </select>
          </JiraFieldRow>
          <JiraFieldRow v-if="selectedStatusIsFinal" label="Fecha de solución">
            <input id="resolvedAt" v-model="form.resolvedAt" type="date" class="jira-field-control" />
          </JiraFieldRow>
          <JiraFieldRow label="Prioridad">
            <select id="priorityId" v-model="form.priorityId" class="jira-field-control">
              <option v-for="priority in catalogs.priorities" :key="priority.id" :value="priority.id">{{ priority.name }}</option>
            </select>
          </JiraFieldRow>
          <JiraFieldRow label="Asignado">
            <select id="assigneeId" v-model="form.assigneeId" class="jira-field-control">
              <option value="">Sin asignar</option>
              <option v-for="user in assignableUsers" :key="user.id" :value="String(user.id)">{{ user.fullName }}</option>
            </select>
          </JiraFieldRow>
          <JiraFieldRow label="Producto">
            <select id="productId" v-model="form.productId" class="jira-field-control">
              <option v-for="product in catalogs.products" :key="product.id" :value="product.id">{{ product.name }}</option>
            </select>
          </JiraFieldRow>
          <JiraFieldRow label="Tipo">
            <select id="ticketTypeId" v-model="form.ticketTypeId" class="jira-field-control">
              <option v-for="type in catalogs.types" :key="type.id" :value="type.id">{{ type.name }}</option>
            </select>
          </JiraFieldRow>
          <JiraFieldRow label="Área">
            <select id="areaId" v-model="form.areaId" class="jira-field-control">
              <option value="">Sin área</option>
              <option v-for="area in catalogs.areas" :key="area.id" :value="area.id">{{ area.name }}</option>
            </select>
          </JiraFieldRow>
          <JiraFieldRow label="Solicitante">
            <input id="requesterName" v-model.trim="form.requesterName" class="jira-field-control" />
          </JiraFieldRow>
          <JiraFieldRow label="Teléfono">
            <input id="requesterPhone" v-model.trim="form.requesterPhone" class="jira-field-control" />
          </JiraFieldRow>
          <JiraFieldRow label="Creado">
            <span>{{ fmtDate(ticket.createdAt) }}</span>
          </JiraFieldRow>
          <JiraFieldRow label="Actualizado">
            <span>{{ fmtDate(ticket.updatedAt) }}</span>
          </JiraFieldRow>
          <JiraFieldRow label="Tiempo registrado">
            <span>{{ ticket.totalLoggedMinutes || 0 }} min</span>
          </JiraFieldRow>

          <template v-if="showWorklogs">
            <JiraFieldRow label="Registrar tiempo">
              <input id="worklogAmount" v-model.number="worklog.amount" type="number" min="1" class="jira-field-control" />
              <select id="worklogUnit" v-model="worklog.unit" class="jira-field-control jira-field-control--spaced">
                <option value="minutes">Minutos</option>
                <option value="hours">Horas</option>
                <option value="days">Días</option>
              </select>
              <input id="worklogNote" v-model="worklog.note" placeholder="Nota" class="jira-field-control jira-field-control--spaced" />
            </JiraFieldRow>
          </template>

          <JiraFieldRow label="Subtickets">
            <input id="subticketQuantity" v-model.number="subticketQuantity" type="number" min="1" max="20" class="jira-field-control" />
          </JiraFieldRow>

          <div class="jira-issue-view__sidebar-actions">
            <button class="btn btn-primary" type="button" :disabled="isBusy" @click="saveTicket">
              {{ isSaving ? 'Guardando...' : 'Guardar' }}
            </button>
            <button class="btn btn-ghost btn--sm" type="button" :disabled="isBusy" @click="createSubtickets">Crear subtickets</button>
            <button class="btn btn-ghost btn--sm" type="button" :disabled="isBusy" @click="duplicateTicket">Duplicar</button>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, defineAsyncComponent, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ticketsService } from '../services/ticketsService';
import { useCatalogs } from '../../../shared/composables/useCatalogs';
import { useUsers } from '../../../shared/composables/useUsers';
import { useUi } from '../../../shared/composables/useUi';
import { uploadsService } from '../../../shared/services/uploadsService';
import { eventText, fmtDate } from '../../../shared/utils/format';
import IssueKeyLink from '../../../shared/components/IssueKeyLink.vue';
import JiraFieldRow from '../../../shared/components/JiraFieldRow.vue';
import ActivityFeed from '../../../shared/components/ActivityFeed.vue';
import { usePageChrome } from '../../../shared/composables/usePageChrome';
import { isRichHtmlEmpty, stripUrlsForDisplay } from '../../../shared/utils/richHtml';

const RichTextEditor = defineAsyncComponent(() => import('../../../shared/components/RichTextEditor.vue'));

const route = useRoute();
const router = useRouter();
const ui = useUi();
const { setBreadcrumbCurrent, clearBreadcrumbCurrent } = usePageChrome();
const { fetchCatalogBundle } = useCatalogs();
const { fetchUsersList } = useUsers();

const loading = ref(false);
const ticket = ref(null);
const assignableUsers = ref([]);
const commentBody = ref('');
const commentFileInput = ref(null);
/** URLs de vista previa por comentario+índice (clave distinta a cada GET /uploads/view-url). */
const resolvedImageSrc = reactive({});
const isSaving = ref(false);
const isCommenting = ref(false);
const isDuplicating = ref(false);
const isCreatingSubtickets = ref(false);
const subticketQuantity = ref(1);
const deletingCommentId = ref('');
const commentsLoaded = ref(false);
const DETAIL_ACTIVITY_LIMIT = 40;
const worklog = reactive({
  amount: null,
  unit: 'minutes',
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
  /** YYYY-MM-DD para fecha de solución (estados finales). */
  resolvedAt: '',
  priorityId: '',
  productId: '',
  ticketTypeId: '',
  areaId: '',
  requesterName: '',
  requesterPhone: '',
  assigneeId: '',
});

function extractAttachments(body) {
  const text = String(body || '');
  const matches = text.match(/https?:\/\/[^\s)]+/g) || [];
  return matches.map((rawUrl) => {
    const storedUrl = String(rawUrl || '').trim();
    const lower = storedUrl.toLowerCase();
    const isImage =
      lower.includes('/imagenes/') ||
      /\.(png|jpe?g|gif|webp|svg|bmp)(\?|#|$)/i.test(lower) ||
      /[?&](format|ext)=(png|jpg|jpeg|gif|webp|svg|bmp)/i.test(lower);
    return { storedUrl, isImage };
  });
}

const backToList = computed(() => {
  const preserved = {};
  for (const key of ['q', 'from', 'to', 'productId', 'sortBy', 'sortDir', 'view', 'page', 'limit']) {
    const value = route.query[key];
    if (value != null && String(value).trim() !== '') preserved[key] = value;
  }
  return { path: '/tickets', query: preserved };
});

async function loadCommentsIfNeeded() {
  if (commentsLoaded.value) return;
  await refreshTicketDataSoft({ includeComments: true, includeEvents: true, includeWorklogs: true });
  commentsLoaded.value = true;
}

const activityItems = computed(() => {
  const items = [];
  for (const comment of ticket.value?.comments || []) {
    items.push({
      id: `c-${comment.id}`,
      type: 'comments',
      createdAt: comment.createdAt,
      authorName: comment.author?.fullName || 'Usuario',
      authorEmail: comment.author?.email,
      html: stripUrlsForDisplay(comment.body),
      body: comment.body || 'Adjunto',
    });
  }
  for (const event of ticket.value?.events || []) {
    items.push({
      id: `e-${event.id}`,
      type: 'history',
      createdAt: event.createdAt,
      authorName: event.actor?.fullName || 'Sistema',
      body: eventText(event),
    });
  }
  for (const wl of ticket.value?.worklogs || []) {
    items.push({
      id: `w-${wl.id}`,
      type: 'worklogs',
      createdAt: wl.createdAt,
      authorName: wl.author?.fullName || 'Usuario',
      body: `Registró ${wl.minutesSpent} min${wl.note ? ` · ${wl.note}` : ''}`,
      badge: 'Tiempo',
    });
  }
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

async function resolveCommentImagePreviews(comments) {
  if (!comments?.length) return;
  const pending = [];
  const urls = [];
  for (const comment of comments) {
    extractAttachments(comment.body).forEach((att, attIdx) => {
      if (!att.isImage) return;
      const key = attachmentPreviewKey(comment, attIdx);
      if (resolvedImageSrc[key] !== undefined) return;
      pending.push({ key, storedUrl: att.storedUrl });
      urls.push(att.storedUrl);
    });
  }
  if (!urls.length) return;
  try {
    const result = await uploadsService.getViewUrls(urls);
    const map = result?.urls || {};
    pending.forEach(({ key, storedUrl }) => {
      resolvedImageSrc[key] = map[storedUrl] || '';
    });
  } catch {
    pending.forEach(({ key }) => {
      resolvedImageSrc[key] = '';
    });
  }
}
function attachmentPreviewKey(comment, attIdx) {
  return `${String(comment.id)}-${attIdx}`;
}

async function openStoredAttachment(storedUrl, mode) {
  const s = String(storedUrl || '').trim();
  if (!s) return;
  try {
    const result = await uploadsService.getViewUrl(s);
    const url = result?.url;
    if (!url) throw new Error('Respuesta inválida del servidor');
    if (mode === 'download') {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    ui.showToast(error.message || 'No se pudo abrir el adjunto.', true);
  }
}

function onAttachmentImageError(comment, attIdx) {
  resolvedImageSrc[attachmentPreviewKey(comment, attIdx)] = '';
}

const selectedStatusName = computed(
  () => catalogs.statuses.find((status) => String(status.id) === String(form.statusId))?.name || ticket.value?.status?.name || 'Sin estado',
);

const selectedStatusIsFinal = computed(() => {
  const st = catalogs.statuses.find((status) => String(status.id) === String(form.statusId));
  return Boolean(st?.isFinal);
});

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

const solutionDateLabel = computed(() => {
  const raw = ticket.value?.resolvedAt || ticket.value?.closedAt;
  if (!raw) return '—';
  return fmtDate(raw);
});

const activityCount = computed(() => {
  const events = (ticket.value?.eventCount ?? ticket.value?.events?.length) || 0;
  const comments = (ticket.value?.commentCount ?? ticket.value?.comments?.length) || 0;
  const worklogs = (ticket.value?.worklogCount ?? ticket.value?.worklogs?.length) || 0;
  return events + comments + worklogs;
});

const SERVERLESS_SAFE_UPLOAD_BYTES = 4 * 1024 * 1024;
const commentsCount = computed(() => (ticket.value?.commentCount ?? ticket.value?.comments?.length) || 0);
const eventsCount = computed(() => (ticket.value?.eventCount ?? ticket.value?.events?.length) || 0);
const totalLoggedMinutes = computed(() => Number(ticket.value?.totalLoggedMinutes || 0));
const worklogMinutes = computed(() => {
  const amount = Number(worklog.amount);
  if (Number.isNaN(amount) || amount <= 0) return 0;
  if (worklog.unit === 'days') return Math.round(amount * 1440);
  if (worklog.unit === 'hours') return Math.round(amount * 60);
  return Math.round(amount);
});

const selectedStatusCode = computed(() => {
  const st = catalogs.statuses.find((status) => String(status.id) === String(form.statusId));
  return st?.code ? String(st.code) : '';
});

const isClosedStatus = computed(() => {
  if (ticket.value?.closedAt || ticket.value?.resolvedAt) return true;
  const name = String(selectedStatusName.value || '').toLowerCase();
  const code = String(selectedStatusCode.value || '').toLowerCase();
  return name.includes('cerrad') || code.includes('closed');
});

const showWorklogs = computed(() => isClosedStatus.value);
const isBusy = computed(
  () =>
    isSaving.value ||
    isCommenting.value ||
    isDuplicating.value ||
    isCreatingSubtickets.value ||
    Boolean(deletingCommentId.value),
);
const busyMessage = computed(() => {
  if (isSaving.value) return 'Guardando cambios del ticket...';
  if (isCommenting.value) return 'Publicando comentario...';
  if (isDuplicating.value) return 'Duplicando ticket...';
  if (isCreatingSubtickets.value) return 'Creando subtickets...';
  return 'Cargando...';
});

function toIsoDateOnly(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function syncForm() {
  if (!ticket.value) return;
  form.title = ticket.value.title || '';
  form.description = ticket.value.description || '';
  form.statusId = ticket.value.statusId || '';
  form.resolvedAt = toIsoDateOnly(ticket.value.resolvedAt || ticket.value.closedAt);
  form.priorityId = ticket.value.priorityId || '';
  form.productId = ticket.value.productId || '';
  form.ticketTypeId = ticket.value.ticketTypeId || '';
  form.areaId = ticket.value.areaId || '';
  form.requesterName = ticket.value.requesterName || '';
  form.requesterPhone = ticket.value.requesterPhone || '';
  form.assigneeId = ticket.value.assigneeId == null ? '' : String(ticket.value.assigneeId);
  const label = ticket.value.key || form.title;
  setBreadcrumbCurrent(label.length > 48 ? `${label.slice(0, 48)}…` : label);
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

async function refreshTicketDataSoft(options = {}) {
  const fullSnapshot = await ticketsService.get(route.params.id, {
    includeComments: options.includeComments ?? commentsLoaded.value,
    includeWorklogs: options.includeWorklogs ?? true,
    includeEvents: options.includeEvents ?? true,
    commentsLimit: options.commentsLimit ?? DETAIL_ACTIVITY_LIMIT,
    worklogsLimit: options.worklogsLimit ?? DETAIL_ACTIVITY_LIMIT,
    eventsLimit: options.eventsLimit ?? DETAIL_ACTIVITY_LIMIT,
  });
  mergeTicketSnapshot(fullSnapshot);
  if (fullSnapshot?.comments?.length) {
    commentsLoaded.value = true;
    await resolveCommentImagePreviews(fullSnapshot.comments);
  }
}

async function loadTicket() {
  loading.value = true;
  commentsLoaded.value = false;
  try {
    const [ticketRow, catalogBundle, userList] = await Promise.all([
      ticketsService.get(route.params.id, {
        includeComments: false,
        includeWorklogs: true,
        includeEvents: false,
        worklogsLimit: DETAIL_ACTIVITY_LIMIT,
      }),
      fetchCatalogBundle(),
      fetchUsersList(),
    ]);

    Object.keys(resolvedImageSrc).forEach((k) => delete resolvedImageSrc[k]);
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
    await loadCommentsIfNeeded();
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
    const payload = {
      title: form.title,
      description: form.description,
      statusId: form.statusId,
      priorityId: form.priorityId,
      productId: form.productId,
      ticketTypeId: form.ticketTypeId,
      areaId: form.areaId || null,
      requesterName: form.requesterName || null,
      requesterPhone: form.requesterPhone || null,
      assigneeId: form.assigneeId || null,
    };
    if (selectedStatusIsFinal.value) {
      const trimmed = String(form.resolvedAt || '').trim();
      payload.resolvedAt = trimmed || undefined;
    }
    await ticketsService.update(route.params.id, payload);

    // Registrar tiempo "en el mismo guardado" cuando el ticket está cerrado y el usuario ingresa minutos.
    if (showWorklogs.value) {
      const minutes = worklogMinutes.value;
      if (minutes > 0) {
        await ticketsService.addWorklog(route.params.id, {
          minutesSpent: minutes,
          note: worklog.note || undefined,
        });
        worklog.amount = null;
        worklog.unit = 'minutes';
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

async function createSubtickets() {
  if (isBusy.value) return;
  const quantity = Math.min(20, Math.max(1, Number(subticketQuantity.value) || 1));
  isCreatingSubtickets.value = true;
  try {
    const result = await ticketsService.createSubtickets(route.params.id, {
      assigneeId: form.assigneeId || undefined,
      quantity,
    });
    const createdIds = (result?.items || []).map((item) => `#${item.id}`).join(', ');
    ui.showToast(`Subtickets creados (${result?.quantity || quantity}): ${createdIds}`, false);
    await refreshTicketDataSoft({ includeEvents: true });
  } catch (error) {
    ui.showToast(error.message || 'No se pudieron crear los subtickets.', true);
  } finally {
    isCreatingSubtickets.value = false;
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
    await refreshTicketDataSoft({ includeEvents: false });
  } catch (error) {
    // Si falla, vuelve al estado completo del servidor sin recargar toda la vista.
    const fallback = await ticketsService.get(route.params.id).catch(() => null);
    if (fallback) mergeTicketSnapshot(fallback);
    ui.showToast(error.message || 'No se pudo registrar el comentario.', true);
  } finally {
    isCommenting.value = false;
  }
}

function canDeleteComment(comment) {
  if (!comment?.id) return false;
  return !String(comment.id).startsWith('tmp-');
}

async function removeComment(comment) {
  if (isBusy.value || !canDeleteComment(comment)) return;
  const confirmed = window.confirm('¿Seguro que quieres eliminar este comentario? Esta acción no se puede deshacer.');
  if (!confirmed) return;
  deletingCommentId.value = String(comment.id);
  const previousComments = [...(ticket.value?.comments || [])];
  if (ticket.value) {
    ticket.value = {
      ...ticket.value,
      comments: previousComments.filter((item) => String(item.id) !== String(comment.id)),
    };
  }
  try {
    await ticketsService.deleteComment(route.params.id, comment.id);
    ui.showToast('Comentario eliminado.', false);
  } catch (error) {
    if (ticket.value) {
      ticket.value = {
        ...ticket.value,
        comments: previousComments,
      };
    }
    ui.showToast(error.message || 'No se pudo eliminar el comentario.', true);
  } finally {
    deletingCommentId.value = '';
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

watch(
  () => [form.statusId, catalogs.statuses.length],
  ([newId, bundleLen], prev) => {
    const oldId = prev?.[0];
    if (!newId || !bundleLen) return;
    const newSt = catalogs.statuses.find((s) => String(s.id) === String(newId));
    const oldSt = oldId
      ? catalogs.statuses.find((s) => String(s.id) === String(oldId))
      : null;
    if (newSt?.isFinal && !oldSt?.isFinal && !String(form.resolvedAt || '').trim()) {
      form.resolvedAt = new Date().toISOString().slice(0, 10);
    }
  },
);

watch(
  () => ticket.value?.comments,
  (comments) => {
    void resolveCommentImagePreviews(comments);
  },
  { deep: true },
);

onMounted(loadTicket);

watch(
  () => route.params.id,
  () => {
    clearBreadcrumbCurrent();
    loadTicket();
  },
);

watch(showWorklogs, (enabled) => {
  if (!enabled) {
    worklog.amount = null;
    worklog.unit = 'minutes';
    worklog.note = '';
  }
});
</script>
