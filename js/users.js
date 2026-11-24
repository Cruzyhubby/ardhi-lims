/* Ardhi LIMS — User management and role privileges */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;
  const $$ = UI.$$;

  const state = { tab: 'users', q: '', role: 'all', status: 'all' };

  const ROLES = {
    Owner: { icon: 'shield-check', desc: 'Full system access and all reports. Expenditure entry is restricted to the Accountant as a control.' },
    Manager: { icon: 'users', desc: 'Daily operations, staff supervision and operational reports. No privilege management and no expenditure entry.' },
    Accountant: { icon: 'receipt', desc: 'Finance account: records payments and manages expenditure entry. Other permissions pending clarification.' },
    Cashier: { icon: 'cash', desc: 'Collections account: records payments, customers and sales. No expenditure access.' }
  };

  const ROLE_ACCESS = {
    Owner: 'Full system access',
    Manager: 'Operations & operational reports',
    Accountant: 'Assigned access (pending specification)',
    Cashier: 'Assigned access (pending specification)'
  };

  const PERM_ROWS = [
    { label: 'Dashboard & overview', Owner: true, Manager: true, Accountant: 'pending', Cashier: 'pending' },
    { label: 'My performance (own activity)', Owner: true, Manager: true, Accountant: true, Cashier: true },
    { label: 'Land & plot records', Owner: true, Manager: true, Accountant: 'pending', Cashier: 'pending' },
    { label: 'Customer & sales records', Owner: true, Manager: true, Accountant: 'pending', Cashier: 'pending' },
    { label: 'Installment management', Owner: true, Manager: true, Accountant: 'pending', Cashier: 'pending' },
    { label: 'Record payments', Owner: true, Manager: true, Accountant: 'pending', Cashier: 'pending' },
    { label: 'Record expenditure', Owner: 'view', Manager: 'view', Accountant: true, Cashier: false },
    { label: 'Notifications & reminders', Owner: true, Manager: true, Accountant: true, Cashier: 'pending' },
    { label: 'Operational reports', Owner: true, Manager: true, Accountant: 'pending', Cashier: 'pending' },
    { label: 'All business reports', Owner: true, Manager: false, Accountant: false, Cashier: false },
    { label: 'Financial report (revenue & expenditure)', Owner: true, Manager: true, Accountant: true, Cashier: false },
    { label: 'User management', Owner: true, Manager: 'view', Accountant: false, Cashier: false },
    { label: 'Role & privilege management', Owner: true, Manager: false, Accountant: false, Cashier: false },
    { label: 'Sensitive settings', Owner: true, Manager: false, Accountant: false, Cashier: false }
  ];

  function permCell(v) {
    if (v === true) return '<span class="yes" title="Allowed">' + Icons.get('check') + '</span>';
    if (v === false) return '<span class="no" title="Not allowed">' + Icons.get('x') + '</span>';
    if (v === 'pending') return '<span class="pending-pill">Pending</span>';
    if (v === 'view') return '<span class="chip" style="font-size:10px">View only</span>';
    return '—';
  }

  function roleBadge(role) {
    const tones = { Owner: 'dark', Manager: 'blue', Accountant: 'green', Cashier: 'grey' };
    return '<span class="badge ' + (tones[role] || 'grey') + ' no-dot">' + UI.esc(role) + '</span>';
  }

  function userRow(u) {
    const isMe = App.user() && App.user().id === u.id;
    return '<tr data-user="' + u.id + '" data-role="' + UI.esc(u.role) + '" data-status="' + UI.esc(u.status) + '" data-search="' + UI.esc((u.name + ' ' + u.email + ' ' + u.phone + ' ' + u.role + ' ' + u.status).toLowerCase()) + '">' +
      '<td><div class="cell-user">' + UI.avatar(u.name) + '<div><div class="nm">' + UI.esc(u.name) + (isMe ? ' <span class="badge green no-dot" style="font-size:9px">You</span>' : '') + '</div><div class="sub">' + UI.esc(u.email) + '</div></div></div></td>' +
      '<td>' + roleBadge(u.role) + '<div class="t-sub" style="margin-top:3px">' + UI.esc(u.access) + '</div></td>' +
      '<td>' + UI.esc(u.phone || '—') + '</td>' +
      '<td>' + UI.badge(u.status) + '</td>' +
      '<td>' + UI.esc(u.lastActive) + '</td>' +
      '<td>' + UI.date(u.createdAt) + '</td>' +
      '<td><div class="actions">' +
        '<button class="icon-btn" style="width:30px;height:30px" data-view-user="' + u.id + '" title="View user" aria-label="View user">' + Icons.get('eye') + '</button>' +
        (App.can('userManage') ? '<button class="icon-btn" style="width:30px;height:30px" data-edit-user="' + u.id + '" title="Edit user" aria-label="Edit user">' + Icons.get('edit') + '</button>' : '') +
      '</div></td>' +
    '</tr>';
  }

  function userModal(u) {
    const acts = Store.db.activity.filter(a => a.user === u.name).slice(0, 6);
    const isMe = App.user().id === u.id;
    const canManage = App.can('userManage');
    const m = UI.modal({
      title: u.name,
      subtitle: u.role + ' · ' + u.id,
      size: 'lg',
      body: '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:16px">' +
          UI.avatar(u.name) +
          '<div style="flex:1;min-width:180px"><div style="font-size:16px;font-weight:650">' + UI.esc(u.name) + '</div><div class="small muted">' + UI.esc(u.email) + '</div></div>' +
          UI.badge(u.status) + roleBadge(u.role) +
        '</div>' +
        '<div class="kv-cards">' +
          '<div class="item"><div class="k">Phone</div><div class="v" style="font-size:13px">' + UI.esc(u.phone || '—') + '</div></div>' +
          '<div class="item"><div class="k">Account created</div><div class="v" style="font-size:13px">' + UI.date(u.createdAt) + '</div></div>' +
          '<div class="item"><div class="k">Last active</div><div class="v" style="font-size:13px">' + UI.esc(u.lastActive) + '</div></div>' +
        '</div>' +
        '<div class="balance-box" style="display:block;margin-top:14px"><div class="k">Assigned access</div><div class="strong" style="margin-top:2px">' + UI.esc(u.access) + '</div><div class="small muted" style="margin-top:4px">' + UI.esc(ROLES[u.role].desc) + '</div></div>' +
        (['Accountant', 'Cashier'].includes(u.role) ? '<div class="notice warn" style="margin-top:12px">' + Icons.get('alert') + '<div><strong>Permissions pending clarification.</strong> The PRD confirms these users have individual accounts and assigned access, but their complete permissions have not been finalised. No approval, correction or reversal workflow is defined.</div></div>' : '') +
        '<div style="margin-top:16px"><div class="k" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;margin-bottom:8px">Recent activity</div>' +
          (acts.length ? '<div class="timeline">' + acts.map(a => '<div class="timeline-item"><div class="tl-dot">' + Icons.get('clock') + '</div><div class="tl-body"><div class="tl-t">' + UI.esc(a.action) + '</div><div class="tl-s">' + UI.esc(a.module) + ' · ' + UI.dateTime(a.date) + '</div></div></div>').join('') + '</div>' :
            '<div class="muted small">No activity recorded for this user yet.</div>') +
        '</div>',
      footer: '<button class="btn btn-outline" data-act="close">Close</button>' +
        (canManage && !isMe ? '<button class="btn ' + (u.status === 'Active' ? 'btn-danger' : 'btn-outline') + '" data-act="toggle">' + Icons.get(u.status === 'Active' ? 'lock' : 'check') + (u.status === 'Active' ? 'Suspend account' : 'Reactivate account') + '</button>' : '') +
        (canManage ? '<button class="btn btn-primary" data-act="edit">' + Icons.get('edit') + 'Edit user</button>' : ''),
      onMount(el, close) {
        $('[data-act="close"]', el).addEventListener('click', close);
        const ed = $('[data-act="edit"]', el);
        if (ed) ed.addEventListener('click', () => { close(); userForm(u); });
        const tg = $('[data-act="toggle"]', el);
        if (tg) tg.addEventListener('click', async () => {
          const next = u.status === 'Active' ? 'Suspended' : 'Active';
          const ok = await UI.confirm({
            title: (next === 'Suspended' ? 'Suspend' : 'Reactivate') + ' ' + u.name + '?',
            message: next === 'Suspended' ? 'This demo account will be blocked from signing in until it is reactivated. No real account exists.' : 'This demo account will be able to sign in again.',
            confirmText: next === 'Suspended' ? 'Suspend account' : 'Reactivate',
            tone: next === 'Suspended' ? 'danger' : '',
            note: 'Only the Owner can change account status and privileges.'
          });
          if (!ok) return;
          Store.updateUser(u.id, { status: next });
          close();
          App.refresh();
          UI.toast(u.name + ' is now ' + next.toLowerCase() + '.');
        });
      }
    });
    return m;
  }

  function roleNotice(role) {
    if (role === 'Owner') return '<div class="notice green">' + Icons.get('shield-check') + '<div><strong>Owner.</strong> Full system access, all reports, user management, privilege management and sensitive settings. Only the Owner can assign, change or remove privileges.</div></div>';
    if (role === 'Manager') return '<div class="notice info">' + Icons.get('info') + '<div><strong>Manager.</strong> Daily operations, staff supervision and operational reports based on their own activities and staff reporting to them. <strong>No privilege management.</strong></div></div>';
    if (role === 'Accountant') return '<div class="notice warn">' + Icons.get('alert') + '<div><strong>Accountant.</strong> Individual account with assigned access. <strong>Expenditure entry is confirmed for this role</strong>; other permissions remain pending clarification.</div></div>';
    if (role === 'Cashier') return '<div class="notice warn">' + Icons.get('alert') + '<div><strong>Cashier.</strong> Collections account for payments, customers and sales. <strong>No expenditure access.</strong> Other permissions remain pending clarification.</div></div>';
    return '<div class="notice warn">' + Icons.get('alert') + '<div><strong>' + role + '.</strong> Individual account with assigned access. The PRD states that complete permissions are still pending clarification, so none are finalised here.</div></div>';
  }

  function userForm(existing) {
    if (!App.can('userManage')) { UI.toast('Only the Owner can manage users and privileges.', 'warn'); return; }
    const isSelf = existing && App.user().id === existing.id;
    const selectedRole = existing ? existing.role : 'Cashier';
    const m = UI.modal({
      title: existing ? 'Edit user' : 'Create user',
      subtitle: existing ? existing.name + ' · role and access' : 'Add a staff account to the demo',
      size: 'lg',
      body: '<form id="userForm" novalidate>' +
        '<div class="form-grid">' +
          '<div class="field" data-field="name"><label>Full name <span class="req">*</span></label><input class="input" name="name" value="' + UI.esc(existing ? existing.name : '') + '" placeholder="e.g. Asha Mwakyusa" /><span class="error-msg">Enter the user\'s full name.</span></div>' +
          '<div class="field" data-field="email"><label>Email address <span class="req">*</span></label><input class="input" name="email" type="email" value="' + UI.esc(existing ? existing.email : '') + '" placeholder="name@ardhi.co.tz" /><span class="error-msg">Enter a valid, unique email address.</span></div>' +
          '<div class="field" data-field="phone"><label>Phone number</label><input class="input" name="phone" value="' + UI.esc(existing ? existing.phone : '') + '" placeholder="+255 7xx xxx xxx" /><span class="error-msg">Enter a valid Tanzanian phone number.</span></div>' +
          '<div class="field" data-field="status"><label>Account status</label><select class="select" name="status" ' + (isSelf ? 'disabled' : '') + '>' + UI.options([{ value: 'Active', label: 'Active' }, { value: 'Suspended', label: 'Suspended' }], existing ? existing.status : 'Active') + '</select>' + (isSelf ? '<span class="hint">You cannot suspend your own account.</span>' : '') + '</div>' +
        '</div>' +
        '<div class="k" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;margin:18px 0 8px">Role assignment <span class="muted" style="text-transform:none;font-weight:400;letter-spacing:0">— Owner only</span></div>' +
        '<div class="grid grid-2" style="gap:10px" id="roleCards">' +
          Object.keys(ROLES).map(r => '<label class="radio-card ' + (r === selectedRole ? 'selected' : '') + '" style="' + (isSelf ? 'opacity:.7;pointer-events:none' : '') + '"><input type="radio" name="role" value="' + r + '" ' + (r === selectedRole ? 'checked' : '') + ' ' + (isSelf ? 'disabled' : '') + ' /><span><span class="t">' + r + '</span><span class="s" style="display:block">' + UI.esc(ROLES[r].desc) + '</span></span></label>').join('') +
        '</div>' +
        (isSelf ? '<div class="notice info" style="margin-top:12px">' + Icons.get('info') + '<div>You cannot change your own role or suspend yourself. You can still update your contact details.</div></div>' : '') +
        '<div id="roleNotice" style="margin-top:14px">' + roleNotice(selectedRole) + '</div>' +
        '<div class="notice" style="margin-top:12px">' + Icons.get('info') + '<div>Demo passwords are illustrative. Do not create real credentials in this mockup.</div></div>' +
      '</form>',
      footer: '<button class="btn btn-outline" data-x="cancel">Cancel</button><button class="btn btn-primary" type="submit" form="userForm">' + Icons.get(existing ? 'check' : 'plus') + (existing ? 'Save changes' : 'Create user') + '</button>',
      onMount(el, close) {
        const form = $('#userForm', el);
        $$('.radio-card', el).forEach(lbl => lbl.addEventListener('click', () => {
          if (isSelf) return;
          $$('.radio-card', el).forEach(x => x.classList.remove('selected'));
          lbl.classList.add('selected');
          $('#roleNotice', el).innerHTML = roleNotice(lbl.querySelector('input').value);
        }));
        $('[data-x="cancel"]', el).addEventListener('click', close);
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const data = UI.readForm(form);
          if (isSelf) data.role = existing.role;
          let ok = UI.validate(form, [
            { name: 'name', required: true, msg: 'Enter the user\'s full name.' },
            { name: 'email', required: true, test: UI.patterns.email, msg: 'Enter a valid email address.' },
            { name: 'phone', test: UI.patterns.phone, msg: 'Enter a valid Tanzanian phone number, e.g. +255 754 123 456.' }
          ]);
          const email = (form.elements.email.value || '').trim().toLowerCase();
          const dupe = Store.db.users.some(u => u.email.toLowerCase() === email && (!existing || u.id !== existing.id));
          if (dupe) { UI.fieldError(form.elements.email, 'This email is already used by another account.'); ok = false; }
          if (!ok) return;
          data.access = ROLE_ACCESS[data.role];
          if (existing) {
            Store.updateUser(existing.id, data);
            close();
            App.refresh();
            UI.toast('User account updated.');
          } else {
            const u = Store.addUser(data);
            close();
            App.refresh();
            UI.toast('User created — ' + u.name + ' (' + u.role + ').');
          }
        });
      }
    });
    return m;
  }

  V.users = {
    render() {
      const users = Store.db.users.slice();
      const counts = { Owner: 0, Manager: 0, Accountant: 0, Cashier: 0 };
      users.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1; });
      const canManage = App.can('userManage');
      const internal = Store.db.activity.filter(a => a.module === 'User Management').slice(0, 6);

      const rolesTab = '<div class="card-body">' +
        '<div class="notice warn" style="margin-bottom:16px">' + Icons.get('alert') + '<div><strong>Only the Owner can assign, change or remove user privileges.</strong> The Manager can supervise staff but must not access privilege management. Accountant and Cashier permissions remain pending clarification, except expenditure entry (Accountant) and financial report viewing (Owner, Manager, Accountant).</div></div>' +
        '<div style="overflow:auto"><table class="perm-matrix"><thead><tr><th>Capability</th><th class="center">Owner</th><th class="center">Manager</th><th class="center">Accountant</th><th class="center">Cashier</th></tr></thead><tbody>' +
          PERM_ROWS.map(r => '<tr><td>' + UI.esc(r.label) + '</td><td class="center">' + permCell(r.Owner) + '</td><td class="center">' + permCell(r.Manager) + '</td><td class="center">' + permCell(r.Accountant) + '</td><td class="center">' + permCell(r.Cashier) + '</td></tr>').join('') +
        '</tbody></table></div>' +
        '<div class="notice" style="margin-top:16px">' + Icons.get('info') + '<div><strong>Pending clarification.</strong> The detailed permission sets for the Accountant and Cashier, and the Manager\'s exact staff reporting scope, are not finalised in the PRD. The matrix marks those cells as pending rather than inventing access rights; expenditure entry and the financial report are the confirmed exceptions.</div></div>' +
      '</div>';

      const usersTab =
        '<div class="filter-bar">' +
          '<div class="field-inline" style="width:280px"><span data-x>' + Icons.get('search') + '</span><input class="input search-input" id="userSearch" placeholder="Search name, email, role…" value="' + UI.esc(state.q) + '" /></div>' +
          '<select class="select" id="userRole">' + UI.options([{ value: 'all', label: 'All roles' }, { value: 'Owner', label: 'Owner' }, { value: 'Manager', label: 'Manager' }, { value: 'Accountant', label: 'Accountant' }, { value: 'Cashier', label: 'Cashier' }], state.role) + '</select>' +
          '<select class="select" id="userStatus">' + UI.options([{ value: 'all', label: 'All statuses' }, { value: 'Active', label: 'Active' }, { value: 'Suspended', label: 'Suspended' }], state.status) + '</select>' +
          '<div class="spacer"></div><span class="filter-count" id="userCount"></span>' +
        '</div>' +
        '<div class="table-wrap"><table class="data" id="userTable"><thead><tr><th>User</th><th>Role & access</th><th>Phone</th><th>Status</th><th>Last active</th><th>Created</th><th></th></tr></thead><tbody>' +
          users.map(userRow).join('') + '</tbody></table></div>' +
        '<div class="table-foot"><span id="userFoot"></span><span class="muted small">' + (canManage ? 'Owner controls accounts, roles and privileges.' : 'Read-only: only the Owner can manage accounts and privileges.') + '</span></div>';

      return '<div class="page">' +
        '<div class="page-head-row"><div><h2>User Management</h2><div class="sub">Staff accounts, role assignment and access privileges. Only the Owner can change roles or privileges.</div></div>' +
          '<div class="page-actions">' + (canManage ? '<button class="btn btn-primary" data-act="new-user">' + Icons.get('plus') + 'Create user</button>' : '<span class="chip">' + Icons.get('lock') + 'Read-only · Owner manages privileges</span>') + '</div>' +
        '</div>' +
        '<div class="role-cards">' +
          Object.keys(ROLES).map(r => '<div class="role-card" data-rolecard="' + r + '" style="cursor:pointer"><div class="rc-top">' + Icons.get(ROLES[r].icon) + '<span class="rc-name">' + r + '</span><span class="rc-count">' + counts[r] + '</span></div><div class="rc-desc">' + UI.esc(ROLES[r].desc) + '</div></div>').join('') +
        '</div>' +
        '<div class="card">' +
          '<div class="tabs">' +
            '<button class="tab ' + (state.tab === 'users' ? 'active' : '') + '" data-tab="users">Users <span class="count">' + users.length + '</span></button>' +
            '<button class="tab ' + (state.tab === 'roles' ? 'active' : '') + '" data-tab="roles">Roles & privileges</button>' +
          '</div>' +
          (state.tab === 'users' ? usersTab : rolesTab) +
        '</div>' +
        (internal.length ? '<div class="card" style="margin-top:18px"><div class="card-head"><div><h3>Recent account activity</h3></div></div><div class="card-body"><div class="timeline">' +
          internal.map(a => '<div class="timeline-item"><div class="tl-dot">' + Icons.get('user') + '</div><div class="tl-body"><div class="tl-t">' + UI.esc(a.action) + '</div><div class="tl-s">' + UI.esc(a.user) + ' · ' + UI.dateTime(a.date) + '</div></div></div>').join('') + '</div></div></div>' : '') +
      '</div>';
    },

    mount(el) {
      $$('[data-tab]', el).forEach(b => b.addEventListener('click', () => { state.tab = b.getAttribute('data-tab'); App.refresh(); }));
      const add = $('[data-act="new-user"]', el);
      if (add) add.addEventListener('click', () => userForm(null));

      const search = $('#userSearch', el);
      const roleSel = $('#userRole', el);
      const statusSel = $('#userStatus', el);
      function apply() {
        const q = search ? search.value.toLowerCase() : '';
        const role = roleSel ? roleSel.value : 'all';
        const status = statusSel ? statusSel.value : 'all';
        state.q = q; state.role = role; state.status = status;
        const rows = $$('#userTable tbody tr', el);
        let visible = 0;
        rows.forEach(r => {
          let show = true;
          if (role !== 'all' && r.getAttribute('data-role') !== role) show = false;
          if (show && status !== 'all' && r.getAttribute('data-status') !== status) show = false;
          if (show && q && !(r.getAttribute('data-search') || '').includes(q)) show = false;
          r.style.display = show ? '' : 'none';
          if (show) visible++;
        });
        const cnt = $('#userCount', el); if (cnt) cnt.textContent = visible + ' of ' + rows.length;
        const foot = $('#userFoot', el); if (foot) foot.textContent = 'Showing ' + visible + ' of ' + rows.length + ' accounts';
      }
      if (search) {
        search.addEventListener('input', UI.debounce(apply, 140));
        roleSel.addEventListener('change', apply);
        statusSel.addEventListener('change', apply);
        apply();
      }

      $$('[data-rolecard]', el).forEach(card => card.addEventListener('click', () => {
        if (state.tab !== 'users') { state.tab = 'users'; }
        state.role = card.getAttribute('data-rolecard');
        state.q = ''; state.status = 'all';
        App.refresh();
      }));

      el.addEventListener('click', (e) => {
        const view = e.target.closest('[data-view-user]');
        if (view) { e.stopPropagation(); userModal(Store.user(view.getAttribute('data-view-user'))); return; }
        const edit = e.target.closest('[data-edit-user]');
        if (edit) { e.stopPropagation(); userForm(Store.user(edit.getAttribute('data-edit-user'))); return; }
        const row = e.target.closest('tr[data-user]');
        if (row) userModal(Store.user(row.getAttribute('data-user')));
      });
    }
  };
})(window);
