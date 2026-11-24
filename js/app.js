/* Ardhi LIMS — application shell, auth simulation, routing and permissions */
(function (global) {
  'use strict';

  const V = global.Views = global.Views || {};
  const $ = UI.$;
  const $$ = UI.$$;

  const NAV = [
    { group: 'Overview', items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', title: 'Dashboard', crumb: 'Overview' }
    ]},
    { group: 'Land & Inventory', items: [
      { id: 'land', label: 'Land Management', icon: 'land', title: 'Land Management', crumb: 'Land & Inventory' }
    ]},
    { group: 'Sales & Customers', items: [
      { id: 'customers', label: 'Customers', icon: 'customers', title: 'Customers', crumb: 'Sales & Customers' },
      { id: 'sales', label: 'Sales', icon: 'sales', title: 'Sales', crumb: 'Sales & Customers' }
    ]},
    { group: 'Finance', items: [
      { id: 'installments', label: 'Installment Management', icon: 'installments', title: 'Installment Management', crumb: 'Finance' },
      { id: 'payments', label: 'Payment Management', icon: 'payments', title: 'Payment Management', crumb: 'Finance' },
      { id: 'expenditures', label: 'Expenditure', icon: 'cash', title: 'Expenditure', crumb: 'Finance' },
      { id: 'financials', label: 'Financial Report', icon: 'reports', title: 'Financial Report', crumb: 'Finance' }
    ]},
    { group: 'Operations', items: [
      { id: 'notifications', label: 'Notifications & Reminders', icon: 'bell', title: 'Notifications & Reminders', crumb: 'Operations', badge: true },
      { id: 'reports', label: 'Reports', icon: 'reports', title: 'Reports', crumb: 'Operations' }
    ]},
    { group: 'Administration', items: [
      { id: 'users', label: 'User Management', icon: 'users', title: 'User Management', crumb: 'Administration' },
      { id: 'settings', label: 'Settings', icon: 'settings', title: 'Settings', crumb: 'Administration' }
    ]}
  ];

  const MODULES_BY_ROLE = {
    Owner: ['dashboard', 'land', 'customers', 'sales', 'installments', 'payments', 'expenditures', 'financials', 'notifications', 'reports', 'users', 'settings'],
    Manager: ['dashboard', 'land', 'customers', 'sales', 'installments', 'payments', 'expenditures', 'financials', 'notifications', 'reports', 'users', 'settings'],
    Accountant: ['dashboard', 'land', 'customers', 'sales', 'installments', 'payments', 'expenditures', 'financials', 'notifications'],
    Cashier: ['dashboard', 'customers', 'sales', 'installments', 'payments', 'notifications']
  };

  const CAPS = {
    Owner: { landWrite: true, customerWrite: true, saleWrite: true, paymentWrite: true, expenseWrite: false, userManage: true, settingsWrite: true, reportsAll: true, reportsOps: true },
    Manager: { landWrite: true, customerWrite: true, saleWrite: true, paymentWrite: true, expenseWrite: false, userManage: false, settingsWrite: false, reportsAll: false, reportsOps: true },
    Accountant: { landWrite: false, customerWrite: false, saleWrite: false, paymentWrite: true, expenseWrite: true, userManage: false, settingsWrite: false, reportsAll: false, reportsOps: false },
    Cashier: { landWrite: false, customerWrite: true, saleWrite: true, paymentWrite: true, expenseWrite: false, userManage: false, settingsWrite: false, reportsAll: false, reportsOps: false }
  };

  function currentUser() { return Store.currentUser(); }
  function role() { const u = currentUser(); return u ? u.role : null; }
  function can(cap) {
    const r = role();
    return !!(CAPS[r] && CAPS[r][cap]);
  }
  function canAccess(moduleId) {
    const r = role();
    return !!(MODULES_BY_ROLE[r] && MODULES_BY_ROLE[r].includes(moduleId));
  }

  /* ---------------- icons ---------------- */
  function paintIcons(root) {
    $$('[data-icon]', root || document).forEach(el => {
      el.innerHTML = Icons.get(el.getAttribute('data-icon'));
      el.removeAttribute('data-icon');
    });
    $$('[data-icon-btn]', root || document).forEach(el => {
      el.insertAdjacentHTML('afterbegin', Icons.get(el.getAttribute('data-icon-btn')));
      el.removeAttribute('data-icon-btn');
    });
    $$('[data-icon-mark]', root || document).forEach(el => {
      el.classList.add('brand-mark');
      el.innerHTML = Icons.get('leaf');
      el.removeAttribute('data-icon-mark');
    });
  }

  /* ---------------- login ---------------- */
  function renderLogin() {
    document.body.classList.remove('authed');
    const wrap = $('#demoAccounts');
    if (!wrap) return;
    wrap.innerHTML = Store.db.users.filter(u => ['Owner', 'Manager', 'Accountant', 'Cashier'].includes(u.role)).slice(0, 4).map(u =>
      '<button type="button" class="demo-chip" data-email="' + UI.esc(u.email) + '">' +
        UI.avatar(u.name) +
        '<span><span class="nm" style="display:block">' + UI.esc(u.name.split(' ')[0]) + '</span><span class="rl" style="display:block">' + UI.esc(u.role) + '</span></span>' +
      '</button>'
    ).join('');
    $$('.demo-chip', wrap).forEach(chip => chip.addEventListener('click', () => {
      $('#loginEmail').value = chip.getAttribute('data-email');
      $('#loginPassword').value = Store.DEMO_PASSWORD;
      clearLoginError();
    }));
    $('#loginEmail').value = 'salma@ardhi.co.tz';
    $('#loginPassword').value = Store.DEMO_PASSWORD;
  }

  function clearLoginError() {
    $$('.field', $('#loginForm')).forEach(f => f.classList.remove('invalid'));
    const err = $('#loginError');
    if (err) err.remove();
  }

  function bindLogin() {
    const form = $('#loginForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearLoginError();
      const email = $('#loginEmail').value.trim().toLowerCase();
      const pass = $('#loginPassword').value;
      const emailOk = UI.patterns.email.test(email);
      if (!emailOk) { $('#loginEmail').closest('.field').classList.add('invalid'); }
      if (!pass) { $('#loginPassword').closest('.field').classList.add('invalid'); }
      if (!emailOk || !pass) return;
      const user = Store.db.users.find(u => u.email.toLowerCase() === email);
      if (!user || pass !== Store.DEMO_PASSWORD) {
        form.insertAdjacentHTML('beforeend', '<div class="notice warn" id="loginError">' + Icons.get('alert') + '<div>Invalid demo credentials. Use one of the demo accounts and the password <strong>' + Store.DEMO_PASSWORD + '</strong>.</div></div>');
        return;
      }
      if (user.status !== 'Active') {
        form.insertAdjacentHTML('beforeend', '<div class="notice warn" id="loginError">' + Icons.get('alert') + '<div>This account is suspended. Contact the Owner to restore access.</div></div>');
        return;
      }
      Store.signIn(user.id);
      bootApp();
      UI.toast('Welcome, ' + UI.esc(user.name.split(' ')[0]) + '. Signed in as ' + user.role + '.');
    });
    $('#forgotBtn').addEventListener('click', () => {
      UI.modal({
        title: 'Password assistance',
        body: '<div class="notice info">' + Icons.get('info') + '<div>This is a prototype. Password reset by email is not implemented. Use the password <strong>' + Store.DEMO_PASSWORD + '</strong> for any demo account.</div></div>',
        footer: '<button class="btn btn-primary" data-x="ok">Got it</button>',
        onMount(el, close) { el.querySelector('[data-x="ok"]').addEventListener('click', close); }
      });
    });
  }

  /* ---------------- shell ---------------- */
  function renderNav() {
    const r = role();
    const allowed = MODULES_BY_ROLE[r] || [];
    const unread = Store.unreadInternalCount();
    const navWrap = $('#sidebarNav');
    navWrap.innerHTML = NAV.map(group => {
      const items = group.items.filter(i => allowed.includes(i.id));
      if (!items.length) return '';
      return '<div class="nav-group"><div class="nav-label">' + UI.esc(group.group) + '</div>' +
        items.map(item =>
          '<button class="nav-item" data-nav="' + item.id + '" data-title="' + UI.esc(item.label) + '">' +
            Icons.get(item.icon) + '<span class="nav-text">' + UI.esc(item.label) + '</span>' +
            (item.badge && unread ? '<span class="nav-badge">' + unread + '</span>' : '') +
          '</button>'
        ).join('') + '</div>';
    }).join('');
    $$('.nav-item', navWrap).forEach(btn => btn.addEventListener('click', () => {
      App.go('/' + btn.getAttribute('data-nav'));
      document.querySelector('.app-shell').classList.remove('sidebar-open');
    }));
    const u = currentUser();
    $('#sidebarUser').innerHTML =
      UI.avatar(u.name) +
      '<div class="meta"><div class="nm">' + UI.esc(u.name) + '</div><div class="rl">' + UI.esc(u.role) + '</div></div>' +
      '<button class="icon-btn" id="sidebarSignOut" title="Sign out" aria-label="Sign out">' + Icons.get('logout') + '</button>';
    $('#sidebarSignOut').addEventListener('click', signOut);
  }

  function renderUserBtn() {
    const u = currentUser();
    $('#userMenuBtn').innerHTML =
      UI.avatar(u.name) + '<div class="meta"><div class="nm">' + UI.esc(u.name) + '</div><div class="rl">' + UI.esc(u.role) + '</div></div>' + Icons.get('chevron-down');
  }

  function updateBadge() {
    const n = Store.unreadInternalCount();
    const b = $('#notifBadge');
    if (b) {
      b.textContent = n;
      b.classList.toggle('hidden', n === 0);
      if (n > 0) b.style.display = '';
    }
    const navBadge = $('[data-nav="notifications"] .nav-badge');
    if (navBadge) { navBadge.textContent = n; navBadge.style.display = n ? '' : 'none'; }
    else if (n > 0) renderNav();
    else {
      const nb = $('[data-nav="notifications"]');
      if (nb) nb.querySelector('.nav-badge') && nb.querySelector('.nav-badge').remove();
    }
  }

  function closeMenus() {
    $$('.menu, .notif-panel').forEach(m => m.remove());
  }

  /* ---------------- user menu ---------------- */
  function openUserMenu() {
    closeMenus();
    const wrap = $('#userMenuWrap');
    const u = currentUser();
    const demoUsers = Store.db.users.filter(x => ['Owner', 'Manager', 'Accountant', 'Cashier'].includes(x.role)).slice(0, 4);
    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.innerHTML =
      '<div class="menu-head"><div class="nm">' + UI.esc(u.name) + '</div><div class="rl">' + UI.esc(u.role) + ' · ' + UI.esc(u.email) + '</div></div>' +
      '<div class="menu-label">Switch demo account</div>' +
      demoUsers.map(x => '<button class="menu-item" data-switch="' + x.id + '">' + UI.avatar(x.name, 'sm') + '<span style="flex:1">' + UI.esc(x.name) + '<div class="small muted">' + UI.esc(x.role) + '</div></span>' + (x.id === u.id ? '<span class="check">' + Icons.get('check') + '</span>' : '') + '</button>').join('') +
      '<div class="menu-sep"></div>' +
      '<a class="menu-item" href="customer-portal.html" target="_blank" rel="noopener">' + Icons.get('external') + 'Open customer portal</a>' +
      '<button class="menu-item" data-act="reset">' + Icons.get('refresh') + 'Reset demo data</button>' +
      '<button class="menu-item danger" data-act="signout">' + Icons.get('logout') + 'Sign out</button>';
    wrap.appendChild(menu);
    $$('[data-switch]', menu).forEach(btn => btn.addEventListener('click', () => {
      const u2 = Store.user(btn.getAttribute('data-switch'));
      if (u2.status !== 'Active') { UI.toast('This demo account is suspended.', 'warn'); return; }
      Store.signIn(u2.id);
      closeMenus();
      bootApp();
      UI.toast('Now viewing as ' + u2.name + ' (' + u2.role + ').');
    }));
    menu.querySelector('[data-act="signout"]').addEventListener('click', signOut);
    menu.querySelector('[data-act="reset"]').addEventListener('click', async () => {
      closeMenus();
      const ok = await UI.confirm({
        title: 'Reset demo data?',
        message: 'All changes made during this session will be discarded and the original fictional sample data will be restored.',
        confirmText: 'Reset data',
        tone: 'danger'
      });
      if (ok) { Store.reset(); bootApp(); UI.toast('Demo data has been reset.'); }
    });
  }

  function signOut() {
    closeMenus();
    Store.signOut();
    document.body.classList.remove('authed');
    history.replaceState(null, '', location.pathname + location.search);
    renderLogin();
    paintIcons();
    UI.toast('Signed out of the demo.');
  }

  /* ---------------- notifications panel ---------------- */
  function openNotifPanel() {
    closeMenus();
    const wrap = $('#notifBtn').parentElement;
    const items = Store.db.notifications.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
    const icons = { overdue: ['alert', 'red'], reminder: ['clock', 'amber'], 'due-today': ['clock', 'amber'], confirmation: ['check-circle', 'green'], receipt: ['receipt', 'green'], welcome: ['users', 'blue'] };
    const panel = document.createElement('div');
    panel.className = 'notif-panel';
    panel.innerHTML =
      '<div class="np-head"><h4>Notifications</h4><div class="right"><button class="btn-link" data-act="readall">Mark all read</button></div></div>' +
      '<div class="np-list">' + (items.length ? items.map(n => {
        const ic = icons[n.kind] || ['bell', ''];
        return '<div class="np-item ' + (n.status === 'Unread' ? 'unread' : '') + '" data-nid="' + n.id + '">' +
          '<div class="np-icon ' + ic[1] + '">' + Icons.get(ic[0]) + '</div>' +
          '<div class="np-body"><div class="np-title">' + UI.esc(n.title) + '</div><div class="np-sub">' + UI.esc(n.message.length > 96 ? n.message.slice(0, 96) + '…' : n.message) + '</div><div class="np-time">' + UI.relTime(n.date) + ' · ' + UI.esc(n.channel) + '</div></div>' +
        '</div>';
      }).join('') : '<div class="empty-state" style="padding:34px 18px"><div class="icon-wrap">' + Icons.get('bell') + '</div><h4>No notifications</h4><p>Reminders and overdue alerts will appear here.</p></div>') + '</div>' +
      '<div class="np-foot"><button data-act="viewall">View all notifications</button></div>';
    wrap.appendChild(panel);
    $$('.np-item', panel).forEach(el => el.addEventListener('click', () => {
      Store.markNotificationRead(el.getAttribute('data-nid'));
      updateBadge();
      closeMenus();
      App.go('/notifications', () => global.NotificationsView && global.NotificationsView.open(el.getAttribute('data-nid')));
    }));
    panel.querySelector('[data-act="readall"]').addEventListener('click', () => {
      Store.markAllInternalRead();
      closeMenus();
      updateBadge();
      UI.toast('All internal notifications marked as read.');
      if (location.hash.startsWith('#/notifications')) App.refresh();
    });
    panel.querySelector('[data-act="viewall"]').addEventListener('click', () => { closeMenus(); App.go('/notifications'); });
  }

  /* ---------------- global search ---------------- */
  function bindGlobalSearch() {
    const input = $('#globalSearchInput');
    const box = $('#globalSearch');
    let resultsEl = null;

    function closeResults() { if (resultsEl) { resultsEl.remove(); resultsEl = null; } }

    function search(q) {
      closeResults();
      if (!q) return;
      const term = q.toLowerCase();
      const customers = Store.db.customers.filter(c => (c.name + ' ' + c.phone + ' ' + c.nida).toLowerCase().includes(term)).slice(0, 4);
      const plots = Store.db.plots.filter(p => (p.plotNo + ' ' + p.use).toLowerCase().includes(term)).slice(0, 4);
      const sales = Store.db.sales.filter(s => (s.id + ' ' + s.ref).toLowerCase().includes(term)).slice(0, 3);
      const projects = Store.db.projects.filter(p => p.name.toLowerCase().includes(term)).slice(0, 2);
      const total = customers.length + plots.length + sales.length + projects.length;
      resultsEl = document.createElement('div');
      resultsEl.className = 'search-results';
      if (!total) {
        resultsEl.innerHTML = '<div class="empty">No matches for “' + UI.esc(q) + '”</div>';
      } else {
        let html = '';
        if (customers.length) {
          html += '<div class="group-label">Customers</div>' + customers.map(c =>
            '<button class="result" data-kind="customer" data-id="' + c.id + '">' + Icons.get('user') + '<span><span class="t">' + UI.esc(c.name) + '</span><div class="s">' + UI.esc(c.phone) + ' · ' + c.id + '</div></span><span class="go">' + Icons.get('arrow-up-right') + '</span></button>').join('');
        }
        if (plots.length) {
          html += '<div class="group-label">Plots</div>' + plots.map(p =>
            '<button class="result" data-kind="plot" data-id="' + p.id + '">' + Icons.get('plots') + '<span><span class="t">Plot ' + UI.esc(p.plotNo) + '</span><div class="s">' + UI.esc(Store.project(p.projectId).name) + ' · ' + p.size + ' sqm</div></span><span class="go">' + Icons.get('arrow-up-right') + '</span></button>').join('');
        }
        if (sales.length) {
          html += '<div class="group-label">Sales</div>' + sales.map(s =>
            '<button class="result" data-kind="sale" data-id="' + s.id + '">' + Icons.get('sales') + '<span><span class="t">' + UI.esc(s.id) + '</span><div class="s">' + UI.esc(Store.customer(s.customerId).name) + ' · ' + UI.esc(s.ref) + '</div></span><span class="go">' + Icons.get('arrow-up-right') + '</span></button>').join('');
        }
        if (projects.length) {
          html += '<div class="group-label">Projects</div>' + projects.map(p =>
            '<button class="result" data-kind="project" data-id="' + p.id + '">' + Icons.get('land') + '<span><span class="t">' + UI.esc(p.name) + '</span><div class="s">' + UI.esc(p.district) + ', ' + UI.esc(p.region) + '</div></span><span class="go">' + Icons.get('arrow-up-right') + '</span></button>').join('');
        }
        resultsEl.innerHTML = html;
      }
      box.appendChild(resultsEl);
      $$('.result', resultsEl).forEach(btn => btn.addEventListener('click', () => {
        const kind = btn.getAttribute('data-kind');
        const id = btn.getAttribute('data-id');
        closeResults();
        input.value = '';
        if (kind === 'customer') App.go('/customers', () => V.customers && V.customers.openDetail(id));
        if (kind === 'plot') App.go('/land', () => V.land && V.land.openPlot(id));
        if (kind === 'sale') App.go('/sales', () => V.sales && V.sales.openSale(id));
        if (kind === 'project') App.go('/land', () => V.land && V.land.openProject(id));
      }));
    }

    input.addEventListener('input', UI.debounce(() => search(input.value.trim()), 200));
    input.addEventListener('focus', () => { if (input.value.trim()) search(input.value.trim()); });
    document.addEventListener('mousedown', (e) => {
      if (!box.contains(e.target)) closeResults();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault(); input.focus();
      }
      if (e.key === 'Escape') closeResults();
    });
  }

  /* ---------------- routing ---------------- */
  const ROUTE_TITLES = {
    dashboard: ['Dashboard', 'Overview'],
    land: ['Land Management', 'Land & Inventory'],
    customers: ['Customers', 'Sales & Customers'],
    sales: ['Sales', 'Sales & Customers'],
    installments: ['Installment Management', 'Finance'],
    payments: ['Payment Management', 'Finance'],
    expenditures: ['Expenditure', 'Finance'],
    financials: ['Financial Report', 'Finance'],
    notifications: ['Notifications & Reminders', 'Operations'],
    reports: ['Reports', 'Operations'],
    users: ['User Management', 'Administration'],
    settings: ['Settings', 'Administration']
  };

  let pendingAfter = null;
  let currentRoute = null;

  function parseHash() {
    let h = location.hash.replace(/^#\/?/, '');
    if (!h) h = 'dashboard';
    const parts = h.split('/');
    return { section: parts[0] || 'dashboard', param: parts[1] || null };
  }

  function render() {
    const { section, param } = parseHash();
    currentRoute = section + (param ? '/' + param : '');
    if (!currentUser()) { renderLogin(); return; }
    closeMenus();

    if (!canAccess(section) || !V[section]) {
      const title = 'Access restricted';
      $('#pageTitle').textContent = title;
      $('#pageCrumb').textContent = 'Ardhi LIMS';
      $('#view').innerHTML = '<div class="card"><div class="card-body">' +
        UI.emptyState('lock', 'This area is not available for your role', 'Your demo access profile does not include this module. Access for Accountant and Cashier is still pending confirmation in the PRD.', '<button class="btn btn-primary" style="margin-top:14px" onclick="App.go(\'/dashboard\')">Back to dashboard</button>') +
        '</div></div>';
      setActiveNav(section);
      return;
    }

    const view = V[section];
    const titles = ROUTE_TITLES[section] || ['Ardhi LIMS', 'Overview'];
    let title = titles[0], crumb = titles[1];
    if (view.titleFor) { const t = view.titleFor(param); if (t) { title = t[0]; crumb = t[1] || crumb; } }
    $('#pageTitle').textContent = title;
    $('#pageCrumb').innerHTML = UI.esc(crumb) + ' <span class="sep">/</span> ' + UI.esc(title);
    document.title = title + ' · Ardhi LIMS';

    let viewEl = $('#view');
    const freshView = viewEl.cloneNode(false);
    viewEl.parentNode.replaceChild(freshView, viewEl);
    viewEl = freshView;
    let banner = '';
    const r = role();
    if (r === 'Accountant' || r === 'Cashier') {
      banner = '<div class="banner-role">' + Icons.get('info') + '<div><strong>Demo access profile · ' + UI.esc(r) + '.</strong> Detailed permissions for this role are <strong>pending confirmation</strong> in the PRD. Modules and actions shown here are illustrative only.</div></div>';
    }
    if (r === 'Accountant' && Store.unreadInternalCount() > 0 && section !== 'notifications') {
      banner += '<div class="alert-strip">' + Icons.get('bell') + '<div><strong>You have a new message.</strong> An installment has become overdue and needs review in your notification center.</div><button class="btn btn-sm btn-primary" onclick="App.go(\'/notifications\')">Review</button></div>';
    }
    try {
      const html = view.render(param) || '';
      viewEl.innerHTML = banner + html;
      viewEl.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
      if (view.mount) view.mount(viewEl, param);
    } catch (err) {
      console.error(err);
      viewEl.innerHTML = '<div class="card"><div class="card-body"><div class="notice warn">' + Icons.get('alert') + '<div><strong>Something went wrong rendering this page.</strong><br>' + UI.esc(err.message) + '</div></div></div></div>';
    }
    setActiveNav(section);
    updateBadge();
    paintIcons(viewEl);

    if (pendingAfter) { const fn = pendingAfter; pendingAfter = null; try { fn(); } catch (e) { console.error(e); } }
  }

  function setActiveNav(section) {
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.getAttribute('data-nav') === section));
  }

  function bootApp() {
    const u = currentUser();
    if (!u) { renderLogin(); paintIcons(); return; }
    document.body.classList.add('authed');
    closeMenus();
    renderNav();
    renderUserBtn();
    updateBadge();
    const collapsed = localStorage.getItem('ardhi_sidebar_collapsed') === '1';
    $('#appShell').classList.toggle('collapsed', collapsed);
    if (!location.hash) {
      App.go('/dashboard');
    } else {
      render();
    }
    if (global.NotificationsView && global.NotificationsView.refreshBell) global.NotificationsView.refreshBell();
  }

  /* ---------------- boot ---------------- */
  function init() {
    Store.init();
    paintIcons();
    renderLogin();
    bindLogin();

    $('#collapseBtn').addEventListener('click', () => {
      const shell = $('#appShell');
      const next = !shell.classList.contains('collapsed');
      shell.classList.toggle('collapsed', next);
      localStorage.setItem('ardhi_sidebar_collapsed', next ? '1' : '0');
    });
    $('#mobileMenuBtn').addEventListener('click', () => $('#appShell').classList.add('sidebar-open'));
    $('#sidebarOverlay').addEventListener('click', () => $('#appShell').classList.remove('sidebar-open'));
    $('#notifBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      if ($('.notif-panel')) { closeMenus(); return; }
      openNotifPanel();
    });
    $('#userMenuBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      if ($('#userMenuWrap .menu')) { closeMenus(); return; }
      openUserMenu();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.menu-wrap') && !e.target.closest('.notif-panel')) closeMenus();
    });
    bindGlobalSearch();
    window.addEventListener('hashchange', () => render());

    if (currentUser()) bootApp();
    else renderLogin();
  }

  const App = {
    go(route, after) {
      const target = '#' + (route.startsWith('/') ? route : '/' + route);
      if (location.hash === target) {
        pendingAfter = after || null;
        render();
      } else {
        pendingAfter = after || null;
        location.hash = target;
      }
    },
    refresh() { render(); },
    render,
    can,
    canAccess,
    role: () => role(),
    user: () => currentUser(),
    bootApp,
    updateBadge,
    signOut,
    isActive(route) { return currentRoute === route.replace(/^\//, ''); },
    defaultRoute() { return '/dashboard'; }
  };

  global.App = App;
  window.addEventListener('DOMContentLoaded', init);
})(window);
