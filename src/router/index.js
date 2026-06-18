import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '../shared/composables/useAuth';

const AppLayout = () => import('../app/layouts/AppLayout.vue');
const LoginView = () => import('../modules/auth/views/LoginView.vue');
const TicketsListView = () => import('../modules/tickets/views/TicketsListView.vue');
const TicketCreateView = () => import('../modules/tickets/views/TicketCreateView.vue');
const TicketDetailView = () => import('../modules/tickets/views/TicketDetailView.vue');
const IncidentsView = () => import('../modules/incidents/views/IncidentsView.vue');
const TasksView = () => import('../modules/tasks/views/TasksView.vue');
const ProfileView = () => import('../modules/profile/views/ProfileView.vue');
const CatalogsView = () => import('../modules/catalogs/views/CatalogsView.vue');
const AdminView = () => import('../modules/admin/views/AdminView.vue');
const HomeView = () => import('../modules/home/views/HomeView.vue');
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
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/home',
      },
      {
        path: 'home',
        name: 'home',
        component: HomeView,
        meta: {
          requiresAuth: true,
          title: 'Inicio',
        },
      },
      {
        path: 'tickets',
        name: 'tickets',
        component: TicketsListView,
        meta: {
          requiresAuth: true,
          title: 'Todos los tickets',
          breadcrumb: [{ label: 'Tickets', to: '/tickets' }],
        },
      },
      {
        path: 'tickets/new',
        name: 'ticket-new',
        component: TicketCreateView,
        meta: {
          requiresAuth: true,
          title: 'Crear ticket',
          breadcrumb: [
            { label: 'Tickets', to: '/tickets' },
            { label: 'Crear ticket' },
          ],
        },
      },
      {
        path: 'tickets/:id',
        name: 'ticket-detail',
        component: TicketDetailView,
        meta: {
          requiresAuth: true,
          title: 'Detalle de ticket',
          breadcrumb: [{ label: 'Tickets', to: '/tickets' }],
        },
      },
      {
        path: 'incidents',
        name: 'incidents',
        component: IncidentsView,
        meta: {
          requiresAuth: true,
          title: 'Incidentes',
          breadcrumb: [{ label: 'Incidentes' }],
        },
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: TasksView,
        meta: {
          requiresAuth: true,
          title: 'Mis tareas',
          breadcrumb: [{ label: 'Mis tareas' }],
        },
      },
      {
        path: 'profile',
        name: 'profile',
        component: ProfileView,
        meta: {
          requiresAuth: true,
          title: 'Mi perfil',
          breadcrumb: [{ label: 'Mi perfil' }],
        },
      },
      {
        path: 'catalogs',
        name: 'catalogs',
        component: CatalogsView,
        meta: {
          requiresAuth: true,
          title: 'Catálogos',
          breadcrumb: [{ label: 'Catálogos' }],
        },
      },
      {
        path: 'admin',
        name: 'admin',
        component: AdminView,
        meta: {
          requiresAuth: true,
          title: 'Administración',
          breadcrumb: [{ label: 'Administración' }],
        },
      },
      {
        path: 'dashboard',
        redirect: '/home',
      },
      {
        path: 'reports',
        name: 'reports',
        component: ReportsView,
        meta: {
          requiresAuth: true,
          title: 'Reportes',
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
    return { name: 'home' };
  }

  return true;
});

export default router;
