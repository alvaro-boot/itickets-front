<template>
  <div class="app-shell shell-frame app-shell--desk">
    <header class="topbar topbar--dense">
      <div class="topbar-brand-block">
        <RouterLink to="/tickets" class="brand brand--shell" aria-label="IT Service Desk — inicio">
          <img src="/images/icono.png" alt="" class="brand-icon brand-icon--topbar" width="32" height="32" decoding="async" />
        </RouterLink>
        <div class="topbar-brand-copy">
          <strong class="topbar-brand-title">Service Desk</strong>
          <span class="topbar-brand-sub">Gestión de tickets e incidentes</span>
        </div>
      </div>
      <button class="menu-toggle" type="button" aria-label="Abrir menú" @click="toggleSidebar">☰</button>
      <nav class="nav-actions nav-actions--dense" aria-label="Principal">
        <select
          v-if="(auth.state.profile?.companies?.length || 0) > 1"
          id="active-company"
          class="topbar-company-select"
          :value="auth.state.profile?.activeCompanyId || auth.state.profile?.companyId || ''"
          @change="handleSwitchCompany"
        >
          <option v-for="company in auth.state.profile?.companies || []" :key="company.id" :value="company.id">
            {{ company.name }}
          </option>
        </select>
        <span class="topbar-user">{{ auth.state.profile?.fullName || 'Sesión' }}</span>
        <div class="nav-user-card__avatar nav-user-card__avatar--dense">{{ initials }}</div>
        <button type="button" class="btn btn-ghost btn--sm" @click="handleLogout">Salir</button>
      </nav>
    </header>

    <div class="layout shell-layout">
      <aside class="sidebar sidebar--dense" :hidden="false">
        <RouterLink to="/tickets" class="sidebar-brand sidebar-brand--dense" aria-label="Inicio" @click="closeSidebar">
          <img src="/images/icono.png" alt="" class="brand-icon brand-icon--sidebar" width="32" height="32" decoding="async" />
        </RouterLink>
        <h2>Menú</h2>
        <nav class="menu menu--dense" aria-label="Secciones">
          <RouterLink
            v-for="item in visibleItems"
            :key="item.to"
            :to="item.to"
            :class="{ active: route.path === item.to || route.path.startsWith(`${item.to}/`) }"
            @click="closeSidebar"
          >
            <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>
      </aside>

      <main class="content content-shell content-shell--dense">
        <section class="content-scroll">
          <RouterView v-slot="{ Component, route: childRoute }">
            <KeepAlive :include="['tickets']">
              <component :is="Component" :key="childRoute.name === 'tickets' ? 'tickets' : childRoute.fullPath" />
            </KeepAlive>
          </RouterView>
        </section>
      </main>
    </div>
  </div>

  <div class="sidebar-backdrop" :hidden="!ui.state.sidebarOpen" @click="closeSidebar"></div>
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
  { to: '/tickets', label: 'Tickets', key: 'tickets', icon: 'TK' },
  { to: '/tickets/new', label: 'Nuevo ticket', key: 'ticket-new', icon: '+' },
  { to: '/incidents', label: 'Incidentes', key: 'incidents', icon: 'IN' },
  { to: '/tasks', label: 'Mis tareas', key: 'tasks', icon: '✓' },
  { to: '/profile', label: 'Mi perfil', key: 'profile', icon: 'PF' },
  { to: '/catalogs', label: 'Catálogos', key: 'catalogs', icon: 'CT' },
  { to: '/admin', label: 'Administración', key: 'admin', icon: 'AD' },
  { to: '/reports', label: 'Reportes', key: 'reports', icon: 'RP' },
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
