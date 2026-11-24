/* Ardhi LIMS — Notifications & reminders */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;
  const $$ = UI.$$;

  const state = { tab: 'customer', q: '', kind: 'all', channel: 'all' };

  const KIND = {
    overdue: { label: 'Overdue reminder', icon: 'alert', tone: 'red' },
    reminder: { label: 'Upcoming reminder', icon: 'clock', tone: 'amber' },
    'due-today': { label: 'Payment due today', icon: 'clock', tone: 'amber' },
    confirmation: { label: 'Payment confirmation', icon: 'check-circle', tone: 'green' },
    receipt: { label: 'Receipt notification', icon: 'receipt', tone: 'green' },
    welcome: { label: 'Portal welcome', icon: 'users', tone: 'blue' }
  };

  const CHANNEL_ICON = { SMS: 'smartphone', WhatsApp: 'message', Email: 'mail', Internal: 'bell' };

  function kindMeta(k) { return KIND[k] || { label: k, icon: 'bell', tone: '' }; }
  function channelIcon(ch) { return Icons.get(CHANNEL_ICON[ch] || 'send'); }

  function noteContext(n) {
    const c = n.customerId ? Store.customer(n.customerId) : null;
    const s = n.saleId ? Store.sale(n.saleId) : null;
    const plan = n.planId ? Store.plan(n.planId) : (s ? Store.planBySale(s.id) : null);
    const st = plan ? Store.planStats(plan) : null;
    return { c, s, plan, st };
  }

  function relatedLine(n) {
    const ctx = noteContext(n);
    if (!ctx.s) return '<span class="muted">—</span>';
    if (ctx.st && ctx.st.overdue) return '<span class="t-main tone-red">' + ctx.st.overdue + ' overdue</span><div class="t-sub">' + UI.moneyShort(ctx.st.overdueAmount) + '</div>';
    if (ctx.st && ctx.st.next) return '<span class="t-main">Next #' + ctx.st.next.n + '</span><div class="t-sub">due ' + UI.date(ctx.st.next.dueDate) + '</div>';
    return '<span class="t-main">' + UI.esc(ctx.s.id) + '</span><div class="t-sub">' + (ctx.st && ctx.st.completed ? 'Completed' : '') + '</div>';
  }

  function customerRow(n) {
    const km = kindMeta(n.kind);
    const ctx = noteContext(n);
    return '<tr class="clickable" data-note="' + n.id + '" data-kind="' + n.kind + '" data-channel="' + UI.esc(n.channel) + '" data-search="' + UI.esc((n.title + ' ' + n.message + ' ' + (ctx.c ? ctx.c.name + ' ' + ctx.c.phone : '') + ' ' + (ctx.s ? ctx.s.id + ' ' + ctx.s.ref : '') + ' ' + n.channel + ' ' + n.status).toLowerCase()) + '">' +
      '<td><div style="display:flex;gap:10px;align-items:flex-start"><div class="ni-icon ' + km.tone + '" style="width:30px;height:30px;border-radius:8px;display:grid;place-items:center;flex:none">' + Icons.get(km.icon) + '</div><div><div class="t-main">' + UI.esc(n.title) + '</div><div class="t-sub" style="max-width:360px;white-space:normal">' + UI.esc(n.message.length > 110 ? n.message.slice(0, 110) + '…' : n.message) + '</div></div></div></td>' +
      '<td>' + (ctx.c ? '<div class="t-main">' + UI.esc(ctx.c.name) + '</div><div class="t-sub">' + UI.esc(ctx.c.phone) + '</div>' : '—') + '</td>' +
      '<td>' + (ctx.s ? '<div class="t-main mono">' + UI.esc(ctx.s.id) + '</div>' : '') + relatedLine(n) + '</td>' +
      '<td><span class="chip outline">' + channelIcon(n.channel) + UI.esc(n.channel) + '</span></td>' +
      '<td><div>' + UI.date(n.date) + '</div><div class="t-sub">' + UI.relTime(n.date) + '</div></td>' +
      '<td>' + UI.badge(n.status) + '</td>' +
      '<td><button class="btn btn-sm btn-ghost" data-open-note="' + n.id + '">View</button></td>' +
    '</tr>';
  }

  function internalItem(n) {
    const km = kindMeta(n.kind);
    const ctx = noteContext(n);
    return '<div class="notif-item ' + (n.status === 'Unread' ? 'unread' : '') + '" data-note="' + n.id + '">' +
      '<div class="ni-icon ' + km.tone + '">' + Icons.get(km.icon) + '</div>' +
      '<div class="ni-body">' +
        '<div class="ni-title">' + UI.esc(n.title) + ' ' + (n.status === 'Unread' ? '<span class="new-dot"></span>' : '') + (n.amount ? '<span class="badge red no-dot">' + UI.moneyShort(n.amount) + '</span>' : '') + '</div>' +
        '<div class="ni-msg">' + UI.esc(n.message) + '</div>' +
        '<div class="ni-meta"><span>' + (ctx.c ? UI.esc(ctx.c.name) + ' · ' + UI.esc(ctx.c.phone) : 'System') + '</span><span>' + (ctx.s ? UI.esc(ctx.s.id) + ' · ' + UI.esc(ctx.s.ref) : '') + '</span>' + (ctx.st && ctx.st.overdue ? '<span>' + ctx.st.overdue + ' installment(s) overdue · ' + UI.moneyShort(ctx.st.overdueAmount) + '</span>' : '') + '<span>' + UI.dateTime(n.date) + '</span></div>' +
      '</div>' +
      '<div class="ni-right">' + UI.badge(n.status) + '<button class="btn btn-sm btn-outline" data-open-note="' + n.id + '">Open</button>' + (n.status === 'Unread' ? '<button class="btn-link" data-read-note="' + n.id + '">Mark read</button>' : '') + '</div>' +
    '</div>';
  }

  function noteModal(id) {
    const n = Store.notification(id);
    if (!n) { UI.toast('Notification not found.', 'warn'); return; }
    const ctx = noteContext(n);
    const km = kindMeta(n.kind);
    const isInternal = n.audience === 'internal';
    const payment = n.receiptNo ? Store.db.payments.find(p => p.receiptNo === n.receiptNo) : null;
    const related = Store.db.notifications.filter(x => x.saleId && x.saleId === n.saleId && x.id !== n.id).slice(0, 4);
    const wasUnread = n.status === 'Unread';
    Store.markNotificationRead(n.id);
    App.updateBadge();

    const m = UI.modal({
      title: n.title,
      subtitle: (isInternal ? 'Internal notification' : 'Customer notification') + ' · ' + UI.dateTime(n.date),
      size: 'lg',
      body:
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">' +
          '<span class="badge ' + km.tone + ' no-dot">' + UI.esc(km.label) + '</span>' +
          '<span class="chip outline">' + channelIcon(n.channel) + UI.esc(n.channel) + '</span>' +
          UI.badge(n.status === 'Read' ? 'Read' : n.status) +
          (n.amount ? '<span class="chip">' + UI.money(n.amount) + '</span>' : '') +
        '</div>' +
        '<div class="msg-preview">' + UI.esc(n.message) +
          '<div class="msg-meta">' + (isInternal ? 'Delivered to the internal notification centre' : 'Channel: ' + UI.esc(n.channel) + ' · Recipient: ' + UI.esc(ctx.c ? ctx.c.name + ' ' + ctx.c.phone : '—')) + ' · ' + UI.dateTime(n.date) + '</div>' +
        '</div>' +
        (ctx.c ? '<div class="balance-box" style="margin-top:16px;display:block"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div style="flex:1"><div class="k">Customer</div><div class="strong">' + UI.esc(ctx.c.name) + '</div><div class="small muted">' + UI.esc(ctx.c.phone) + ' · ' + UI.esc(ctx.c.id) + ' · NIDA ' + UI.esc(ctx.c.nida) + '</div></div><button class="btn btn-sm btn-outline" data-act="customer">Open customer</button></div></div>' : '') +
        (ctx.s ? '<div class="kv-cards" style="margin-top:14px">' +
          '<div class="item"><div class="k">Agreement</div><div class="v">' + UI.esc(ctx.s.id) + '</div><div class="small muted">' + UI.esc(ctx.s.ref) + '</div></div>' +
          '<div class="item"><div class="k">Project / plot</div><div class="v" style="font-size:13px">' + UI.esc(Store.project(ctx.s.projectId).name) + '</div><div class="small muted">Plot ' + UI.esc(Store.plot(ctx.s.plotId).plotNo) + ' · ' + Store.plot(ctx.s.plotId).size + ' sqm</div></div>' +
          '<div class="item"><div class="k">Outstanding</div><div class="v">' + UI.money(Store.saleBalance(ctx.s.id)) + '</div><div class="small muted">' + (ctx.st && ctx.st.next ? 'Next #' + ctx.st.next.n + ' due ' + UI.date(ctx.st.next.dueDate) : 'No pending installment') + '</div></div>' +
        '</div>' : '') +
        (n.kind === 'overdue' ? '<div class="notice warn" style="margin-top:14px">' + Icons.get('alert') + '<div><strong>Overdue-reason workflow pending clarification.</strong> The PRD does not yet define how overdue reasons are captured or reviewed, so no reason field is recorded here. This notification only highlights the overdue balance.</div></div>' : '') +
        (isInternal ? '<div class="notice info" style="margin-top:12px">' + Icons.get('info') + '<div>This is an internal accountant notification. External SMS, WhatsApp and email delivering is <strong>not connected</strong> in this mockup.</div></div>' : '') +
        (related.length ? '<div style="margin-top:16px"><div class="k" style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:8px">Related notifications</div><div class="timeline">' +
          related.map(x => '<div class="timeline-item"><div class="tl-dot">' + Icons.get(kindMeta(x.kind).icon) + '</div><div class="tl-body"><div class="tl-t">' + UI.esc(x.title) + '</div><div class="tl-s">' + UI.dateTime(x.date) + ' · ' + UI.esc(x.channel) + ' · ' + UI.esc(x.status) + '</div></div></div>').join('') +
        '</div></div>' : ''),
      footer: '<button class="btn btn-outline" data-act="close">Close</button>' +
        (wasUnread && isInternal ? '<button class="btn btn-outline" data-act="read">Mark read</button>' : '') +
        (isInternal && ctx.s ? '<button class="btn btn-outline" data-act="remind">' + Icons.get('send') + 'Send reminder</button>' : '') +
        (payment ? '<button class="btn btn-outline" data-act="receipt">' + Icons.get('receipt') + 'View receipt</button>' : '') +
        (ctx.s ? '<button class="btn btn-primary" data-act="account">Open account</button>' : ''),
      onMount(el, close) {
        const on = (sel, fn) => { const b = $('[data-act="' + sel + '"]', el); if (b) b.addEventListener('click', fn); };
        on('close', close);
        on('read', () => { close(); App.updateBadge(); App.refresh(); UI.toast('Marked as read.'); });
        on('receipt', () => UI.showReceipt(payment));
        on('remind', () => { close(); sendReminderModal(n.saleId); });
        on('account', () => { close(); const planId = ctx.plan ? ctx.plan.id : null; if (planId) App.go('/installments/' + planId); else App.go('/sales', () => global.SalesView.openSale(ctx.s.id)); });
        on('customer', () => { close(); App.go('/customers', () => V.customers.openDetail(n.customerId)); });
      }
    });
    return m;
  }

  const openSales = () => Store.db.sales.filter(s => Store.saleBalance(s.id) > 0)
    .map(s => ({ s, c: Store.customer(s.customerId) }))
    .sort((a, b) => a.c.name.localeCompare(b.c.name));

  function reminderMessage(saleId, type) {
    const s = Store.sale(saleId);
    if (!s) return '';
    const c = Store.customer(s.customerId);
    const plan = Store.planBySale(s.id);
    const st = plan ? Store.planStats(plan) : null;
    if (type === 'overdue' && st && st.overdue) {
      return 'Dear ' + c.name.split(' ')[0] + ', your account ' + s.id + ' has an overdue balance of TZS ' + UI.num(st.overdueAmount) + '. Kindly settle or contact our office to arrange payment.';
    }
    if (st && st.next) {
      return 'Dear ' + c.name.split(' ')[0] + ', your next installment on ' + s.id + ' of TZS ' + UI.num(st.next.amount - (st.next.paid || 0)) + ' is due on ' + UI.date(st.next.dueDate) + '.' + (type === 'due-today' ? ' Payment is due today.' : '');
    }
    return 'Dear ' + c.name.split(' ')[0] + ', please contact our office regarding installment account ' + s.id + '.';
  }

  function sendReminderModal(preselectSaleId) {
    if (!openSales().length) { UI.toast('There are no open installment accounts to remind.', 'warn'); return; }
    const options = openSales().map(x => '<option value="' + x.s.id + '"' + (x.s.id === preselectSaleId ? ' selected' : '') + '>' + UI.esc(x.c.name + ' · ' + x.s.id + ' · bal. ' + UI.numberShort(Store.saleBalance(x.s.id))) + '</option>').join('');
    const m = UI.modal({
      title: 'Send reminder',
      subtitle: 'Interface demonstration — messages are logged, not delivered',
      size: 'lg',
      body: '<form id="remindForm" novalidate>' +
        '<div class="form-grid">' +
          '<div class="field full"><label>Customer account <span class="req">*</span></label><select class="select" name="saleId" id="remindSale">' + options + '</select><span class="error-msg">Select an account.</span></div>' +
          '<div class="field" data-field="type"><label>Reminder type</label><select class="select" name="type" id="remindType">' +
            '<option value="reminder">Upcoming installment reminder</option>' +
            '<option value="due-today">Payment due today</option>' +
            '<option value="overdue">Overdue payment reminder</option>' +
          '</select></div>' +
          '<div class="field"><label>Channel</label><div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<label class="pay-method selected" style="flex:1;min-width:90px"><input type="radio" name="channel" value="SMS" checked /><span class="icon">' + Icons.get('smartphone') + '</span>SMS</label>' +
            '<label class="pay-method" style="flex:1;min-width:90px"><input type="radio" name="channel" value="WhatsApp" /><span class="icon">' + Icons.get('message') + '</span>WhatsApp</label>' +
            '<label class="pay-method" style="flex:1;min-width:90px"><input type="radio" name="channel" value="Email" /><span class="icon">' + Icons.get('mail') + '</span>Email</label>' +
          '</div></div>' +
        '</div>' +
        '<div style="margin-top:14px"><div class="k" style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:6px">Message preview</div><div class="msg-preview" id="remindPreview"></div></div>' +
        '<div class="notice warn" style="margin-top:14px">' + Icons.get('alert') + '<div><strong>Not connected.</strong> SMS, WhatsApp and email gateways are not integrated in this mockup. Sending will record a simulated notification with a demo status so the workflow can be reviewed.</div></div>' +
      '</form>',
      footer: '<button class="btn btn-outline" data-x="cancel">Cancel</button><button class="btn btn-primary" type="submit" form="remindForm">' + Icons.get('send') + 'Log simulated reminder</button>',
      onMount(el, close) {
        const form = $('#remindForm', el);
        const saleSel = $('#remindSale', el);
        const typeSel = $('#remindType', el);
        function update() {
          const type = typeSel.value;
          const s = Store.sale(saleSel.value);
          const plan = Store.planBySale(s.id);
          const st = plan ? Store.planStats(plan) : null;
          const note = type === 'overdue' && (!st || !st.overdue) ? '<div style="margin-top:8px;font-size:11px;color:var(--amber)">No overdue installment on this account — a generic reminder will be generated.</div>' : '';
          $('#remindPreview', el).innerHTML = UI.esc(reminderMessage(saleSel.value, type)) + '<div class="msg-meta">Recipient: ' + UI.esc(Store.customer(s.customerId).name + ' · ' + Store.customer(s.customerId).phone) + '</div>' + note;
        }
        saleSel.addEventListener('change', update);
        typeSel.addEventListener('change', update);
        $$('.pay-method', el).forEach(lbl => lbl.addEventListener('click', () => {
          $$('.pay-method', el).forEach(x => x.classList.remove('selected'));
          lbl.classList.add('selected');
        }));
        $('[data-x="cancel"]', el).addEventListener('click', close);
        update();

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const data = UI.readForm(form);
          if (!data.saleId) { UI.toast('Select an account.', 'warn'); return; }
          const n = Store.sendReminder(data.type, data.saleId);
          if (n) {
            n.channel = data.channel || 'SMS';
            Store.save();
            close();
            App.refresh();
            UI.toast('Simulated ' + (data.channel || 'SMS') + ' reminder logged for ' + Store.customer(n.customerId).name + '.');
          }
        });
      }
    });
    return m;
  }

  V.notifications = {
    titleFor(param) { return ['Notifications & Reminders', 'Operations']; },

    render() {
      const all = Store.db.notifications.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
      const customerNotes = all.filter(n => n.audience === 'customer');
      const internal = all.filter(n => n.audience === 'internal');
      const unreadInternal = internal.filter(n => n.status === 'Unread').length;
      const overdueAlerts = all.filter(n => n.kind === 'overdue');
      const upcoming = customerNotes.filter(n => n.kind === 'reminder' || n.kind === 'due-today');
      const isAccountant = App.role() === 'Accountant';
      const canWrite = App.can('paymentWrite');

      return '<div class="page">' +
        '<div class="page-head-row"><div><h2>Notifications & Reminders</h2><div class="sub">Customer reminders, payment confirmations and the internal notification centre. Channel delivery is an interface preview only.</div></div>' +
          '<div class="page-actions">' + (canWrite ? '<button class="btn btn-primary" data-act="remind">' + Icons.get('send') + 'Send reminder</button>' : '') + '</div>' +
        '</div>' +
        (isAccountant ? '<div class="alert-strip">' + Icons.get('message') + '<span><strong>You have a new message.</strong> ' + unreadInternal + ' internal notification' + (unreadInternal === 1 ? '' : 's') + ' awaiting review in your notification centre.</span><button class="btn btn-sm btn-outline" data-act="internal">Open internal notifications</button></div>' : '') +
        '<div class="mini-stats">' +
          '<div class="mini-stat"><div class="ms-icon blue">' + Icons.get('message') + '</div><div><div class="k">Customer messages</div><div class="v">' + customerNotes.length + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon amber">' + Icons.get('clock') + '</div><div><div class="k">Upcoming reminders</div><div class="v">' + upcoming.length + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon red">' + Icons.get('alert') + '</div><div><div class="k">Overdue alerts</div><div class="v">' + overdueAlerts.length + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon ' + (unreadInternal ? 'green' : '') + '">' + Icons.get('bell') + '</div><div><div class="k">Internal unread</div><div class="v">' + unreadInternal + '</div></div></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="tabs">' +
            '<button class="tab ' + (state.tab === 'customer' ? 'active' : '') + '" data-tab="customer">Customer notifications <span class="count">' + customerNotes.length + '</span></button>' +
            '<button class="tab ' + (state.tab === 'internal' ? 'active' : '') + '" data-tab="internal">Internal centre ' + (unreadInternal ? '<span class="count">' + unreadInternal + ' new</span>' : '<span class="count">' + internal.length + '</span>') + '</button>' +
          '</div>' +
          (state.tab === 'customer' ? this.customerTab(customerNotes) : this.internalTab(internal, unreadInternal)) +
        '</div>' +
      '</div>';
    },

    customerTab(notes) {
      return '<div class="filter-bar">' +
          '<div class="field-inline" style="width:280px"><span data-x>' + Icons.get('search') + '</span><input class="input search-input" id="noteSearch" placeholder="Search title, customer, account…" value="' + UI.esc(state.q) + '" /></div>' +
          '<select class="select" id="noteKind">' + UI.options([{ value: 'all', label: 'All types' }].concat(Object.keys(KIND).map(k => ({ value: k, label: KIND[k].label }))), state.kind) + '</select>' +
          '<select class="select" id="noteChannel">' + UI.options([{ value: 'all', label: 'All channels' }, { value: 'SMS', label: 'SMS' }, { value: 'WhatsApp', label: 'WhatsApp' }, { value: 'Email', label: 'Email' }], state.channel) + '</select>' +
          '<div class="spacer"></div><span class="filter-count" id="noteCount"></span>' +
        '</div>' +
        '<div class="table-wrap"><table class="data" id="noteTable"><thead><tr><th>Notification</th><th>Customer</th><th>Related account</th><th>Channel</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>' +
          notes.map(customerRow).join('') + '</tbody></table></div>' +
        '<div class="table-foot"><span id="noteFoot"></span><span class="muted small">Notification types: upcoming reminder, due today, overdue, payment confirmation, receipt.</span></div>';
    },

    internalTab(notes, unread) {
      return '<div class="filter-bar"><div style="font-size:12.5px;color:var(--muted)">Accountant notification centre · overdue payment alerts appear here for follow-up.</div><div class="spacer"></div>' +
          (unread ? '<button class="btn btn-sm btn-outline" data-act="readall">' + Icons.get('check') + 'Mark all read</button>' : '<span class="chip">' + Icons.get('check') + 'All read</span>') +
        '</div>' +
        (notes.length ? '<div style="border-top:1px solid var(--line-soft)">' + notes.map(internalItem).join('') + '</div>' :
          '<div class="card-body">' + UI.emptyState('bell', 'No internal notifications', 'Overdue alerts and internal messages will appear here.') + '</div>') +
        '<div style="padding:16px 18px;border-top:1px solid var(--line-soft)">' +
          '<div class="notice warn">' + Icons.get('alert') + '<div><strong>Pending clarification.</strong> The PRD has not yet defined an overdue-reason capture workflow or the follow-up steps beyond notifying the accountant. No reason fields or escalation actions are invented here.</div></div>' +
        '</div>';
    },

    mount(el) {
      $$('[data-tab]', el).forEach(b => b.addEventListener('click', () => { state.tab = b.getAttribute('data-tab'); App.refresh(); }));
      const openBtn = $('[data-act="remind"]', el);
      if (openBtn) openBtn.addEventListener('click', () => sendReminderModal());
      const internalBtn = $('[data-act="internal"]', el);
      if (internalBtn) internalBtn.addEventListener('click', () => { state.tab = 'internal'; App.refresh(); });
      const readAll = $('[data-act="readall"]', el);
      if (readAll) readAll.addEventListener('click', () => { Store.markAllInternalRead(); App.refresh(); App.updateBadge(); UI.toast('All internal notifications marked as read.'); });

      const search = $('#noteSearch', el);
      const kindSel = $('#noteKind', el);
      const channelSel = $('#noteChannel', el);
      function apply() {
        const q = (search ? search.value : '').toLowerCase();
        const kind = kindSel ? kindSel.value : 'all';
        const channel = channelSel ? channelSel.value : 'all';
        state.q = q; state.kind = kind; state.channel = channel;
        const rows = $$('#noteTable tbody tr', el);
        let visible = 0;
        rows.forEach(r => {
          let show = true;
          if (kind !== 'all' && r.getAttribute('data-kind') !== kind) show = false;
          if (show && channel !== 'all' && r.getAttribute('data-channel') !== channel) show = false;
          if (show && q && !(r.getAttribute('data-search') || '').includes(q)) show = false;
          r.style.display = show ? '' : 'none';
          if (show) visible++;
        });
        const cnt = $('#noteCount', el); if (cnt) cnt.textContent = visible + ' of ' + rows.length;
        const foot = $('#noteFoot', el); if (foot) foot.textContent = 'Showing ' + visible + ' of ' + rows.length + ' customer notifications';
      }
      if (search) {
        search.addEventListener('input', UI.debounce(apply, 140));
        kindSel.addEventListener('change', apply);
        channelSel.addEventListener('change', apply);
        apply();
      }

      el.addEventListener('click', (e) => {
        const readBtn = e.target.closest('[data-read-note]');
        if (readBtn) {
          e.stopPropagation();
          Store.markNotificationRead(readBtn.getAttribute('data-read-note'));
          App.refresh();
          App.updateBadge();
          UI.toast('Notification marked as read.');
          return;
        }
        const opener = e.target.closest('[data-open-note]');
        if (opener) { e.stopPropagation(); noteModal(opener.getAttribute('data-open-note')); return; }
        const item = e.target.closest('[data-note]');
        if (item) noteModal(item.getAttribute('data-note'));
      });
    },

    open(id) { noteModal(id); },
    openReminder: sendReminderModal,
    refreshBell() { if (global.App) App.updateBadge(); }
  };

  global.NotificationsView = {
    open: (id) => noteModal(id),
    openReminder: sendReminderModal,
    refreshBell: () => { if (global.App) App.updateBadge(); }
  };
})(window);
