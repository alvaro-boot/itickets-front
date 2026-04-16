<template>
  <section class="stack">
    <div class="page-header">
      <div class="page-title">
        <h2>Administración global</h2>
        <p>Gestiona empresas, usuarios y módulos con feedback inmediato de cada cambio.</p>
      </div>
    </div>

    <div v-if="isLoading" class="panel">
      <p class="meta">Cargando administración...</p>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3 style="margin-top: 0">Crear empresa</h3>
        <form class="field-stack" @submit.prevent="createCompany">
          <label>Nombre</label>
          <input v-model.trim="companyForm.name" required minlength="2" />
          <label>Codigo</label>
          <input v-model.trim="companyForm.code" required minlength="2" />
          <div style="margin-top: 0.7rem">
            <button class="btn btn-primary" type="submit" :disabled="isCreatingCompany || isLoading">
              {{ isCreatingCompany ? 'Creando...' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>

      <div class="panel">
        <h3 style="margin-top: 0">Crear usuario de empresa</h3>
        <form class="field-stack" @submit.prevent="createUser">
          <label>Empresa</label>
          <select v-model="userForm.companyId">
            <option v-for="company in companies" :key="company.id" :value="company.id">
              {{ company.name }} ({{ company.code }})
            </option>
          </select>
          <label>Nombre</label>
          <input v-model.trim="userForm.fullName" required />
          <label>Correo</label>
          <input v-model.trim="userForm.email" type="email" required />
          <label>Telefono</label>
          <input v-model.trim="userForm.phone" type="tel" required minlength="7" />
          <label>Contraseña</label>
          <input v-model="userForm.password" type="password" minlength="6" required />
          <label>Rol</label>
          <select v-model="userForm.roleCode">
            <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
            <option value="AUX">AUX</option>
          </select>
          <div style="margin-top: 0.7rem">
            <button class="btn btn-primary" type="submit" :disabled="isCreatingUser || isLoading">
              {{ isCreatingUser ? 'Creando...' : 'Crear usuario' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="panel">
      <h3 style="margin-top: 0">Empresas y módulos</h3>
      <div class="stack">
        <div v-for="row in companyRows" :key="row.company.id" class="panel">
          <strong>{{ row.company.name }}</strong>
          <div class="actions-row" style="margin-top: 0.5rem">
            <label
              v-for="module in row.modules"
              :key="`${row.company.id}-${module.moduleCode}`"
              style="display: inline-flex; gap: 0.35rem"
            >
              <input
                type="checkbox"
                :checked="module.isEnabled"
                :disabled="updatingCompanyId === row.company.id"
                @change="toggleModule(row.company.id, row.modules, module.moduleCode, $event.target.checked)"
              />
              {{ module.moduleCode }}
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <h3 style="margin-top: 0">Permisos disponibles</h3>
      <p class="meta">{{ permissions.map((permission) => permission.code).join(' · ') }}</p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { adminService } from '../services/adminService';
import { useUi } from '../../../shared/composables/useUi';
import { useUsers } from '../../../shared/composables/useUsers';

const ui = useUi();
const { invalidateUsersCache } = useUsers();

const companies = ref([]);
const permissions = ref([]);
const companyRows = ref([]);
const isLoading = ref(false);
const isCreatingCompany = ref(false);
const isCreatingUser = ref(false);
const updatingCompanyId = ref(null);

const companyForm = ref({
  name: '',
  code: '',
});

const userForm = ref({
  companyId: '',
  fullName: '',
  email: '',
  phone: '',
  password: '',
  roleCode: 'COMPANY_ADMIN',
});

async function loadAdmin() {
  isLoading.value = true;
  try {
    const [companyList, permissionList] = await Promise.all([adminService.companies(), adminService.permissions()]);
    companies.value = companyList || [];
    permissions.value = permissionList || [];
    userForm.value.companyId = companies.value[0]?.id || '';
    companyRows.value = await Promise.all(
      companies.value.map(async (company) => ({
        company,
        modules: await adminService.companyModules(company.id),
      })),
    );
  } catch (error) {
    ui.showToast(error.message || 'No se pudo cargar administración global.', true);
  } finally {
    isLoading.value = false;
  }
}

async function toggleModule(companyId, modules, changedCode, checked) {
  updatingCompanyId.value = companyId;
  const enabledModuleCodes = modules
    .filter((module) => (module.moduleCode === changedCode ? checked : module.isEnabled))
    .map((module) => module.moduleCode);

  try {
    await adminService.setCompanyModules(companyId, { enabledModuleCodes });
    ui.showToast('Módulos actualizados', false);
    await loadAdmin();
  } catch (error) {
    ui.showToast(error.message || 'No se pudieron actualizar los módulos.', true);
  } finally {
    updatingCompanyId.value = null;
  }
}

async function createCompany() {
  if (isCreatingCompany.value) return;
  isCreatingCompany.value = true;
  try {
    await adminService.createCompany(companyForm.value);
    companyForm.value = { name: '', code: '' };
    ui.showToast('Empresa creada', false);
    await loadAdmin();
  } catch (error) {
    ui.showToast(error.message || 'No se pudo crear la empresa.', true);
  } finally {
    isCreatingCompany.value = false;
  }
}

async function createUser() {
  if (isCreatingUser.value) return;
  isCreatingUser.value = true;
  try {
    await adminService.createUser(userForm.value);
    invalidateUsersCache();
    ui.showToast('Usuario creado', false);
    userForm.value = {
      companyId: companies.value[0]?.id || '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      roleCode: 'COMPANY_ADMIN',
    };
  } catch (error) {
    ui.showToast(error.message || 'No se pudo crear el usuario.', true);
  } finally {
    isCreatingUser.value = false;
  }
}

onMounted(loadAdmin);
</script>
