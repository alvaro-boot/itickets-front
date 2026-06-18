<template>
  <section class="jira-page stack stack--compact">
    <header class="jira-page-header">
      <h1>Mis tareas</h1>
      <p class="jira-page-header__sub">Total {{ total }} · Pendientes {{ pendingCount }} · Hechas {{ doneCount }}</p>
    </header>

    <div class="jira-collapsible">
      <button type="button" class="jira-collapsible__toggle" @click="showCreate = !showCreate">
        Nueva tarea <span>{{ showCreate ? '▲' : '▼' }}</span>
      </button>
      <div v-if="showCreate" class="jira-collapsible__body">
      <form class="grid-2" @submit.prevent="createTask">
        <div class="field-stack" style="grid-column: 1 / -1">
          <label for="taskTitle">Titulo</label>
          <input id="taskTitle" v-model.trim="form.title" minlength="3" required />
        </div>
        <div class="field-stack">
          <label for="taskDate">Fecha</label>
          <input id="taskDate" v-model="form.workDate" type="date" required />
        </div>
        <div class="field-stack">
          <label for="taskDescription">Descripcion</label>
          <input id="taskDescription" v-model="form.description" />
        </div>
        <div style="grid-column: 1 / -1">
          <button class="btn btn-primary" type="submit" :disabled="isSubmitting || isLoading">
            {{ isSubmitting ? 'Registrando...' : 'Registrar tarea' }}
          </button>
        </div>
      </form>
      </div>
    </div>

    <div v-if="isLoading" class="panel">
      <p class="meta">Cargando tareas...</p>
    </div>

    <div class="panel">
      <DataTable variant="jira" :rows="taskRows" :columns="taskColumns" row-key="id" empty-text="No tienes tareas registradas" :initial-page-size="25">
        <template #cell-actionLabel="{ row }">
          <button class="btn btn-ghost" type="button" :disabled="togglingId === row.id" @click="toggleTask(row)">
            {{ togglingId === row.id ? 'Actualizando...' : row.actionLabel }}
          </button>
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
import { tasksService } from '../services/tasksService';
import { useUi } from '../../../shared/composables/useUi';
import DataTable from '../../../shared/components/DataTable.vue';

const ui = useUi();
const rows = ref([]);
const total = ref(0);
const page = ref(1);
const limit = ref(25);
const isLoading = ref(false);
const isSubmitting = ref(false);
const showCreate = ref(false);
const togglingId = ref(null);
const form = reactive({
  title: '',
  description: '',
  workDate: new Date().toISOString().slice(0, 10),
});

const taskColumns = [
  { key: 'title', label: 'Titulo' },
  { key: 'workDate', label: 'Fecha' },
  { key: 'statusLabel', label: 'Estado' },
  { key: 'actionLabel', label: 'Accion' },
];

const taskRows = computed(() =>
  (rows.value || []).map((task) => ({
    ...task,
    statusLabel: task.isDone ? 'Completada' : 'Pendiente',
    actionLabel: task.isDone ? 'Reabrir' : 'Completar',
  })),
);
const pendingCount = computed(() => rows.value.filter((task) => !task.isDone).length);
const doneCount = computed(() => rows.value.filter((task) => task.isDone).length);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));

async function loadTasks() {
  isLoading.value = true;
  try {
    const payload = await tasksService.mine({ page: page.value, limit: limit.value });
    rows.value = payload?.items || [];
    total.value = payload?.total || rows.value.length;
  } catch (error) {
    ui.showToast(error.message || 'No se pudieron cargar tus tareas.', true);
  } finally {
    isLoading.value = false;
  }
}

async function createTask() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    await tasksService.create({
      title: form.title,
      description: form.description || undefined,
      workDate: form.workDate,
    });
    ui.showToast('Tarea registrada', false);
    form.title = '';
    form.description = '';
    await loadTasks();
  } catch (error) {
    ui.showToast(error.message || 'No se pudo registrar la tarea.', true);
  } finally {
    isSubmitting.value = false;
  }
}

async function toggleTask(task) {
  togglingId.value = task.id;
  const nextDone = !task.isDone;
  task.isDone = nextDone;
  try {
    await tasksService.update(task.id, { isDone: nextDone });
  } catch (error) {
    task.isDone = !nextDone;
    ui.showToast(error.message || 'No se pudo actualizar la tarea.', true);
  } finally {
    togglingId.value = null;
  }
}

function prevPage() {
  if (page.value <= 1) return;
  page.value -= 1;
  loadTasks();
}

function nextPage() {
  if (page.value >= totalPages.value) return;
  page.value += 1;
  loadTasks();
}

onMounted(loadTasks);
</script>
