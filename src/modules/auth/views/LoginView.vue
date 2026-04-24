<template>
  <div class="login-page">
    <header class="login-page__header">
      <div class="brand brand--login" aria-label="IT-Sistemas">
        <img src="/images/logo.png" alt="IT-Sistemas" class="brand-logo-img brand-logo-img--login" width="360" height="96" decoding="async" />
      </div>
      <div class="login-page__header-copy">
        <strong>Service Control Hub</strong>
        <span>Operación, seguimiento y atención desde un solo lugar</span>
      </div>
    </header>

    <main class="login-page__main">
      <section class="login-hero-card">
        <p class="spotlight-card__eyebrow">Acceso seguro</p>
        <h1 class="login-hero-card__title">Gestiona tickets, incidentes y reportes con una interfaz clara y profesional.</h1>
        <p class="login-hero-card__copy">
          Centraliza la operación del equipo, mejora la asignación de casos y mantén trazabilidad completa sobre cada solicitud.
        </p>

        <div class="login-hero-card__stats">
          <article class="login-mini-stat">
            <strong>Tickets</strong>
            <span>Seguimiento de casos y prioridades</span>
          </article>
          <article class="login-mini-stat">
            <strong>Incidentes</strong>
            <span>Visibilidad rápida de eventos abiertos</span>
          </article>
          <article class="login-mini-stat">
            <strong>Tareas</strong>
            <span>Trabajo diario organizado por usuario</span>
          </article>
          <article class="login-mini-stat">
            <strong>Reportes</strong>
            <span>Métricas de cierre y productividad</span>
          </article>
        </div>
      </section>

      <section class="login-form-card">
        <div class="login-form-card__header">
          <p class="spotlight-card__eyebrow">Iniciar sesión</p>
          <h2>Bienvenido de vuelta</h2>
          <p>Ingresa con tu cuenta corporativa para acceder al panel principal.</p>
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

          <div class="actions-row">
            <button class="btn btn-primary login-submit" type="submit" :disabled="submitting">
              {{ submitting ? 'Ingresando...' : 'Entrar al workspace' }}
            </button>
          </div>
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

          <div class="actions-row">
            <button class="btn btn-primary login-submit" type="submit" :disabled="submitting || !selectedCompanyId">
              {{ submitting ? 'Abriendo espacio...' : 'Continuar' }}
            </button>
          </div>
        </form>

        <div class="spotlight-card__meta">
          <span class="spotlight-pill">Sesión segura</span>
          <span class="spotlight-pill">Diseño modular</span>
          <span class="spotlight-pill">Vista centralizada</span>
        </div>
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
