<template>
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
          <button class="btn btn-primary" type="submit">Guardar datos</button>
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
          <button class="btn btn-primary" type="submit">Cambiar contraseña</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive } from 'vue';
import { profileService } from '../services/profileService';
import { useAuth } from '../../../shared/composables/useAuth';
import { useUi } from '../../../shared/composables/useUi';

const auth = useAuth();
const ui = useUi();

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
  try {
    const me = await profileService.me();
    profileForm.fullName = me.fullName || '';
    profileForm.email = me.email || '';
    profileForm.phone = me.phone || '';
  } catch (error) {
    ui.showToast(error.message || 'No se pudo cargar tu perfil.', true);
  }
}

async function saveProfile() {
  try {
    await profileService.updateMyProfile(profileForm);
    await auth.refreshProfile();
    ui.showToast('Perfil actualizado', false);
  } catch (error) {
    ui.showToast(error.message || 'No se pudo actualizar el perfil.', true);
  }
}

async function changePassword() {
  try {
    await profileService.changeMyPassword(passwordForm);
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    ui.showToast('Contraseña actualizada', false);
  } catch (error) {
    ui.showToast(error.message || 'No se pudo cambiar la contraseña.', true);
  }
}

onMounted(loadProfile);
</script>
