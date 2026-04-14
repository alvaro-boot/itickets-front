import * as api from '../api.js';

const MENU = [
  { key: 'dashboard', label: 'Dashboard', href: 'index.html' },
  { key: 'tickets', label: 'Tickets', href: 'tickets.html' },
  { key: 'nuevo', label: 'Nuevo Ticket', href: 'ticket-new.html' },
  { key: 'listas', label: 'Listas', href: 'lists.html' },
  { key: 'reportes', label: 'Reportes', href: 'reports.html' },
];

function menuMarkup(active) {
  return MENU.map(
    (item) =>
      `<a href="${item.href}" class="${item.key === active ? 'active' : ''}">
        <span>${item.label}</span>
        <span>›</span>
      </a>`,
  ).join('');
}

export async function buildProtectedLayout({ active, title, subtitle }) {
  if (!api.getToken()) {
    location.href = 'login.html';
    return null;
  }

  let userName = 'Sesion activa';
  try {
    const me = await api.auth.me();
    userName = me.fullName || me.email || userName;
  } catch {
    api.setToken(null);
    location.href = 'login.html';
    return null;
  }

  document.body.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="index.html">
          <span class="brand-dot"></span>
          <span>ITickets</span>
        </a>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
          <span class="meta">${userName}</span>
          <button class="btn btn-ghost" id="btn-logout" type="button">Salir</button>
        </div>
      </header>
      <div class="layout">
        <aside class="sidebar">
          <h2>Modulo principal</h2>
          <nav class="menu">${menuMarkup(active)}</nav>
        </aside>
        <main class="content">
          <section class="hero">
            <h1>${title}</h1>
            <p>${subtitle}</p>
          </section>
          <section id="view"></section>
        </main>
      </div>
    </div>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
  `;

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    api.setToken(null);
    location.href = 'login.html';
  });

  return document.getElementById('view');
}
