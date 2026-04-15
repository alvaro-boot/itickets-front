import * as api from './api.js';

const view = document.getElementById('view');
const nav = document.getElementById('nav-actions');
const toastEl = document.getElementById('toast');
const sidebar = document.getElementById('sidebar');
const sidebarMenu = document.getElementById('sidebar-menu');
const menuToggle = document.getElementById('menu-toggle');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const hero = document.getElementById('hero');
const heroTitle = document.getElementById('hero-title');
const heroSubtitle = document.getElementById('hero-subtitle');
let globalLoaderEl = null;
let globalLoadingCount = 0;
let sessionProfile = null;
/** Token JWT para el cual `sessionProfile` es válido; evita llamar `/users/me` en cada cambio de ruta. */
let sessionProfileForToken = null;

function invalidateSessionProfile() {
  sessionProfile = null;
  sessionProfileForToken = null;
}

/** Catálogos de ticket (estado/prioridad/producto/tipo); se invalida al crear ítems en Catálogos. */
let catalogBundleCache = null;
let usersListCache = null;
let usersListCacheAt = 0;
const USERS_LIST_TTL_MS = 30000;

function debounce(fn, delayMs = 300) {
  let timeout = null;
  return (...args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delayMs);
  };
}

async function fetchCatalogBundle() {
  if (catalogBundleCache) return catalogBundleCache;
  const [statuses, priorities, products, types] = await Promise.all([
    api.catalogs.statuses(),
    api.catalogs.priorities(),
    api.catalogs.products(),
    api.catalogs.types(),
  ]);
  catalogBundleCache = { statuses, priorities, products, types };
  return catalogBundleCache;
}

function invalidateCatalogBundle() {
  catalogBundleCache = null;
}

function invalidateUsersListCache() {
  usersListCache = null;
  usersListCacheAt = 0;
}

async function fetchUsersListCached() {
  if (usersListCache && Date.now() - usersListCacheAt < USERS_LIST_TTL_MS) {
    return usersListCache;
  }
  const rows = await api.users.list().catch(() => []);
  usersListCache = rows;
  usersListCacheAt = Date.now();
  return rows;
}

function escapeHtml(s) {
  if (s == null) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

function showToast(message, isError = true) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  toastEl.classList.toggle('error', isError);
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toastEl.hidden = true;
  }, 4200);
}

function ensureGlobalLoader() {
  if (globalLoaderEl) return globalLoaderEl;
  const el = document.createElement('div');
  el.id = 'global-loader';
  el.className = 'global-loader';
  el.hidden = true;
  el.innerHTML = `
    <div class="global-loader__box">
      <span class="global-loader__spinner" aria-hidden="true"></span>
      <p class="global-loader__text">Cargando informacion, por favor espera...</p>
    </div>
  `;
  document.body.appendChild(el);
  globalLoaderEl = el;
  return el;
}

function updateGlobalLoader() {
  const el = ensureGlobalLoader();
  const show = globalLoadingCount > 0;
  el.hidden = !show;
}

function bindGlobalLoaderEvents() {
  window.addEventListener('itickets:loading', (event) => {
    if (event.detail?.isLoading) {
      globalLoadingCount += 1;
    } else {
      globalLoadingCount = Math.max(0, globalLoadingCount - 1);
    }
    updateGlobalLoader();
  });
}

function setSidebarOpen(open) {
  document.body.classList.toggle('sidebar-open', open);
  if (sidebarBackdrop) sidebarBackdrop.hidden = !open;
}

function closeSidebarForMobile() {
  if (window.innerWidth <= 1023) {
    setSidebarOpen(false);
  }
}

function parseRoute() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const parts = raw.split('/').filter(Boolean);
  if (parts[0] === 'login') return { name: 'login' };
  if (parts[0] === 'register') return { name: 'login' };
  if (parts[0] === 'catalogs') return { name: 'catalogs' };
  if (parts[0] === 'admin') return { name: 'admin' };
  if (parts[0] === 'incidents') return { name: 'incidents' };
  if (parts[0] === 'tasks') return { name: 'tasks' };
  if (parts[0] === 'profile') return { name: 'profile' };
  if (parts[0] === 'reports') return { name: 'reports' };
  if (parts[0] === 'tickets' && parts[1] === 'new') return { name: 'ticket-new' };
  if (parts[0] === 'tickets' && parts[1]) return { name: 'ticket-detail', id: parts[1] };
  return { name: 'tickets' };
}

function setSidebar(routeName, hasToken, profile) {
  if (!hasToken) {
    sidebar.hidden = true;
    hero.hidden = true;
    setSidebarOpen(false);
    return;
  }
  const items = [
    { href: '#/tickets', label: 'Tickets', key: 'tickets' },
    { href: '#/tickets/new', label: 'Nuevo ticket', key: 'ticket-new' },
    { href: '#/incidents', label: 'Incidentes', key: 'incidents' },
    { href: '#/tasks', label: 'Mis tareas', key: 'tasks' },
    { href: '#/profile', label: 'Mi perfil', key: 'profile' },
    { href: '#/catalogs', label: 'Catalogos', key: 'catalogs' },
    { href: '#/admin', label: 'Admin Global', key: 'admin' },
    { href: '#/reports', label: 'Reportes', key: 'reports' },
  ].filter((item) => {
    if (!profile) return true;
    if (item.key === 'admin') return profile.permissions?.includes('companies.manage');
    if (item.key === 'tickets' || item.key === 'ticket-new') return profile.enabledModules?.includes('tickets');
    if (item.key === 'incidents') return profile.enabledModules?.includes('incidents');
    if (item.key === 'tasks') return profile.enabledModules?.includes('tasks');
    if (item.key === 'reports') return profile.enabledModules?.includes('tickets');
    if (item.key === 'catalogs')
      return profile.permissions?.includes('catalogs.manage') || profile.enabledModules?.includes('tickets');
    return true;
  });
  sidebarMenu.innerHTML = items
    .map(
      (item) => `
      <a href="${item.href}" class="${routeName === item.key ? 'active' : ''}">
        <span>${item.label}</span><span>›</span>
      </a>`,
    )
    .join('');
  sidebar.hidden = false;
  hero.hidden = false;
  closeSidebarForMobile();
}

function setNav(routeName, profile) {
  const token = api.getToken();
  if (!token) {
    nav.innerHTML = `<a class="btn btn-primary" href="#/login">Iniciar sesión</a>`;
    return;
  }
  nav.innerHTML = `
    <span class="user-pill" id="nav-user"></span>
    <button type="button" class="btn btn-ghost" id="btn-logout">Salir</button>
  `;
  const btn = document.getElementById('btn-logout');
  btn?.addEventListener('click', () => {
    api.setToken(null);
    invalidateSessionProfile();
    location.hash = '#/login';
  });
  const el = document.getElementById('nav-user');
  if (el) el.textContent = profile?.fullName || profile?.email || 'Sesion';
}

async function renderLogin() {
  view.innerHTML = `
    <div class="auth-shell">
      <div class="auth-card">
      <h1 style="margin:0">Bienvenido de vuelta</h1>
      <p class="meta" style="margin:.45rem 0 1rem">Ingresa con tu cuenta para continuar al panel de tickets.</p>
      <form id="f-login">
        <label for="email">Correo corporativo</label>
        <input id="email" name="email" type="email" autocomplete="username" placeholder="ejemplo@empresa.com" required />
        <label for="password" style="margin-top:0.75rem">Contraseña</label>
        <div class="password-wrap">
          <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Tu contraseña" required />
          <button class="btn btn-ghost password-toggle" id="toggle-password" type="button" aria-label="Mostrar u ocultar contraseña">Ver</button>
        </div>
        <p id="login-feedback" class="meta" style="margin:.65rem 0 0;min-height:1.2rem"></p>
        <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn btn-primary" id="login-submit" type="submit">Entrar</button>
        </div>
      </form>
      </div>
    </div>
  `;
  const form = document.getElementById('f-login');
  const passInput = document.getElementById('password');
  const submit = document.getElementById('login-submit');
  const feedback = document.getElementById('login-feedback');
  document.getElementById('toggle-password')?.addEventListener('click', () => {
    const isHidden = passInput.type === 'password';
    passInput.type = isHidden ? 'text' : 'password';
    document.getElementById('toggle-password').textContent = isHidden ? 'Ocultar' : 'Ver';
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    feedback.textContent = '';
    if (!email || !password) {
      feedback.textContent = 'Completa correo y contraseña para continuar.';
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Ingresando...';
    feedback.textContent = 'Validando credenciales...';
    try {
      const res = await api.auth.login({
        email,
        password,
      });
      api.setToken(res.access_token);
      invalidateSessionProfile();
      feedback.textContent = 'Acceso concedido. Redirigiendo...';
      location.hash = '#/tickets';
    } catch (err) {
      feedback.textContent = err.message || 'No fue posible iniciar sesion.';
      showToast(err.message, true);
    } finally {
      submit.disabled = false;
      submit.textContent = 'Entrar';
    }
  });
}

async function renderRegister() {
  view.innerHTML = `
    <div class="panel" style="max-width:420px;margin:2rem auto;">
      <h1>Registro</h1>
      <form id="f-reg">
        <label for="fullName">Nombre completo</label>
        <input id="fullName" name="fullName" required minlength="2" />
        <label for="email" style="margin-top:0.75rem">Correo</label>
        <input id="email" name="email" type="email" required />
        <label for="password" style="margin-top:0.75rem">Contraseña (mín. 6)</label>
        <input id="password" name="password" type="password" minlength="6" required />
        <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn btn-primary" type="submit">Registrarme</button>
          <a class="btn btn-ghost" href="#/login">Ya tengo cuenta</a>
        </div>
      </form>
    </div>
  `;
  document.getElementById('f-reg').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await api.auth.register({
        fullName: fd.get('fullName'),
        email: fd.get('email'),
        password: fd.get('password'),
      });
      api.setToken(res.access_token);
      invalidateSessionProfile();
      location.hash = '#/tickets';
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

function priorityClass(level) {
  const n = Number(level) || 1;
  return `badge badge-priority-${Math.min(Math.max(n, 1), 4)}`;
}

async function renderTicketList() {
  view.innerHTML = `<div class="panel"><p class="meta">Cargando…</p></div>`;
  try {
    let query = '';
    const meId = sessionProfile?.id ? String(sessionProfile.id) : null;
    const fetchRows = async (q = '') => {
      const payload = await api.tickets.list({ q, page: 1, limit: 50 });
      return payload?.items || [];
    };
    let rows = await fetchRows();
    const isClosedTicket = (ticket) => {
      const statusName = String(ticket.status?.name || '').toLowerCase();
      const statusCode = String(ticket.status?.code || '').toLowerCase();
      return Boolean(ticket.closedAt) || statusName.includes('cerrad') || statusCode.includes('closed');
    };
    const buildFilters = (source) => ({
      all: source,
      mine: source.filter((t) => meId && String(t.assigneeId || '') === meId),
      unassigned: source.filter((t) => t.assigneeId == null || String(t.assigneeId) === ''),
      closed: source.filter((t) => isClosedTicket(t)),
    });
    let filters = buildFilters(rows);
    const tabDefs = [
      { key: 'all', label: 'Tickets en general' },
      { key: 'mine', label: 'Mis asignados' },
      { key: 'unassigned', label: 'No asignados' },
      { key: 'closed', label: 'Cerrados' },
    ];

    function renderRows(subset) {
      return subset
        .map(
          (t) => `
            <tr data-href="#/tickets/${t.id}" style="cursor:pointer">
              <td><a href="#/tickets/${t.id}">${escapeHtml(t.title)}</a></td>
              <td><span class="badge">${escapeHtml(t.status?.name || '')}</span></td>
              <td><span class="${priorityClass(t.priority?.level)}">${escapeHtml(t.priority?.name || '')}</span></td>
              <td>${escapeHtml(t.assignee?.fullName || t.assignee?.email || 'Sin asignar')}</td>
              <td class="meta">${escapeHtml(fmtDate(t.updatedAt))}</td>
            </tr>`,
        )
        .join('');
    }

    if (!rows.length) {
      view.innerHTML = `
        <div class="toolbar">
          <h1 style="margin:0;font-size:1.25rem">Tickets</h1>
          <a class="btn btn-primary" href="#/tickets/new">Nuevo ticket</a>
        </div>
        <div class="panel empty">No hay tickets todavía.</div>
      `;
      return;
    }
    view.innerHTML = `
      <div class="toolbar">
        <h1 style="margin:0;font-size:1.25rem">Tickets</h1>
        <a class="btn btn-primary" href="#/tickets/new">Nuevo ticket</a>
      </div>
      <div class="panel" style="margin-bottom:1rem">
        <label for="ticket-search">Buscar ticket</label>
        <input id="ticket-search" placeholder="Buscar por título o descripción" />
      </div>
      <div class="ticket-tabs" role="tablist" aria-label="Vistas de tickets">
        ${tabDefs
          .map(
            (tab, index) => `
              <button class="ticket-tab ${index === 0 ? 'active' : ''}" type="button" data-ticket-tab="${tab.key}">
                ${tab.label} <span class="badge">${filters[tab.key].length}</span>
              </button>`,
          )
          .join('')}
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Asignado a</th>
              <th>Actualizado</th>
            </tr>
          </thead>
          <tbody id="tickets-table-body">${renderRows(filters.all)}</tbody>
        </table>
      </div>
    `;

    function bindTableRows() {
      view.querySelectorAll('tbody tr[data-href]').forEach((tr) => {
        tr.addEventListener('click', (e) => {
          if (e.target.closest('a')) return;
          location.hash = tr.getAttribute('data-href');
        });
      });
    }

    bindTableRows();
    const searchInput = document.getElementById('ticket-search');
    const runSearch = debounce(async () => {
      query = String(searchInput?.value || '').trim();
      rows = await fetchRows(query);
      filters = buildFilters(rows);
      const body = document.getElementById('tickets-table-body');
      if (body) {
        body.innerHTML = filters.all.length
          ? renderRows(filters.all)
          : '<tr><td colspan="5" class="meta">No hay tickets para la búsqueda actual.</td></tr>';
      }
      view.querySelectorAll('[data-ticket-tab]').forEach((tabBtn, index) => {
        const key = tabBtn.getAttribute('data-ticket-tab');
        tabBtn.classList.toggle('active', index === 0);
        const badge = tabBtn.querySelector('.badge');
        if (badge) badge.textContent = String(filters[key]?.length || 0);
      });
      bindTableRows();
    }, 350);
    searchInput?.addEventListener('input', runSearch);

    view.querySelectorAll('[data-ticket-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-ticket-tab');
        const subset = filters[key] || [];
        const body = document.getElementById('tickets-table-body');
        if (body) {
          body.innerHTML = subset.length
            ? renderRows(subset)
            : '<tr><td colspan="5" class="meta">No hay tickets en esta vista.</td></tr>';
        }
        view.querySelectorAll('[data-ticket-tab]').forEach((tabBtn) => tabBtn.classList.remove('active'));
        btn.classList.add('active');
        bindTableRows();
      });
    });
  } catch (err) {
    const message = err?.message || 'No se pudo cargar la lista.';
    view.innerHTML = `
      <div class="panel">
        <p class="meta">No se pudo cargar la lista.</p>
        <p class="meta">${escapeHtml(message)}</p>
      </div>
    `;
    showToast(message, true);
  }
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

function renderEventText(ev) {
  if (ev.description) return escapeHtml(ev.description);
  if (ev.fromValue != null || ev.toValue != null) {
    return `${escapeHtml(ev.fieldName || 'campo')}: ${escapeHtml(ev.fromValue || '—')} -> ${escapeHtml(ev.toValue || '—')}`;
  }
  return escapeHtml(ev.eventType || 'Movimiento');
}

function buildBars(items, max = 1) {
  if (!items.length) return '<p class="meta">Sin datos suficientes para graficar.</p>';
  return `
    <div class="chart-bars">
      ${items
        .map((item) => {
          const pct = Math.max(5, Math.round((item.value / max) * 100));
          return `
            <div class="chart-row">
              <div class="chart-label">${escapeHtml(item.label)}</div>
              <div class="chart-track"><span style="width:${pct}%"></span></div>
              <div class="chart-value">${escapeHtml(item.value)}</div>
            </div>`;
        })
        .join('')}
    </div>
  `;
}

function buildDonut(total, solved) {
  const safeTotal = Math.max(Number(total) || 0, 0);
  const safeSolved = Math.min(Math.max(Number(solved) || 0, 0), safeTotal || 0);
  const pct = safeTotal ? Math.round((safeSolved / safeTotal) * 100) : 0;
  return `
    <div class="donut-wrap">
      <div class="donut" style="--pct:${pct}%"></div>
      <div>
        <p class="kpi-label">Tickets resueltos</p>
        <p class="kpi-value" style="font-size:1.2rem">${safeSolved} / ${safeTotal}</p>
        <p class="kpi-sub">${pct}% de cierre en el rango seleccionado</p>
      </div>
    </div>
  `;
}

async function renderReports() {
  const now = new Date();
  const fromDefault = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const toDefault = now.toISOString().slice(0, 10);
  view.innerHTML = `
    <div class="toolbar">
      <h1 style="margin:0;font-size:1.25rem">Informes</h1>
    </div>
    <div class="panel">
      <form id="f-reports" class="grid-2">
        <div>
          <label for="from">Desde</label>
          <input id="from" name="from" type="date" value="${fromDefault}" required />
        </div>
        <div>
          <label for="to">Hasta</label>
          <input id="to" name="to" type="date" value="${toDefault}" required />
        </div>
        <div style="grid-column:1/-1"><button class="btn btn-primary" type="submit">Consultar</button></div>
      </form>
      <div id="reports-result" style="margin-top:1rem"></div>
    </div>
  `;

  async function load() {
    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;
    const fromIso = `${from}T00:00:00`;
    const toIso = `${to}T23:59:59`;
    const result = document.getElementById('reports-result');
    result.innerHTML = '<p class="meta">Consultando…</p>';
    try {
      const [resolution, byUser] = await Promise.all([
        api.reports.resolution(fromIso, toIso),
        api.reports.ticketsByUser(fromIso, toIso),
      ]);
      const resolvedTickets = resolution.tickets || [];
      const assigneeData = (byUser.byAssignee || []).map((u) => ({
        label: u.fullName || u.email || 'Sin nombre',
        value: Number(u.count) || 0,
      }));
      const creatorData = (byUser.byCreator || []).map((u) => ({
        label: u.fullName || u.email || 'Sin nombre',
        value: Number(u.count) || 0,
      }));
      const maxAssignee = assigneeData.reduce((m, i) => Math.max(m, i.value), 1);
      const maxCreator = creatorData.reduce((m, i) => Math.max(m, i.value), 1);
      const avgHours = Number(resolution.avgResolutionHours) || 0;
      const avgMinutes = Math.round(avgHours * 60);
      const totalCreatedByUsers = creatorData.reduce((acc, i) => acc + i.value, 0);

      result.innerHTML = `
        <div class="cards" style="margin-bottom:1rem">
          <article class="card">
            <p class="kpi-label">Tickets resueltos</p>
            <p class="kpi-value">${escapeHtml(resolution.totalResolved)}</p>
            <p class="kpi-sub">Casos cerrados durante el periodo</p>
          </article>
          <article class="card">
            <p class="kpi-label">Promedio de resolución</p>
            <p class="kpi-value">${escapeHtml(avgHours.toFixed(2))} h</p>
            <p class="kpi-sub">Aproximadamente ${escapeHtml(avgMinutes)} minutos por ticket</p>
          </article>
          <article class="card">
            <p class="kpi-label">Creación en el periodo</p>
            <p class="kpi-value">${escapeHtml(totalCreatedByUsers)}</p>
            <p class="kpi-sub">Total de tickets contabilizados por creador</p>
          </article>
          <article class="card">
            <p class="kpi-label">Tiempo trabajado</p>
            <p class="kpi-value">${escapeHtml(resolution.totalLoggedHours || 0)} h</p>
            <p class="kpi-sub">${escapeHtml(resolution.totalLoggedMinutes || 0)} minutos registrados</p>
          </article>
        </div>

        <div class="panel" style="margin-bottom:1rem">
          <h3 style="margin:0 0 .6rem">Diagrama de cierre</h3>
          ${buildDonut(totalCreatedByUsers, Number(resolution.totalResolved) || 0)}
        </div>

        <div class="panel" style="margin-bottom:1rem">
          <h3 style="margin:0 0 .6rem">Diagrama de carga por asignado</h3>
          ${buildBars(assigneeData, maxAssignee)}
        </div>

        <div class="panel" style="margin-bottom:1rem">
          <h3 style="margin:0 0 .6rem">Diagrama de creación por usuario</h3>
          ${buildBars(creatorData, maxCreator)}
        </div>

        <div class="table-wrap" style="margin-bottom:1rem">
          <table>
            <thead><tr><th>Ticket</th><th>Creado</th><th>Cerrado</th><th>Resolución (min)</th><th>Tiempo trabajado (min)</th></tr></thead>
            <tbody>
              ${(resolution.tickets || [])
                .map(
                  (t) => `<tr><td>${escapeHtml(t.title)}</td><td>${escapeHtml(fmtDate(t.createdAt))}</td><td>${escapeHtml(fmtDate(t.closedAt))}</td><td>${escapeHtml(t.resolutionMinutes)}</td><td>${escapeHtml(t.loggedMinutes || 0)}</td></tr>`,
                )
                .join('') || '<tr><td colspan="5" class="meta">Sin tickets resueltos en rango</td></tr>'}
            </tbody>
          </table>
        </div>
        <h3 style="margin:0 0 .5rem">Detalle por asignado</h3>
        <div class="table-wrap" style="margin-bottom:1rem">
          <table>
            <thead><tr><th>Usuario</th><th>Email</th><th>Cantidad</th></tr></thead>
            <tbody>
              ${(byUser.byAssignee || [])
                .map((u) => `<tr><td>${escapeHtml(u.fullName || '')}</td><td>${escapeHtml(u.email || '')}</td><td>${escapeHtml(u.count)}</td></tr>`)
                .join('') || '<tr><td colspan="3" class="meta">Sin datos</td></tr>'}
            </tbody>
          </table>
        </div>
        <h3 style="margin:0 0 .5rem">Detalle por creador</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Usuario</th><th>Email</th><th>Cantidad</th></tr></thead>
            <tbody>
              ${(byUser.byCreator || [])
                .map((u) => `<tr><td>${escapeHtml(u.fullName || '')}</td><td>${escapeHtml(u.email || '')}</td><td>${escapeHtml(u.count)}</td></tr>`)
                .join('') || '<tr><td colspan="3" class="meta">Sin datos</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      result.innerHTML = '<p class="meta">No se pudieron generar informes.</p>';
      showToast(err.message, true);
    }
  }

  document.getElementById('f-reports').addEventListener('submit', (e) => {
    e.preventDefault();
    load();
  });
  load();
}

async function renderIncidents() {
  view.innerHTML = '<div class="panel"><p class="meta">Cargando incidentes…</p></div>';
  try {
    const [incidents, catalogBundle] = await Promise.all([
      api.incidents.list(),
      fetchCatalogBundle(),
    ]);
    const { products, types } = catalogBundle;
    const rows =
      incidents
        .map(
          (i) => `<tr>
        <td>${escapeHtml(i.title)}</td>
        <td>${escapeHtml(i.product?.name || '')}</td>
        <td>${escapeHtml(i.ticketType?.name || '')}</td>
        <td>
          <select data-incident-status="${escapeHtml(i.id)}">
            <option value="OPEN" ${i.status === 'OPEN' ? 'selected' : ''}>OPEN</option>
            <option value="IN_PROGRESS" ${i.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
            <option value="RESOLVED" ${i.status === 'RESOLVED' ? 'selected' : ''}>RESOLVED</option>
          </select>
        </td>
        <td>${escapeHtml(i.createdBy?.fullName || i.createdBy?.email || '')}</td>
        <td class="meta">${escapeHtml(fmtDate(i.updatedAt))}</td>
      </tr>`,
        )
        .join('') || '<tr><td colspan="6" class="meta">Sin incidentes</td></tr>';

    view.innerHTML = `
      <div class="toolbar">
        <h1 style="margin:0;font-size:1.25rem">Incidentes generales</h1>
      </div>
      <div class="panel" style="margin-bottom:1rem">
        <form id="f-incident-new" class="grid-2">
          <div style="grid-column:1/-1">
            <label for="incidentTitle">Titulo</label>
            <input id="incidentTitle" name="title" minlength="3" required />
          </div>
          <div style="grid-column:1/-1">
            <label for="incidentDescription">Descripcion</label>
            <textarea id="incidentDescription" name="description"></textarea>
          </div>
          <div>
            <label for="incidentProductId">Producto</label>
            <select id="incidentProductId" name="productId" required>
              ${products.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label for="incidentTypeId">Tipo</label>
            <select id="incidentTypeId" name="ticketTypeId" required>
              ${types.map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join('')}
            </select>
          </div>
          <div style="grid-column:1/-1">
            <button class="btn btn-primary" type="submit">Registrar incidente</button>
          </div>
        </form>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Titulo</th><th>Producto</th><th>Tipo</th><th>Estado</th><th>Creado por</th><th>Actualizado</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    document.getElementById('f-incident-new').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api.incidents.create({
          title: String(fd.get('title') || '').trim(),
          description: String(fd.get('description') || '').trim() || undefined,
          productId: fd.get('productId'),
          ticketTypeId: fd.get('ticketTypeId'),
        });
        showToast('Incidente registrado', false);
        await renderIncidents();
      } catch (err) {
        showToast(err.message, true);
      }
    });

    view.querySelectorAll('[data-incident-status]').forEach((el) => {
      el.addEventListener('change', async () => {
        const incidentId = el.getAttribute('data-incident-status');
        const status = el.value;
        try {
          await api.incidents.update(incidentId, { status });
          showToast('Estado de incidente actualizado', false);
        } catch (err) {
          showToast(err.message, true);
          await renderIncidents();
        }
      });
    });
  } catch (err) {
    view.innerHTML = '<div class="panel"><p class="meta">No se pudieron cargar incidentes.</p></div>';
    showToast(err.message, true);
  }
}

async function renderTasks() {
  view.innerHTML = '<div class="panel"><p class="meta">Cargando tareas…</p></div>';
  try {
    const tasks = await api.tasks.mine();
    const rows =
      tasks
        .map(
          (t) => `<tr>
        <td>${escapeHtml(t.title)}</td>
        <td>${escapeHtml(t.workDate)}</td>
        <td>${t.isDone ? 'Completada' : 'Pendiente'}</td>
        <td><button class="btn btn-ghost" data-task-done="${escapeHtml(t.id)}">${t.isDone ? 'Reabrir' : 'Completar'}</button></td>
      </tr>`,
        )
        .join('') || '<tr><td colspan="4" class="meta">No tienes tareas registradas</td></tr>';

    const today = new Date().toISOString().slice(0, 10);
    view.innerHTML = `
      <div class="toolbar">
        <h1 style="margin:0;font-size:1.25rem">Mis tareas diarias</h1>
      </div>
      <div class="panel" style="margin-bottom:1rem">
        <form id="f-task-new" class="grid-2">
          <div style="grid-column:1/-1">
            <label for="taskTitle">Titulo</label>
            <input id="taskTitle" name="title" minlength="3" required />
          </div>
          <div>
            <label for="taskDate">Fecha</label>
            <input id="taskDate" name="workDate" type="date" value="${today}" required />
          </div>
          <div>
            <label for="taskDescription">Descripcion</label>
            <input id="taskDescription" name="description" />
          </div>
          <div style="grid-column:1/-1">
            <button class="btn btn-primary" type="submit">Registrar tarea</button>
          </div>
        </form>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Titulo</th><th>Fecha</th><th>Estado</th><th>Accion</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    document.getElementById('f-task-new').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api.tasks.create({
          title: String(fd.get('title') || '').trim(),
          description: String(fd.get('description') || '').trim() || undefined,
          workDate: fd.get('workDate'),
        });
        showToast('Tarea registrada', false);
        await renderTasks();
      } catch (err) {
        showToast(err.message, true);
      }
    });

    view.querySelectorAll('[data-task-done]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-task-done');
        const task = tasks.find((x) => String(x.id) === String(id));
        if (!task) return;
        try {
          await api.tasks.update(id, { isDone: !task.isDone });
          await renderTasks();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  } catch (err) {
    view.innerHTML = '<div class="panel"><p class="meta">No se pudieron cargar tus tareas.</p></div>';
    showToast(err.message, true);
  }
}

async function renderProfile() {
  view.innerHTML = '<div class="panel"><p class="meta">Cargando perfil…</p></div>';
  try {
    const me = await api.users.me();
    view.innerHTML = `
      <div class="toolbar">
        <h1 style="margin:0;font-size:1.25rem">Mi perfil</h1>
      </div>
      <div class="grid-2">
        <div class="panel">
          <h3 style="margin-top:0">Actualizar información</h3>
          <form id="f-profile">
            <label>Nombre</label>
            <input name="fullName" required minlength="2" value="${escapeHtml(me.fullName || '')}" />
            <label style="margin-top:.6rem">Correo</label>
            <input name="email" type="email" required value="${escapeHtml(me.email || '')}" />
            <label style="margin-top:.6rem">Telefono</label>
            <input name="phone" type="tel" required minlength="7" value="${escapeHtml(me.phone || '')}" />
            <div style="margin-top:.7rem">
              <button class="btn btn-primary" type="submit">Guardar datos</button>
            </div>
          </form>
        </div>
        <div class="panel">
          <h3 style="margin-top:0">Cambiar contraseña</h3>
          <form id="f-password">
            <label>Contraseña actual</label>
            <input name="currentPassword" type="password" minlength="6" required />
            <label style="margin-top:.6rem">Nueva contraseña</label>
            <input name="newPassword" type="password" minlength="6" required />
            <div style="margin-top:.7rem">
              <button class="btn btn-primary" type="submit">Cambiar contraseña</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('f-profile').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api.users.updateMyProfile({
          fullName: String(fd.get('fullName') || '').trim(),
          email: String(fd.get('email') || '').trim(),
          phone: String(fd.get('phone') || '').trim(),
        });
        sessionProfile = await api.auth.me();
        setNav(parseRoute().name, sessionProfile);
        showToast('Perfil actualizado', false);
      } catch (err) {
        showToast(err.message, true);
      }
    });

    document.getElementById('f-password').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api.users.changeMyPassword({
          currentPassword: String(fd.get('currentPassword') || ''),
          newPassword: String(fd.get('newPassword') || ''),
        });
        e.target.reset();
        showToast('Contraseña actualizada', false);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  } catch (err) {
    view.innerHTML = '<div class="panel"><p class="meta">No se pudo cargar tu perfil.</p></div>';
    showToast(err.message, true);
  }
}

async function renderAdmin() {
  view.innerHTML = '<div class="panel"><p class="meta">Cargando administración…</p></div>';
  try {
    const [companies, permissions] = await Promise.all([api.admin.companies(), api.admin.permissions()]);
    const companyOptions = companies
      .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)} (${escapeHtml(c.code)})</option>`)
      .join('');
    view.innerHTML = `
      <div class="toolbar">
        <h1 style="margin:0;font-size:1.25rem">Administración global</h1>
      </div>
      <div class="grid-2" style="margin-bottom:1rem">
        <div class="panel">
          <h3 style="margin-top:0">Crear empresa</h3>
          <form id="f-company">
            <label>Nombre</label><input name="name" required minlength="2" />
            <label style="margin-top:.6rem">Codigo</label><input name="code" required minlength="2" />
            <div style="margin-top:.7rem"><button class="btn btn-primary" type="submit">Crear</button></div>
          </form>
        </div>
        <div class="panel">
          <h3 style="margin-top:0">Crear usuario de empresa</h3>
          <form id="f-company-user">
            <label>Empresa</label><select name="companyId">${companyOptions}</select>
            <label style="margin-top:.6rem">Nombre</label><input name="fullName" required />
            <label style="margin-top:.6rem">Correo</label><input name="email" type="email" required />
            <label style="margin-top:.6rem">Telefono</label><input name="phone" type="tel" required minlength="7" />
            <label style="margin-top:.6rem">Contraseña</label><input name="password" type="password" minlength="6" required />
            <label style="margin-top:.6rem">Rol</label>
            <select name="roleCode"><option value="COMPANY_ADMIN">COMPANY_ADMIN</option><option value="AUX">AUX</option></select>
            <div style="margin-top:.7rem"><button class="btn btn-primary" type="submit">Crear usuario</button></div>
          </form>
        </div>
      </div>
      <div class="panel" style="margin-bottom:1rem">
        <h3 style="margin-top:0">Empresas y módulos</h3>
        <div id="company-modules"></div>
      </div>
      <div class="panel">
        <h3 style="margin-top:0">Permisos disponibles</h3>
        <p class="meta">${permissions.map((p) => escapeHtml(p.code)).join(' · ')}</p>
      </div>
    `;

    async function loadCompanyModules() {
      const rows = await Promise.all(
        companies.map(async (c) => ({
          company: c,
          modules: await api.admin.companyModules(c.id),
        })),
      );
      document.getElementById('company-modules').innerHTML = rows
        .map(({ company, modules }) => {
          const checks = modules
            .map(
              (m) =>
                `<label style="display:inline-flex;gap:.35rem;margin-right:.6rem">
                  <input type="checkbox" data-company="${escapeHtml(company.id)}" data-module="${escapeHtml(m.moduleCode)}" ${
                    m.isEnabled ? 'checked' : ''
                  } />
                  ${escapeHtml(m.moduleCode)}
                </label>`,
            )
            .join('');
          return `<div class="panel" style="margin-bottom:.6rem"><strong>${escapeHtml(company.name)}</strong><div style="margin-top:.4rem">${checks}</div></div>`;
        })
        .join('');

      document.querySelectorAll('input[data-company][data-module]').forEach((el) => {
        el.addEventListener('change', async () => {
          const companyId = el.getAttribute('data-company');
          const currentChecks = Array.from(
            document.querySelectorAll(`input[data-company="${companyId}"][data-module]:checked`),
          ).map((x) => x.getAttribute('data-module'));
          try {
            await api.admin.setCompanyModules(companyId, { enabledModuleCodes: currentChecks });
            showToast('Módulos actualizados', false);
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });
    }

    await loadCompanyModules();

    document.getElementById('f-company').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api.admin.createCompany({
          name: String(fd.get('name') || '').trim(),
          code: String(fd.get('code') || '').trim(),
        });
        invalidateCatalogBundle();
        showToast('Empresa creada', false);
        await renderAdmin();
      } catch (err) {
        showToast(err.message, true);
      }
    });

    document.getElementById('f-company-user').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api.admin.createUser({
          companyId: fd.get('companyId'),
          fullName: String(fd.get('fullName') || '').trim(),
          email: String(fd.get('email') || '').trim(),
          phone: String(fd.get('phone') || '').trim(),
          password: String(fd.get('password') || ''),
          roleCode: fd.get('roleCode'),
        });
        invalidateUsersListCache();
        showToast('Usuario creado', false);
        e.target.reset();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  } catch (err) {
    view.innerHTML = '<div class="panel"><p class="meta">No se pudo cargar administración global.</p></div>';
    showToast(err.message, true);
  }
}

async function renderCatalogs() {
  view.innerHTML = '<div class="panel"><p class="meta">Cargando catalogos…</p></div>';

  async function loadCatalogs(selectedProductId, selectedTypeId) {
    const [products, types] = await Promise.all([api.catalogs.products(), api.catalogs.types()]);
    const productsRows =
      products
        .map((p) => `<tr><td>${escapeHtml(p.code)}</td><td>${escapeHtml(p.name)}</td></tr>`)
        .join('') || '<tr><td colspan="2" class="meta">Sin productos</td></tr>';
    const typesRows =
      types.map((t) => `<tr><td>${escapeHtml(t.code)}</td><td>${escapeHtml(t.name)}</td></tr>`).join('') ||
      '<tr><td colspan="2" class="meta">Sin tipos</td></tr>';

    view.innerHTML = `
      <div class="toolbar">
        <h1 style="margin:0;font-size:1.25rem">Catalogos</h1>
      </div>
      <div class="grid-2" style="margin-bottom:1rem">
        <div class="panel">
          <h3 style="margin-top:0">Registrar producto</h3>
          <form id="f-product-new">
            <label for="productName">Nombre</label>
            <input id="productName" name="name" minlength="2" required />
            <label for="productCode" style="margin-top:.6rem">Codigo (opcional)</label>
            <input id="productCode" name="code" placeholder="Se genera automaticamente si lo dejas vacio" />
            <div style="margin-top:.7rem">
              <button class="btn btn-primary" type="submit">Guardar producto</button>
            </div>
          </form>
        </div>
        <div class="panel">
          <h3 style="margin-top:0">Registrar tipo</h3>
          <form id="f-type-new">
            <label for="typeName">Nombre</label>
            <input id="typeName" name="name" minlength="2" required />
            <label for="typeCode" style="margin-top:.6rem">Codigo (opcional)</label>
            <input id="typeCode" name="code" placeholder="Se genera automaticamente si lo dejas vacio" />
            <div style="margin-top:.7rem">
              <button class="btn btn-primary" type="submit">Guardar tipo</button>
            </div>
          </form>
        </div>
      </div>
      <div class="grid-2">
        <div class="panel">
          <h3 style="margin-top:0">Productos registrados</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Codigo</th><th>Nombre</th></tr></thead>
              <tbody>${productsRows}</tbody>
            </table>
          </div>
        </div>
        <div class="panel">
          <h3 style="margin-top:0">Tipos registrados</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Codigo</th><th>Nombre</th></tr></thead>
              <tbody>${typesRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('f-product-new').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = String(fd.get('name') || '').trim();
      const codeRaw = String(fd.get('code') || '').trim();
      if (!name) {
        showToast('El nombre del producto es obligatorio', true);
        return;
      }
      try {
        const created = await api.catalogs.createProduct({
          name,
          code: codeRaw || undefined,
        });
        invalidateCatalogBundle();
        showToast('Producto registrado', false);
        await loadCatalogs(created.id, selectedTypeId);
      } catch (err) {
        showToast(err.message, true);
      }
    });

    document.getElementById('f-type-new').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = String(fd.get('name') || '').trim();
      const codeRaw = String(fd.get('code') || '').trim();
      if (!name) {
        showToast('El nombre del tipo es obligatorio', true);
        return;
      }
      try {
        const created = await api.catalogs.createType({
          name,
          code: codeRaw || undefined,
        });
        invalidateCatalogBundle();
        showToast('Tipo registrado', false);
        await loadCatalogs(selectedProductId, created.id);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  try {
    await loadCatalogs(null, null);
  } catch (err) {
    view.innerHTML = '<div class="panel"><p class="meta">No se pudieron cargar catalogos.</p></div>';
    showToast(err.message, true);
  }
}


async function renderTicketNew() {
  let statuses = [];
  let priorities = [];
  let products = [];
  let types = [];
  try {
    ({ statuses, priorities, products, types } = await fetchCatalogBundle());
  } catch (err) {
    view.innerHTML = `<div class="panel"><p>No se pudieron cargar catálogos.</p></div>`;
    showToast(err.message, true);
    return;
  }
  view.innerHTML = `
    <div class="toolbar">
      <h1 style="margin:0;font-size:1.25rem">Nuevo ticket</h1>
      <a class="btn btn-ghost" href="#/tickets">Volver</a>
    </div>
    <div class="panel">
      <form id="f-new" class="grid-2">
        <div style="grid-column:1/-1">
          <label for="title">Título</label>
          <input id="title" name="title" required minlength="3" />
        </div>
        <div style="grid-column:1/-1">
          <label for="description">Descripción</label>
          <textarea id="description" name="description" placeholder="Contexto, pasos, entorno…"></textarea>
        </div>
        <div>
          <label for="statusId">Estado</label>
          <select id="statusId" name="statusId">
            ${statuses.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="priorityId">Prioridad</label>
          <select id="priorityId" name="priorityId">
            ${priorities.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="productId">Producto</label>
          <select id="productId" name="productId" required>
            ${products.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="ticketTypeId">Tipo</label>
          <select id="ticketTypeId" name="ticketTypeId" required>
            ${types.map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join('')}
          </select>
        </div>
        <div style="grid-column:1/-1">
          <button class="btn btn-primary" type="submit">Crear</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('f-new').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      title: fd.get('title'),
      description: fd.get('description') || undefined,
      statusId: fd.get('statusId') || undefined,
      priorityId: fd.get('priorityId') || undefined,
      productId: fd.get('productId'),
      ticketTypeId: fd.get('ticketTypeId'),
    };
    try {
      const t = await api.tickets.create(payload);
      location.hash = `#/tickets/${t.id}`;
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

async function renderTicketDetail(id) {
  view.innerHTML = `<div class="panel"><p class="meta">Cargando ticket…</p></div>`;
  try {
    const [ticket, { statuses, priorities, products, types }, userList] = await Promise.all([
      api.tickets.get(id),
      fetchCatalogBundle(),
      fetchUsersListCached(),
    ]);

    view.innerHTML = `
      <div class="toolbar">
        <h1 style="margin:0;font-size:1.2rem">Ticket #${escapeHtml(ticket.id)}</h1>
        <a class="btn btn-ghost" href="#/tickets">Lista</a>
      </div>
      <div class="panel">
        <form id="f-ticket">
          <div class="grid-2">
            <div style="grid-column:1/-1">
              <label for="title">Título</label>
              <input id="title" name="title" value="${escapeHtml(ticket.title)}" required minlength="3" />
            </div>
            <div style="grid-column:1/-1">
              <label for="description">Descripción</label>
              <textarea id="description" name="description">${escapeHtml(ticket.description || '')}</textarea>
            </div>
            <div>
              <label for="statusId">Estado</label>
              <select id="statusId" name="statusId">
                ${statuses
                  .map(
                    (s) =>
                      `<option value="${escapeHtml(s.id)}" ${String(s.id) === String(ticket.statusId) ? 'selected' : ''}>${escapeHtml(s.name)}</option>`,
                  )
                  .join('')}
              </select>
            </div>
            <div>
              <label for="priorityId">Prioridad</label>
              <select id="priorityId" name="priorityId">
                ${priorities
                  .map(
                    (p) =>
                      `<option value="${escapeHtml(p.id)}" ${String(p.id) === String(ticket.priorityId) ? 'selected' : ''}>${escapeHtml(p.name)}</option>`,
                  )
                  .join('')}
              </select>
            </div>
            <div>
              <label for="productId">Producto</label>
              <select id="productId" name="productId">
                ${products
                  .map(
                    (p) =>
                      `<option value="${escapeHtml(p.id)}" ${String(p.id) === String(ticket.productId) ? 'selected' : ''}>${escapeHtml(p.name)}</option>`,
                  )
                  .join('')}
              </select>
            </div>
            <div>
              <label for="ticketTypeId">Tipo</label>
              <select id="ticketTypeId" name="ticketTypeId">
                ${types
                  .map(
                    (t) =>
                      `<option value="${escapeHtml(t.id)}" ${String(t.id) === String(ticket.ticketTypeId) ? 'selected' : ''}>${escapeHtml(t.name)}</option>`,
                  )
                  .join('')}
              </select>
            </div>
            <div style="grid-column:1/-1">
              <label for="assigneeId">Asignado a</label>
              <select id="assigneeId" name="assigneeId">
                <option value="">— Sin asignar —</option>
                ${userList
                  .map(
                    (u) =>
                      `<option value="${escapeHtml(u.id)}" ${String(u.id) === String(ticket.assigneeId || '') ? 'selected' : ''}>${escapeHtml(u.fullName)} (${escapeHtml(u.email)})</option>`,
                  )
                  .join('')}
              </select>
              ${
                userList.length === 0
                  ? '<p class="meta" style="margin:.4rem 0 0">No tienes permiso para reasignar usuarios.</p>'
                  : ''
              }
            </div>
          </div>
          <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
            <button class="btn btn-primary" type="submit">Guardar cambios</button>
            <button class="btn btn-ghost" id="btn-reassign-ticket" type="button">Reasignar sin duplicar</button>
            <button class="btn btn-ghost" id="btn-duplicate-ticket" type="button">Duplicar y asignar</button>
          </div>
        </form>
        <p class="meta" style="margin-top:1rem">
          Creado: ${escapeHtml(fmtDate(ticket.createdAt))} · Actualizado: ${escapeHtml(fmtDate(ticket.updatedAt))}
          ${ticket.closedAt ? ` · Cerrado: ${escapeHtml(fmtDate(ticket.closedAt))}` : ''}
        </p>
        <p class="meta">Producto: ${escapeHtml(ticket.product?.name || '—')} · Tipo: ${escapeHtml(ticket.ticketType?.name || '—')}</p>
        <p class="meta">
          Tiempo registrado: <strong>${escapeHtml(ticket.totalLoggedMinutes || 0)} min</strong>
          (${escapeHtml(ticket.totalLoggedHours || 0)} h)
        </p>

        <div class="comments">
          <h2 style="font-size:1.05rem;margin:0 0 0.5rem">Historial de movimientos</h2>
          <div>
            ${(ticket.events || [])
              .map(
                (ev) => `
              <div class="comment">
                <span class="who">${escapeHtml(ev.actor?.fullName || 'Sistema')}</span>
                <span class="when">${escapeHtml(fmtDate(ev.createdAt))}</span>
                <div class="body">${renderEventText(ev)}</div>
              </div>`,
              )
              .join('') || '<p class="meta">Sin movimientos registrados aún.</p>'}
          </div>
        </div>

        <div class="comments">
          <h2 style="font-size:1.05rem;margin:0 0 0.5rem">Comentarios</h2>
          <div id="comment-list">
            ${(ticket.comments || [])
              .map(
                (c) => `
              <div class="comment">
                <span class="who">${escapeHtml(c.author?.fullName || 'Usuario')}</span>
                <span class="when">${escapeHtml(fmtDate(c.createdAt))}</span>
                <div class="body">${escapeHtml(c.body)}</div>
              </div>`,
              )
              .join('') || '<p class="meta">Sin comentarios aún.</p>'}
          </div>
          <form id="f-comment" class="panel" style="background:var(--surface2);margin-top:0.5rem">
            <label for="body">Nuevo comentario</label>
            <textarea id="body" name="body" required minlength="1" placeholder="Escribe una actualización…"></textarea>
            <div style="margin-top:0.65rem">
              <button class="btn btn-primary" type="submit">Publicar</button>
            </div>
          </form>
        </div>

        <div class="comments">
          <h2 style="font-size:1.05rem;margin:0 0 0.5rem">Registro de tiempo</h2>
          <div>
            ${(ticket.worklogs || [])
              .map(
                (w) => `
              <div class="comment">
                <span class="who">${escapeHtml(w.author?.fullName || 'Usuario')}</span>
                <span class="when">${escapeHtml(fmtDate(w.createdAt))}</span>
                <div class="body">${escapeHtml(w.minutesSpent)} minutos${w.note ? ` · ${escapeHtml(w.note)}` : ''}</div>
              </div>`,
              )
              .join('') || '<p class="meta">Sin registros de tiempo aún.</p>'}
          </div>
          <form id="f-worklog" class="panel" style="background:var(--surface2);margin-top:0.5rem">
            <div class="grid-2">
              <div>
                <label for="minutesSpent">Minutos trabajados</label>
                <input id="minutesSpent" name="minutesSpent" type="number" min="1" max="1440" required />
              </div>
              <div>
                <label for="worklogNote">Nota (opcional)</label>
                <input id="worklogNote" name="note" />
              </div>
            </div>
            <div style="margin-top:0.65rem">
              <button class="btn btn-primary" type="submit">Registrar tiempo</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('f-ticket').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        title: fd.get('title'),
        description: fd.get('description'),
        statusId: fd.get('statusId'),
        priorityId: fd.get('priorityId'),
        productId: fd.get('productId'),
        ticketTypeId: fd.get('ticketTypeId'),
      };
      try {
        await api.tickets.update(id, payload);
        showToast('Cambios del ticket guardados', false);
        await renderTicketDetail(id);
      } catch (err) {
        showToast(err.message, true);
      }
    });

    document.getElementById('btn-reassign-ticket')?.addEventListener('click', async () => {
      const assigneeRaw = document.getElementById('assigneeId')?.value;
      const assigneeId = assigneeRaw === '' || assigneeRaw == null ? null : String(assigneeRaw);
      try {
        const updated = await api.tickets.reassign(id, { assigneeId });
        const assigneeLabel = updated?.assignee?.fullName || updated?.assignee?.email || 'Sin asignar';
        showToast(`Ticket reasignado a: ${assigneeLabel}`, false);
        await renderTicketDetail(id);
      } catch (err) {
        showToast(err.message, true);
      }
    });

    document.getElementById('btn-duplicate-ticket')?.addEventListener('click', async () => {
      const assigneeRaw = document.getElementById('assigneeId')?.value;
      if (!assigneeRaw) {
        showToast('Selecciona un usuario para duplicar y asignar.', true);
        return;
      }
      try {
        const duplicated = await api.tickets.duplicate(id, { assigneeId: String(assigneeRaw) });
        showToast(`Ticket duplicado: #${duplicated.id}`, false);
        location.hash = `#/tickets/${duplicated.id}`;
      } catch (err) {
        showToast(err.message, true);
      }
    });

    document.getElementById('f-comment').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api.tickets.comment(id, { body: fd.get('body') });
        e.target.reset();
        await renderTicketDetail(id);
      } catch (err) {
        showToast(err.message, true);
      }
    });

    document.getElementById('f-worklog').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api.tickets.addWorklog(id, {
          minutesSpent: Number(fd.get('minutesSpent')),
          note: fd.get('note') || undefined,
        });
        e.target.reset();
        await renderTicketDetail(id);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  } catch (err) {
    view.innerHTML = `<div class="panel"><p>No se pudo cargar el ticket.</p></div>`;
    showToast(err.message, true);
  }
}

async function render() {
  const route = parseRoute();
  const token = api.getToken();
  const isAuthRoute = route.name === 'login';
  if (token) {
    const needProfile = sessionProfileForToken !== token || !sessionProfile;
    if (needProfile) {
      try {
        sessionProfile = await api.auth.me();
        sessionProfileForToken = token;
      } catch {
        invalidateSessionProfile();
        api.setToken(null);
        location.hash = '#/login';
        return;
      }
    }
  } else {
    invalidateSessionProfile();
  }
  document.body.classList.toggle('auth-mode', !token && isAuthRoute);
  setNav(route.name, sessionProfile);
  setSidebar(route.name, Boolean(token), sessionProfile);

  if (!token && route.name !== 'login') {
    location.hash = '#/login';
    return;
  }
  if (token && route.name === 'login') {
    location.hash = '#/tickets';
    return;
  }

  if (heroTitle && heroSubtitle) {
    const heroMap = {
      login: ['Acceso seguro', 'Inicia sesion para gestionar la operacion de soporte.'],
      tickets: ['Centro de tickets', 'Visualiza y prioriza incidencias en tiempo real.'],
      'ticket-new': ['Nuevo ticket', 'Registra un caso con contexto y prioridad.'],
      'ticket-detail': ['Detalle de ticket', 'Controla estado, asignacion, historial y comentarios.'],
      incidents: ['Incidentes generales', 'Todos los usuarios pueden ver los incidentes abiertos.'],
      tasks: ['Mis tareas', 'Registra y controla tus tareas del dia a dia.'],
      profile: ['Mi perfil', 'Actualiza tu informacion personal y credenciales.'],
      admin: ['Administración global', 'Gestiona empresas, módulos y permisos globales.'],
      catalogs: ['Catalogos', 'Administra productos y tipos de ticket del sistema.'],
      reports: ['Dashboard de reportes', 'Consulta tiempos de resolucion y productividad.'],
    };
    const [title, subtitle] = heroMap[route.name] || heroMap.tickets;
    heroTitle.textContent = title;
    heroSubtitle.textContent = subtitle;
  }

  switch (route.name) {
    case 'login':
      await renderLogin();
      break;
    case 'incidents':
      await renderIncidents();
      break;
    case 'tasks':
      await renderTasks();
      break;
    case 'profile':
      await renderProfile();
      break;
    case 'admin':
      await renderAdmin();
      break;
    case 'catalogs':
      await renderCatalogs();
      break;
    case 'reports':
      await renderReports();
      break;
    case 'ticket-new':
      await renderTicketNew();
      break;
    case 'ticket-detail':
      await renderTicketDetail(route.id);
      break;
    default:
      await renderTicketList();
  }
}

function boot() {
  ensureGlobalLoader();
  bindGlobalLoaderEvents();
  menuToggle?.addEventListener('click', () => {
    const willOpen = !document.body.classList.contains('sidebar-open');
    setSidebarOpen(willOpen);
  });
  sidebarBackdrop?.addEventListener('click', () => setSidebarOpen(false));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1023) {
      setSidebarOpen(false);
      if (sidebarBackdrop) sidebarBackdrop.hidden = true;
    }
  });
  window.addEventListener('hashchange', () => render());
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
