<template>
  <section class="stack">
    <div class="page-header">
      <div class="page-title">
        <h2>Mi perfil</h2>
        <p>Mantén actualizados tus datos y protege tu acceso con cambios de contraseña.</p>
      </div>
    </div>

    <div class="stats-grid">
      <article class="stat-card">
        <p class="stat-card__label">Nombre</p>
        <p class="stat-card__value" style="font-size: 1.1rem">{{ profileForm.fullName || '—' }}</p>
        <p class="stat-card__hint">Identidad visible en el sistema</p>
      </article>
      <article class="stat-card">
        <p class="stat-card__label">Correo</p>
        <p class="stat-card__value" style="font-size: 1.1rem">{{ profileForm.email || '—' }}</p>
        <p class="stat-card__hint">Cuenta principal de acceso</p>
      </article>
      <article class="stat-card">
        <p class="stat-card__label">Teléfono</p>
        <p class="stat-card__value" style="font-size: 1.1rem">{{ profileForm.phone || '—' }}</p>
        <p class="stat-card__hint">Canal de contacto operativo</p>
      </article>
    </div>

    <div v-if="isLoading" class="panel">
      <p class="meta">Cargando perfil...</p>
    </div>

    <section class="grid-2">
    <div class="panel">
      <h3 style="margin-top: 0">Actualizar información</h3>
      <form class="field-stack" @submit.prevent="saveProfile">
        <label>Nombre</label>
        <input v-model.trim="profileForm.fullName" required minlength="2" />
        <label>Correo</label>
        <input v-model.trim="profileForm.email" type="email" required />
        <label>Telefono</label>
        <input v-model.trim="profileForm.phone" type="tel" required minlength="7" />
        <div style="margin-top: 0.7rem">
          <button class="btn btn-primary" type="submit" :disabled="isSavingProfile || isLoading">
            {{ isSavingProfile ? 'Guardando...' : 'Guardar datos' }}
          </button>
        </div>
      </form>
    </div>

    <div class="panel">
      <h3 style="margin-top: 0">Cambiar contraseña</h3>
      <form class="field-stack" @submit.prevent="changePassword">
        <label>Contraseña actual</label>
        <input v-model="passwordForm.currentPassword" type="password" minlength="6" required />
        <label>Nueva contraseña</label>
        <input v-model="passwordForm.newPassword" type="password" minlength="6" required />
        <div style="margin-top: 0.7rem">
          <button class="btn btn-primary" type="submit" :disabled="isSavingPassword || isLoading">
            {{ isSavingPassword ? 'Actualizando...' : 'Cambiar contraseña' }}
          </button>
        </div>
      </form>
    </div>
    </section>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { profileService } from '../services/profileService';
import { useAuth } from '../../../shared/composables/useAuth';
import { useUi } from '../../../shared/composables/useUi';

const auth = useAuth();
const ui = useUi();
const isLoading = ref(false);
const isSavingProfile = ref(false);
const isSavingPassword = ref(false);

const profileForm = reactive({
  fullName: '',
  email: '',
  phone: '',
});

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
});

async function loadProfile() {
  isLoading.value = true;
  try {
    const me = await profileService.me();
    profileForm.fullName = me.fullName || '';
    profileForm.email = me.email || '';
    profileForm.phone = me.phone || '';
  } catch (error) {
    ui.showToast(error.message || 'No se pudo cargar tu perfil.', true);
  } finally {
    isLoading.value = false;
  }
}

async function saveProfile() {
  if (isSavingProfile.value) return;
  isSavingProfile.value = true;
  try {
    await profileService.updateMyProfile(profileForm);
    await auth.refreshProfile();
    ui.showToast('Perfil actualizado', false);
  } catch (error) {
    ui.showToast(error.message || 'No se pudo actualizar el perfil.', true);
  } finally {
    isSavingProfile.value = false;
  }
}

async function changePassword() {
  if (isSavingPassword.value) return;
  isSavingPassword.value = true;
  try {
    await profileService.changeMyPassword(passwordForm);
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    ui.showToast('Contraseña actualizada', false);
  } catch (error) {
    ui.showToast(error.message || 'No se pudo cambiar la contraseña.', true);
  } finally {
    isSavingPassword.value = false;
  }
}

onMounted(loadProfile);
</script>
