<template>
  <section class="jira-page stack stack--compact">
    <div v-if="loading" class="panel"><p class="meta">Cargando ticket...</p></div>

    <template v-else-if="ticket">
      <div v-if="isBusy" class="ticket-loading-hint" role="status" aria-live="polite">
        <span class="ticket-loading-hint__dot"></span>
        <span>{{ busyMessage }}</span>
      </div>

      <div class="jira-detail-layout">
        <div class="jira-detail-main">
          <article class="panel ticket-panel">
            <div style="display:flex;align-items:center;gap:0.65rem;margin-bottom:0.65rem">
              <IssueKeyLink :ticket="ticket" />
              <RouterLink class="btn btn-ghost btn--sm" :to="backToList">← Lista</RouterLink>
            </div>
            <div class="field-stack">
              <label for="title">Resumen</label>
              <input id="title" v-model.trim="form.title" required minlength="3" />
            </div>
            <div class="field-stack" style="margin-top:0.75rem">
              <label for="description">Descripción</label>
              <RichTextEditor id="description" v-model="form.description" />
            </div>
          </article>

          <article class="panel ticket-panel" style="margin-top:0.75rem">
            <h2 style="margin:0 0 0.75rem;font-size:1rem;font-weight:600">Actividad</h2>
            <form class="ticket-inline-form comment-composer" @submit.prevent="addComment">
              <div class="field-stack">
                <RichTextEditor id="body" v-model="commentBody" compact placeholder="Añadir un comentario..." :disabled="isBusy" />
              </div>
              <div class="actions-row" style="justify-content:space-between;margin-top:0.5rem">
                <input ref="commentFileInput" type="file" :disabled="isBusy" />
                <button class="btn btn-ghost btn--sm" type="button" :disabled="isBusy" @click="uploadAttachment">Adjuntar</button>
              </div>
              <button class="btn btn-primary btn--sm" type="submit" :disabled="isBusy" style="margin-top:0.5rem">
                {{ isCommenting ? 'Publicando...' : 'Comentar' }}
              </button>
            </form>

            <ActivityFeed :items="activityItems" />

            <div v-for="comment in ticket.comments || []" :key="`att-${comment.id}`" class="stack" style="margin-top:0.5rem">
              <div v-if="extractAttachments(comment.body).length" class="stack">
                <article
                  v-for="(attachment, attIdx) in extractAttachments(comment.body)"
                  :key="`${String(comment.id)}-${attIdx}`"
                  class="panel"
                  style="padding:0.6rem"
                >
                  <template v-if="attachment.isImage">
                    <img
                      v-if="resolvedImageSrc[attachmentPreviewKey(comment, attIdx)]"
                      :src="resolvedImageSrc[attachmentPreviewKey(comment, attIdx)]"
                      alt="Imagen adjunta"
                      style="max-width:100%;border-radius:6px;margin-bottom:0.5rem"
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
          </article>
        </div>

        <MetaPanel title="Detalles">
          <div class="jira-meta-row">
            <label for="statusId">Estado</label>
            <select id="statusId" v-model="form.statusId">
              <option v-for="status in catalogs.statuses" :key="status.id" :value="status.id">{{ status.name }}</option>
            </select>
          </div>
          <div v-if="selectedStatusIsFinal" class="jira-meta-row">
            <label for="resolvedAt">Fecha de solución</label>
            <input id="resolvedAt" v-model="form.resolvedAt" type="date" />
          </div>
          <div class="jira-meta-row">
            <label for="priorityId">Prioridad</label>
            <select id="priorityId" v-model="form.priorityId">
              <option v-for="priority in catalogs.priorities" :key="priority.id" :value="priority.id">{{ priority.name }}</option>
            </select>
          </div>
          <div class="jira-meta-row">
            <label for="assigneeId">Asignado</label>
            <select id="assigneeId" v-model="form.assigneeId">
              <option value="">Sin asignar</option>
              <option v-for="user in assignableUsers" :key="user.id" :value="String(user.id)">{{ user.fullName }}</option>
            </select>
          </div>
          <div class="jira-meta-row">
            <label for="productId">Producto</label>
            <select id="productId" v-model="form.productId">
              <option v-for="product in catalogs.products" :key="product.id" :value="product.id">{{ product.name }}</option>
            </select>
          </div>
          <div class="jira-meta-row">
            <label for="ticketTypeId">Tipo</label>
            <select id="ticketTypeId" v-model="form.ticketTypeId">
              <option v-for="type in catalogs.types" :key="type.id" :value="type.id">{{ type.name }}</option>
            </select>
          </div>
          <div class="jira-meta-row">
            <label for="areaId">Área</label>
            <select id="areaId" v-model="form.areaId">
              <option value="">Sin área</option>
              <option v-for="area in catalogs.areas" :key="area.id" :value="area.id">{{ area.name }}</option>
            </select>
          </div>
          <div class="jira-meta-row">
            <label for="requesterName">Solicitante</label>
            <input id="requesterName" v-model.trim="form.requesterName" />
          </div>
          <div class="jira-meta-row">
            <label for="requesterPhone">Teléfono</label>
            <input id="requesterPhone" v-model.trim="form.requesterPhone" />
          </div>
          <div class="jira-meta-row">
            <span class="meta">Creado</span>
            <span>{{ fmtDate(ticket.createdAt) }}</span>
          </div>
          <div class="jira-meta-row">
            <span class="meta">Actualizado</span>
            <span>{{ fmtDate(ticket.updatedAt) }}</span>
          </div>
          <div class="jira-meta-row">
            <span class="meta">Tiempo registrado</span>
            <span>{{ ticket.totalLoggedMinutes || 0 }} min</span>
          </div>
          <div v-if="showWorklogs" class="jira-meta-row">
            <label for="worklogAmount">Registrar tiempo</label>
            <input id="worklogAmount" v-model.number="worklog.amount" type="number" min="1" />
            <select id="worklogUnit" v-model="worklog.unit" style="margin-top:0.35rem">
              <option value="minutes">Minutos</option>
              <option value="hours">Horas</option>
              <option value="days">Días</option>
            </select>
            <input id="worklogNote" v-model="worklog.note" placeholder="Nota" style="margin-top:0.35rem" />
          </div>
          <div class="jira-meta-row">
            <label for="subticketQuantity">Subtickets</label>
            <input id="subticketQuantity" v-model.number="subticketQuantity" type="number" min="1" max="20" />
          </div>
          <div class="actions-row" style="flex-direction:column;gap:0.35rem;margin-top:0.5rem">
            <button class="btn btn-primary" type="button" :disabled="isBusy" @click="saveTicket">
              {{ isSaving ? 'Guardando...' : 'Guardar' }}
            </button>
            <button class="btn btn-ghost btn--sm" type="button" :disabled="isBusy" @click="createSubtickets">Crear subtickets</button>
            <button class="btn btn-ghost btn--sm" type="button" :disabled="isBusy" @click="duplicateTicket">Duplicar</button>
          </div>
        </MetaPanel>
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
import MetaPanel from '../../../shared/components/MetaPanel.vue';
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
