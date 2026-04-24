<template>
  <div class="app-shell shell-frame">
    <header class="topbar">
      <div class="topbar-brand-block">
        <RouterLink to="/tickets" class="brand">
          <span class="brand-dot"></span>
          <span>ITickets</span>
        </RouterLink>
        <div class="topbar-brand-copy">
          <strong>Operations Desk</strong>
          <span>Control centralizado de soporte, seguimiento y asignación</span>
        </div>
      </div>
      <button class="menu-toggle" type="button" aria-label="Abrir menú" @click="toggleSidebar">☰</button>
      <nav class="nav-actions" aria-label="Principal">
        <div
          v-if="(auth.state.profile?.companies?.length || 0) > 1"
          class="field-stack"
          style="min-width: 220px; margin: 0"
        >
          <label for="active-company" style="font-size: 0.72rem; margin-bottom: 0.15rem">Empresa activa</label>
          <select
            id="active-company"
            :value="auth.state.profile?.activeCompanyId || auth.state.profile?.companyId || ''"
            @change="handleSwitchCompany"
          >
            <option v-for="company in auth.state.profile?.companies || []" :key="company.id" :value="company.id">
              {{ company.name }}
            </option>
          </select>
        </div>
        <div class="nav-user-card">
          <div class="nav-user-card__copy">
            <strong>{{ auth.state.profile?.fullName || 'Sesion activa' }}</strong>
            <span>{{ auth.state.profile?.email || 'Usuario autenticado' }}</span>
          </div>
          <div class="nav-user-card__avatar">
            {{ initials }}
          </div>
        </div>
        <button type="button" class="btn btn-ghost" @click="handleLogout">Salir</button>
      </nav>
    </header>

    <div class="layout shell-layout">
      <aside class="sidebar" :hidden="false">
        <h2>Navegación</h2>
        <p class="meta">Accesos rápidos del sistema</p>
        <nav class="menu" aria-label="Secciones">
          <RouterLink
            v-for="item in visibleItems"
            :key="item.to"
            :to="item.to"
            :class="{ active: route.path === item.to || route.path.startsWith(`${item.to}/`) }"
            @click="closeSidebar"
          >
            <span>{{ item.label }}</span>
            <span>›</span>
          </RouterLink>
        </nav>
      </aside>

      <main class="content content-shell">
        <section class="hero page-hero">
          <div class="actions-row" style="justify-content: space-between; align-items: flex-start; width: 100%">
            <div>
              <h1>{{ route.meta.title || 'Panel' }}</h1>
              <p>{{ route.meta.subtitle || 'Gestion central de tickets y operaciones.' }}</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="handleGoBack">Atrás</button>
          </div>
        </section>
        <section class="content-scroll">
          <RouterView />
        </section>
      </main>
    </div>
  </div>

  <div
    class="sidebar-backdrop"
    :hidden="!ui.state.sidebarOpen"
    @click="closeSidebar"
  ></div>
  <ToastHost />
  <GlobalLoader />
</template>

<script setup>
import { computed, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import ToastHost from '../../shared/components/ToastHost.vue';
import GlobalLoader from '../../shared/components/GlobalLoader.vue';
import { useAuth } from '../../shared/composables/useAuth';
import { useUi } from '../../shared/composables/useUi';

const auth = useAuth();
const ui = useUi();
const route = useRoute();
const router = useRouter();

const navigation = [
  { to: '/tickets', label: 'Tickets', key: 'tickets' },
  { to: '/tickets/new', label: 'Nuevo ticket', key: 'ticket-new' },
  { to: '/incidents', label: 'Incidentes', key: 'incidents' },
  { to: '/tasks', label: 'Mis tareas', key: 'tasks' },
  { to: '/profile', label: 'Mi perfil', key: 'profile' },
  { to: '/catalogs', label: 'Catalogos', key: 'catalogs' },
  { to: '/admin', label: 'Admin Global', key: 'admin' },
  { to: '/reports', label: 'Reportes', key: 'reports' },
];

const visibleItems = computed(() => {
  const profile = auth.state.profile;
  return navigation.filter((item) => {
    if (!profile) return true;
    if (item.key === 'admin') return profile.permissions?.includes('companies.manage');
    if (item.key === 'tickets' || item.key === 'ticket-new') return profile.enabledModules?.includes('tickets');
    if (item.key === 'incidents') return profile.enabledModules?.includes('incidents');
    if (item.key === 'tasks') return profile.enabledModules?.includes('tasks');
    if (item.key === 'reports') return profile.enabledModules?.includes('tickets');
    if (item.key === 'catalogs') {
      return profile.permissions?.includes('catalogs.manage') || profile.enabledModules?.includes('tickets');
    }
    return true;
  });
});

const initials = computed(() => {
  const source = auth.state.profile?.fullName || auth.state.profile?.email || 'IT';
  return String(source)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
});

function closeSidebar() {
  ui.setSidebarOpen(false);
  document.body.classList.remove('sidebar-open');
}

function toggleSidebar() {
  const nextValue = !ui.state.sidebarOpen;
  ui.setSidebarOpen(nextValue);
  document.body.classList.toggle('sidebar-open', nextValue);
}

function handleLogout() {
  auth.logout();
  router.push('/login');
}

function handleGoBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }
  router.push('/tickets');
}

async function handleSwitchCompany(event) {
  const companyId = String(event.target?.value || '');
  const currentCompanyId = auth.state.profile?.activeCompanyId || auth.state.profile?.companyId || '';
  if (!companyId || companyId === currentCompanyId) return;
  try {
    await auth.switchCompany(companyId);
    ui.showToast('Empresa activa actualizada.');
  } catch (error) {
    ui.showToast(error.message || 'No se pudo cambiar de empresa.', true);
  }
}

watch(
  () => route.fullPath,
  () => {
    closeSidebar();
  },
);
</script>
