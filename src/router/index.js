import { createRouter, createWebHistory } from 'vue-router';
import AppShell from '../app/layouts/AppShell.vue';
import LoginView from '../modules/auth/views/LoginView.vue';
import TicketsListView from '../modules/tickets/views/TicketsListView.vue';
import TicketCreateView from '../modules/tickets/views/TicketCreateView.vue';
import TicketDetailView from '../modules/tickets/views/TicketDetailView.vue';
import IncidentsView from '../modules/incidents/views/IncidentsView.vue';
import TasksView from '../modules/tasks/views/TasksView.vue';
import ProfileView from '../modules/profile/views/ProfileView.vue';
import CatalogsView from '../modules/catalogs/views/CatalogsView.vue';
import AdminView from '../modules/admin/views/AdminView.vue';
import ReportsView from '../modules/reports/views/ReportsView.vue';
import { useAuth } from '../shared/composables/useAuth';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true },
  },
  {
    path: '/',
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/tickets',
      },
      {
        path: 'tickets',
        name: 'tickets',
        component: TicketsListView,
        meta: {
          requiresAuth: true,
          title: 'Centro de tickets',
          subtitle: 'Visualiza y prioriza incidencias en tiempo real.',
        },
      },
      {
        path: 'tickets/new',
        name: 'ticket-new',
        component: TicketCreateView,
        meta: {
          requiresAuth: true,
          title: 'Nuevo ticket',
          subtitle: 'Registra un caso con contexto y prioridad.',
        },
      },
      {
        path: 'tickets/:id',
        name: 'ticket-detail',
        component: TicketDetailView,
        meta: {
          requiresAuth: true,
          title: 'Detalle de ticket',
          subtitle: 'Controla estado, asignacion, historial y comentarios.',
        },
      },
      {
        path: 'incidents',
        name: 'incidents',
        component: IncidentsView,
        meta: {
          requiresAuth: true,
          title: 'Incidentes generales',
          subtitle: 'Todos los usuarios pueden ver los incidentes abiertos.',
        },
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: TasksView,
        meta: {
          requiresAuth: true,
          title: 'Mis tareas',
          subtitle: 'Registra y controla tus tareas del dia a dia.',
        },
      },
      {
        path: 'profile',
        name: 'profile',
        component: ProfileView,
        meta: {
          requiresAuth: true,
          title: 'Mi perfil',
          subtitle: 'Actualiza tu informacion personal y credenciales.',
        },
      },
      {
        path: 'catalogs',
        name: 'catalogs',
        component: CatalogsView,
        meta: {
          requiresAuth: true,
          title: 'Catalogos',
          subtitle: 'Administra productos y tipos de ticket del sistema.',
        },
      },
      {
        path: 'admin',
        name: 'admin',
        component: AdminView,
        meta: {
          requiresAuth: true,
          title: 'Administración global',
          subtitle: 'Gestiona empresas, módulos y permisos globales.',
        },
      },
      {
        path: 'reports',
        name: 'reports',
        component: ReportsView,
        meta: {
          requiresAuth: true,
          title: 'Dashboard de reportes',
          subtitle: 'Consulta tiempos de resolucion y productividad.',
        },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuth();
  try {
    await auth.initAuth();
  } catch {
    return to.name === 'login' ? true : { name: 'login' };
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated.value) {
    return { name: 'login' };
  }

  if (to.meta.guestOnly && auth.isAuthenticated.value) {
    return { name: 'tickets' };
  }

  return true;
});

export default router;
