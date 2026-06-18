<template>
  <div class="nexus-shell">
    <header class="nx-topbar">
      <RouterLink to="/tickets" class="nx-topbar__brand" aria-label="Nexus Desk — inicio">
        <img src="/images/icono.png" alt="" width="28" height="28" decoding="async" />
        <span>Nexus Desk</span>
      </RouterLink>

      <button type="button" class="nx-cmd-trigger" aria-label="Abrir paleta de comandos" @click="paletteOpen = true">
        <span>Buscar o ir a…</span>
        <kbd>{{ modKey }}K</kbd>
      </button>

      <div class="nx-topbar__spacer" />

      <div class="nx-topbar__actions">
        <button v-if="canCreateTicket" type="button" class="nx-btn nx-btn--primary" @click="openCreateIssue">
          Crear ticket
        </button>
        <select
          v-if="(auth.state.profile?.companies?.length || 0) > 1"
          class="nx-select"
          :value="auth.state.profile?.activeCompanyId || auth.state.profile?.companyId || ''"
          @change="handleSwitchCompany"
        >
          <option v-for="company in auth.state.profile?.companies || []" :key="company.id" :value="company.id">
            {{ company.name }}
          </option>
        </select>
        <div class="nx-user-menu" ref="userMenuRef">
          <button type="button" class="nx-btn nx-btn--ghost" aria-label="Menú de usuario" @click="userMenuOpen = !userMenuOpen">
            <UserAvatar :name="auth.state.profile?.fullName" :email="auth.state.profile?.email" size="md" />
          </button>
          <div v-if="userMenuOpen" class="nx-user-menu__dropdown">
            <p class="nx-user-menu__name">{{ auth.state.profile?.fullName || 'Usuario' }}</p>
            <p v-if="auth.state.profile?.email" class="nx-user-menu__email">{{ auth.state.profile.email }}</p>
            <RouterLink to="/profile" class="nx-user-menu__item" @click="userMenuOpen = false">Mi perfil</RouterLink>
            <button type="button" class="nx-user-menu__item" @click="switchToClassicUi">Interfaz clásica</button>
            <button type="button" class="nx-user-menu__item nx-user-menu__item--danger" @click="handleLogout">Cerrar sesión</button>
          </div>
        </div>
      </div>
    </header>

    <div class="nx-body">
      <aside class="nx-sidebar" aria-label="Navegación principal">
        <nav v-for="section in visibleSections" :key="section.label" class="nx-nav-section">
          <p v-if="section.label" class="nx-nav-section__label">{{ section.label }}</p>
          <RouterLink
            v-for="item in section.items"
            :key="item.to"
            :to="item.to"
            class="nx-nav-link"
            :class="{ active: isActive(item) }"
          >
            <span v-html="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>
      </aside>

      <main class="nx-main">
        <div class="nx-content">
          <RouterView v-slot="{ Component, route: childRoute }">
            <KeepAlive :include="['tickets']">
              <component :is="Component" :key="childRoute.name === 'tickets' ? 'tickets' : childRoute.fullPath" />
            </KeepAlive>
          </RouterView>
        </div>
      </main>
    </div>
  </div>

  <CommandPalette :open="paletteOpen" :commands="paletteCommands" @close="paletteOpen = false" @run="onPaletteRun" />
  <ToastHost />
  <GlobalLoader />
  <CreateIssueModal :open="createIssueOpen" @close="closeCreateIssue" />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import ToastHost from '../../shared/components/ToastHost.vue';
import GlobalLoader from '../../shared/components/GlobalLoader.vue';
import UserAvatar from '../../shared/components/UserAvatar.vue';
import CreateIssueModal from '../../modules/tickets/components/CreateIssueModal.vue';
import CommandPalette from '../components/CommandPalette.vue';
import { useAuth } from '../../shared/composables/useAuth';
import { useUi } from '../../shared/composables/useUi';
import { useCreateIssue } from '../../shared/composables/useCreateIssue';
import { usePageChrome } from '../../shared/composables/usePageChrome';
import { usePermissions } from '../../shared/composables/usePermissions';
import { useNexusUi } from '../../shared/composables/useNexusUi';

const auth = useAuth();
const ui = useUi();
const perms = usePermissions();
const nexusUi = useNexusUi();
const route = useRoute();
const router = useRouter();
const { clearBreadcrumbCurrent } = usePageChrome();
const { createIssueOpen, openCreateIssue, closeCreateIssue } = useCreateIssue();

const userMenuOpen = ref(false);
const userMenuRef = ref(null);
const paletteOpen = ref(false);

const modKey = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl+';

const iconInbox = '<svg viewBox="0 0 24 24"><path d="M22 12h-6l-2 3H10l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>';
const iconList = '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>';
const iconBacklog = '<svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>';
const iconChart = '<svg viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>';
const iconIncident = '<svg viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>';
const iconTask = '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>';
const iconCatalog = '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>';
const iconAdmin = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>';

const sections = [
  {
    label: 'Trabajo',
    items: [
      { to: '/tickets?view=mine', label: 'Bandeja', key: 'inbox', icon: iconInbox },
      { to: '/tickets', label: 'Todos', key: 'tickets', icon: iconList },
      { to: '/tickets?view=backlog', label: 'Backlog', key: 'backlog', icon: iconBacklog },
      { to: '/dashboard', label: 'Dashboard', key: 'dashboard', icon: iconChart },
    ],
  },
  {
    label: 'Más',
    items: [
      { to: '/incidents', label: 'Incidentes', key: 'incidents', icon: iconIncident },
      { to: '/tasks', label: 'Mis tareas', key: 'tasks', icon: iconTask },
      { to: '/catalogs', label: 'Catálogos', key: 'catalogs', icon: iconCatalog },
      { to: '/admin', label: 'Administración', key: 'admin', icon: iconAdmin },
    ],
  },
];

const visibleSections = computed(() =>
  sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => perms.canSeeNav(item.key)),
    }))
    .filter((section) => section.items.length > 0),
);

const canCreateTicket = computed(() => perms.moduleEnabled(perms.MODULES.TICKETS));

const paletteCommands = computed(() => {
  const navItems = visibleSections.value.flatMap((section) =>
    section.items.map((item) => ({
      id: `nav-${item.key}`,
      label: item.label,
      hint: section.label,
      to: item.to,
      keywords: item.key,
    })),
  );

  const actions = [];
  if (canCreateTicket.value) {
    actions.push({
      id: 'create-ticket',
      label: 'Crear ticket',
      hint: 'Acción',
      action: openCreateIssue,
      keywords: 'nuevo issue',
    });
  }
  actions.push({
    id: 'classic-ui',
    label: 'Cambiar a interfaz clásica',
    hint: 'Apariencia',
    action: switchToClassicUi,
  });

  return [
    { label: 'Navegación', items: navItems },
    { label: 'Acciones', items: actions },
  ];
});

function isActive(item) {
  if (item.key === 'inbox') return route.path === '/tickets' && route.query.view === 'mine';
  if (item.key === 'backlog') return route.path === '/tickets' && route.query.view === 'backlog';
  if (item.key === 'tickets') {
    return route.path === '/tickets' && (!route.query.view || route.query.view === 'all');
  }
  return route.path === item.to || route.path.startsWith(`${item.to}/`);
}

function onPaletteRun(item) {
  if (item.action) item.action();
}

function switchToClassicUi() {
  userMenuOpen.value = false;
  nexusUi.setEnabled(false);
  router.go(0);
}

function onKeyDown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    paletteOpen.value = true;
  }
}

function onDocumentClick(event) {
  if (!userMenuRef.value?.contains(event.target)) {
    userMenuOpen.value = false;
  }
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

function handleLogout() {
  userMenuOpen.value = false;
  auth.logout();
  router.push('/login');
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('click', onDocumentClick);
});

watch(
  () => route.fullPath,
  () => {
    userMenuOpen.value = false;
    clearBreadcrumbCurrent();
  },
);
</script>
