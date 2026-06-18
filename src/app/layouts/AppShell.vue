<template>
  <div class="app-shell shell-frame app-shell--jira">
    <header class="topbar topbar--dense topbar--jira">
      <div class="topbar__left">
        <button class="menu-toggle" type="button" aria-label="Abrir menú" @click="toggleSidebar">☰</button>
        <RouterLink to="/tickets" class="brand brand--shell" aria-label="Service Desk — inicio">
          <img src="/images/icono.png" alt="" class="brand-icon brand-icon--topbar" width="32" height="32" decoding="async" />
          <span class="topbar-app-name">Service Desk</span>
        </RouterLink>
      </div>

      <div class="topbar__center">
        <GlobalSearch v-if="canSearchTickets" />
      </div>

      <nav class="nav-actions nav-actions--dense topbar__right" aria-label="Principal">
        <div v-if="createOptions.length" class="create-menu" ref="createMenuRef">
          <button type="button" class="btn btn-primary btn--sm" @click="toggleCreateMenu">Crear</button>
          <div v-if="createOpen" class="create-menu__dropdown">
            <RouterLink
              v-for="opt in createOptions"
              :key="opt.to"
              class="create-menu__item"
              :to="opt.to"
              @click="createOpen = false"
            >
              {{ opt.label }}
            </RouterLink>
          </div>
        </div>
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
        <UserAvatar :name="auth.state.profile?.fullName" :email="auth.state.profile?.email" size="md" />
        <span class="topbar-user">{{ auth.state.profile?.fullName || 'Sesión' }}</span>
        <button type="button" class="btn btn-ghost btn--sm" @click="handleLogout">Salir</button>
      </nav>
    </header>

    <div class="layout shell-layout">
      <aside class="sidebar sidebar--dense sidebar--jira" :hidden="false">
        <RouterLink to="/tickets" class="sidebar-brand sidebar-brand--dense" aria-label="Inicio" @click="closeSidebar">
          <img src="/images/icono.png" alt="" class="brand-icon brand-icon--sidebar" width="28" height="28" decoding="async" />
        </RouterLink>

        <div v-for="section in visibleSections" :key="section.label" class="sidebar-section">
          <p class="sidebar-section__label">{{ section.label }}</p>
          <nav class="menu menu--dense menu--jira" :aria-label="section.label">
            <RouterLink
              v-for="item in section.items"
              :key="item.to"
              :to="item.to"
              :class="{ active: isActive(item) }"
              @click="closeSidebar"
            >
              <span class="nav-icon" aria-hidden="true" v-html="item.icon"></span>
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>
        </div>
      </aside>

      <main class="content content-shell content-shell--dense content-shell--jira">
        <PageBreadcrumbs :current-label="breadcrumbCurrent" />
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import ToastHost from '../../shared/components/ToastHost.vue';
import GlobalLoader from '../../shared/components/GlobalLoader.vue';
import GlobalSearch from '../../shared/components/GlobalSearch.vue';
import PageBreadcrumbs from '../../shared/components/PageBreadcrumbs.vue';
import UserAvatar from '../../shared/components/UserAvatar.vue';
import { useAuth } from '../../shared/composables/useAuth';
import { useUi } from '../../shared/composables/useUi';
import { usePageChrome } from '../../shared/composables/usePageChrome';

const auth = useAuth();
const ui = useUi();
const route = useRoute();
const router = useRouter();
const { breadcrumbCurrent, clearBreadcrumbCurrent } = usePageChrome();
const createOpen = ref(false);
const createMenuRef = ref(null);

const iconList = '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>';
const iconIncident = '<svg viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>';
const iconTask = '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>';
const iconCatalog = '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>';
const iconAdmin = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>';
const iconReport = '<svg viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>';
const iconProfile = '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

const sections = [
  {
    label: 'Tickets',
    items: [{ to: '/tickets', label: 'Todos los tickets', key: 'tickets', icon: iconList }],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/incidents', label: 'Incidentes', key: 'incidents', icon: iconIncident },
      { to: '/tasks', label: 'Mis tareas', key: 'tasks', icon: iconTask },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { to: '/catalogs', label: 'Catálogos', key: 'catalogs', icon: iconCatalog },
      { to: '/admin', label: 'Administración', key: 'admin', icon: iconAdmin },
      { to: '/reports', label: 'Reportes', key: 'reports', icon: iconReport },
    ],
  },
  {
    label: 'Cuenta',
    items: [{ to: '/profile', label: 'Mi perfil', key: 'profile', icon: iconProfile }],
  },
];

function canSeeItem(item) {
  const profile = auth.state.profile;
  if (!profile) return true;
  if (item.key === 'admin') return profile.permissions?.includes('companies.manage');
  if (item.key === 'tickets') return profile.enabledModules?.includes('tickets');
  if (item.key === 'incidents') return profile.enabledModules?.includes('incidents');
  if (item.key === 'tasks') return profile.enabledModules?.includes('tasks');
  if (item.key === 'reports') return profile.enabledModules?.includes('tickets');
  if (item.key === 'catalogs') {
    return profile.permissions?.includes('catalogs.manage') || profile.enabledModules?.includes('tickets');
  }
  return true;
}

const visibleSections = computed(() =>
  sections
    .map((section) => ({
      ...section,
      items: section.items.filter(canSeeItem),
    }))
    .filter((section) => section.items.length > 0),
);

const canSearchTickets = computed(() => auth.state.profile?.enabledModules?.includes('tickets'));

const createOptions = computed(() => {
  const opts = [];
  if (auth.state.profile?.enabledModules?.includes('tickets')) {
    opts.push({ to: '/tickets/new', label: 'Ticket' });
  }
  if (auth.state.profile?.enabledModules?.includes('incidents')) {
    opts.push({ to: '/incidents', label: 'Incidente' });
  }
  return opts;
});

function isActive(item) {
  if (item.to === '/tickets') {
    return route.path === '/tickets' || (route.path.startsWith('/tickets/') && route.path !== '/tickets/new');
  }
  return route.path === item.to || route.path.startsWith(`${item.to}/`);
}

function closeSidebar() {
  ui.setSidebarOpen(false);
  document.body.classList.remove('sidebar-open');
}

function toggleSidebar() {
  const nextValue = !ui.state.sidebarOpen;
  ui.setSidebarOpen(nextValue);
  document.body.classList.toggle('sidebar-open', nextValue);
}

function toggleCreateMenu() {
  createOpen.value = !createOpen.value;
}

function onDocumentClick(event) {
  if (!createMenuRef.value?.contains(event.target)) {
    createOpen.value = false;
  }
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

onMounted(() => document.addEventListener('click', onDocumentClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick));

watch(
  () => route.fullPath,
  () => {
    closeSidebar();
    clearBreadcrumbCurrent();
  },
);
</script>
