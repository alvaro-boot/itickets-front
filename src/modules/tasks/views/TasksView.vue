<template>
  <section class="stack">
    <div class="toolbar">
      <h2 style="margin: 0; font-size: 1.25rem">Mis tareas diarias</h2>
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
          <button class="btn btn-primary" type="submit">Registrar tarea</button>
        </div>
      </form>
    </div>

    <DataTable :rows="taskRows" :columns="taskColumns" row-key="id" empty-text="No tienes tareas registradas" :initial-page-size="10">
      <template #cell-actionLabel="{ row }">
        <button class="btn btn-ghost" type="button" @click="toggleTask(row)">
          {{ row.actionLabel }}
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
  try {
    rows.value = await tasksService.mine();
  } catch (error) {
    ui.showToast(error.message || 'No se pudieron cargar tus tareas.', true);
  }
}

async function createTask() {
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
  }
}

async function toggleTask(task) {
  try {
    await tasksService.update(task.id, { isDone: !task.isDone });
    await loadTasks();
  } catch (error) {
    ui.showToast(error.message || 'No se pudo actualizar la tarea.', true);
  }
}

onMounted(loadTasks);
</script>
