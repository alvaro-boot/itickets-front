import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '../shared/composables/useAuth';

const AppShell = () => import('../app/layouts/AppShell.vue');
const LoginView = () => import('../modules/auth/views/LoginView.vue');
const TicketsListView = () => import('../modules/tickets/views/TicketsListView.vue');
const TicketCreateView = () => import('../modules/tickets/views/TicketCreateView.vue');
const TicketDetailView = () => import('../modules/tickets/views/TicketDetailView.vue');
const IncidentsView = () => import('../modules/incidents/views/IncidentsView.vue');
const TasksView = () => import('../modules/tasks/views/TasksView.vue');
const ProfileView = () => import('../modules/profile/views/ProfileView.vue');
const CatalogsView = () => import('../modules/catalogs/views/CatalogsView.vue');
const AdminView = () => import('../modules/admin/views/AdminView.vue');
const ReportsView = () => import('../modules/reports/views/ReportsView.vue');

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
