<template>
  <section class="stack">
    <div class="page-header">
      <div class="page-title">
        <h2>Mis tareas diarias</h2>
        <p>Organiza el trabajo personal, registra pendientes y marca avances rápido.</p>
      </div>
    </div>

    <div class="panel">
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

    <div v-if="isLoading" class="panel">
      <p class="meta">Cargando tareas...</p>
    </div>

    <DataTable :rows="taskRows" :columns="taskColumns" row-key="id" empty-text="No tienes tareas registradas" :initial-page-size="10">
      <template #cell-actionLabel="{ row }">
        <button class="btn btn-ghost" type="button" :disabled="togglingId === row.id" @click="toggleTask(row)">
          {{ togglingId === row.id ? 'Actualizando...' : row.actionLabel }}
        </button>
      </template>
    </DataTable>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { tasksService } from '../services/tasksService';
import { useUi } from '../../../shared/composables/useUi';
import DataTable from '../../../shared/components/DataTable.vue';

const ui = useUi();
const rows = ref([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
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

async function loadTasks() {
  isLoading.value = true;
  try {
    rows.value = await tasksService.mine();
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
  try {
    await tasksService.update(task.id, { isDone: !task.isDone });
    await loadTasks();
  } catch (error) {
    ui.showToast(error.message || 'No se pudo actualizar la tarea.', true);
  } finally {
    togglingId.value = null;
  }
}

onMounted(loadTasks);
</script>
