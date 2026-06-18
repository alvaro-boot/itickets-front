<template>
  <div class="login-page">
    <main class="login-page__main">
      <section class="login-form-card">
        <img src="/images/logo.png" alt="IT Service Desk" class="login-form-card__logo" width="200" height="60" decoding="async" />
        <div class="login-form-card__header">
          <h2>Iniciar sesión</h2>
          <p>Accede con tu cuenta corporativa al Service Desk.</p>
        </div>

        <form v-if="!auth.state.pendingCompanySelection" class="field-stack" @submit.prevent="submit">
          <div class="field-stack">
            <label for="email">Correo corporativo</label>
            <input id="email" v-model.trim="form.email" type="email" autocomplete="username" placeholder="nombre@empresa.com" required />
          </div>
          <div class="field-stack">
            <label for="password">Contraseña</label>
            <div class="password-wrap password-wrap--stacked">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Tu contraseña"
                required
              />
              <button class="btn btn-ghost password-toggle" type="button" @click="showPassword = !showPassword">
                {{ showPassword ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
          </div>
          <p class="login-feedback" :class="{ 'login-feedback--error': feedback && !submitting }">
            {{ feedback || 'Usa tus credenciales para continuar.' }}
          </p>
          <button class="btn btn-primary login-submit" type="submit" :disabled="submitting">
            {{ submitting ? 'Ingresando...' : 'Continuar' }}
          </button>
        </form>

        <form v-else class="field-stack" @submit.prevent="submitCompanySelection">
          <div class="field-stack">
            <label for="company">Empresa activa</label>
            <select id="company" v-model="selectedCompanyId" required>
              <option v-for="company in auth.state.pendingCompanySelection.companies" :key="company.id" :value="company.id">
                {{ company.name }} ({{ company.code }})
              </option>
            </select>
          </div>
          <p class="login-feedback" :class="{ 'login-feedback--error': feedback && !submitting }">
            {{ feedback || 'Selecciona la empresa para iniciar tu sesión.' }}
          </p>
          <button class="btn btn-primary login-submit" type="submit" :disabled="submitting || !selectedCompanyId">
            {{ submitting ? 'Abriendo espacio...' : 'Continuar' }}
          </button>
        </form>
      </section>
    </main>
  </div>
  <ToastHost />
  <GlobalLoader />
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import ToastHost from '../../../shared/components/ToastHost.vue';
import GlobalLoader from '../../../shared/components/GlobalLoader.vue';
import { useAuth } from '../../../shared/composables/useAuth';
import { useUi } from '../../../shared/composables/useUi';

const router = useRouter();
const auth = useAuth();
const ui = useUi();

const showPassword = ref(false);
const submitting = ref(false);
const feedback = ref('');
const selectedCompanyId = ref('');
const form = reactive({
  email: '',
  password: '',
});

async function submit() {
  if (!form.email || !form.password) {
    feedback.value = 'Completa correo y contraseña para continuar.';
    return;
  }

  submitting.value = true;
  feedback.value = 'Validando credenciales...';

  try {
    const response = await auth.login(form);
    if (response?.requiresCompanySelection) {
      selectedCompanyId.value =
        response.companies?.find((item) => item.isDefault)?.id || response.companies?.[0]?.id || '';
      feedback.value = 'Selecciona la empresa con la que vas a trabajar.';
      return;
    }
    feedback.value = 'Acceso concedido. Redirigiendo...';
    router.push('/tickets');
  } catch (error) {
    feedback.value = error.message || 'No se pudo iniciar sesión.';
    ui.showToast(feedback.value, true);
  } finally {
    submitting.value = false;
  }
}

async function submitCompanySelection() {
  if (!selectedCompanyId.value) {
    feedback.value = 'Selecciona una empresa para continuar.';
    return;
  }
  submitting.value = true;
  feedback.value = 'Cargando contexto de empresa...';
  try {
    await auth.selectCompany(selectedCompanyId.value);
    feedback.value = 'Acceso concedido. Redirigiendo...';
    router.push('/tickets');
  } catch (error) {
    feedback.value = error.message || 'No se pudo seleccionar la empresa.';
    ui.showToast(feedback.value, true);
  } finally {
    submitting.value = false;
  }
}

watch(
  () => auth.state.pendingCompanySelection,
  (pending) => {
    if (!pending) {
      selectedCompanyId.value = '';
    }
  },
);
</script>
