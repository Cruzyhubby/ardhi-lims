/* Ardhi LIMS — Customers & plot size requests */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;
  const $$ = UI.$$;

  const state = { tab: 'customers', q: '' };

  function customerRow(row) {
    const c = row.customer;
    return '<tr class="clickable" data-customer="' + c.id + '" data-search="' + UI.esc((c.name + ' ' + c.phone + ' ' + c.email + ' ' + c.nida + ' ' + c.address).toLowerCase()) + '">' +
      '<td><div class="cell-user">' + UI.avatar(c.name) + '<div><div class="nm">' + UI.esc(c.name) + '</div><div class="sub">' + c.id + ' · ' + UI.esc(c.phone) + '</div></div></div></td>' +
      '<td><div class="t-main" style="font-weight:500">' + UI.esc(c.email) + '</div><div class="t-sub">' + UI.esc(c.address) + '</div></td>' +
      '<td class="mono">' + UI.esc(c.nida) + '</td>' +
      '<td class="num">' + row.sales.length + '</td>' +
      '<td class="num">' + UI.moneyShort(row.totalPaid) + '</td>' +
      '<td class="num">' + (row.balance > 0 ? '<span class="strong tone-amber">' + UI.money(row.balance) + '</span>' : '<span class="badge green no-dot">Settled</span>') + '</td>' +
      '<td>' + UI.badge(c.status) + '</td>' +
      '<td><div class="actions">' +
        '<button class="icon-btn" style="width:30px;height:30px" data-view-customer="' + c.id + '" title="View" aria-label="View customer">' + Icons.get('eye') + '</button>' +
        (App.can('customerWrite') ? '<button class="icon-btn" style="width:30px;height:30px" data-edit-customer="' + c.id + '" title="Edit" aria-label="Edit customer">' + Icons.get('edit') + '</button>' : '') +
      '</div></td>' +
    '</tr>';
  }

  function requestRow(r) {
    const c = Store.customer(r.customerId);
    const s = Store.sale(r.saleId);
    const p = s ? Store.plot(s.plotId) : null;
    return '<tr class="clickable" data-request="' + r.id + '" data-search="' + UI.esc(((c ? c.name : '') + ' ' + (p ? p.plotNo : '') + ' ' + r.status).toLowerCase()) + '">' +
      '<td><span class="mono">' + r.id + '</span></td>' +
      '<td><div class="cell-user">' + UI.avatar(c ? c.name : '—', 'sm') + '<div><div class="nm">' + UI.esc(c ? c.name : '—') + '</div><div class="sub">' + (p ? UI.esc(p.plotNo) : '—') + '</div></div></div></td>' +
      '<td>' + (p ? p.size : '—') + ' sqm</td>' +
      '<td class="strong">+ ' + r.requestedSize + ' sqm</td>' +
      '<td class="muted">' + UI.date(r.submittedAt) + '</td>' +
      '<td>' + UI.badge(r.status) + '</td>' +
      '<td><button class="btn btn-sm btn-ghost" data-view-request="' + r.id + '">Review' + Icons.get('chevron-right') + '</button></td>' +
    '</tr>';
  }

  function customerModal(c) {
    const row = Store.rowForCustomer(c);
    const payments = Store.db.payments.filter(p => p.customerId === c.id).sort((a, b) => (a.date < b.date ? 1 : -1));
    const purchases = row.sales.map(s => ({ sale: s, plot: Store.plot(s.plotId), project: Store.project(s.projectId), plan: Store.planBySale(s.id) }));

    const m = UI.modal({
      title: c.name,
      subtitle: 'Customer record · ' + c.id + ' · registered ' + UI.date(c.registeredAt),
      size: 'xl',
      body: '<div style="display:grid;gap:18px">' +
        '<div class="kv-cards">' +
          '<div class="item"><div class="k">Total paid</div><div class="v">' + UI.moneyShort(row.totalPaid) + '</div></div>' +
          '<div class="item"><div class="k">Outstanding</div><div class="v" style="color:' + (row.balance > 0 ? 'var(--amber)' : 'var(--green-600)') + '">' + UI.moneyShort(row.balance) + '</div></div>' +
          '<div class="item"><div class="k">Plots purchased</div><div class="v">' + purchases.length + '</div></div>' +
          '<div class="item"><div class="k">Portal account</div><div class="v" style="font-size:12px;display:flex;align-items:center;gap:5px">' + Icons.get('check-circle') + 'Auto-created</div></div>' +
        '</div>' +
        '<div class="split-2" style="gap:22px">' +
          '<div><div class="panel-title">Contact & identity</div><dl class="kv">' +
            '<dt>Phone</dt><dd>' + UI.esc(c.phone) + '</dd>' +
            '<dt>Email</dt><dd>' + UI.esc(c.email) + '</dd>' +
            '<dt>Physical address</dt><dd>' + UI.esc(c.address) + '</dd>' +
            '<dt>NIDA / Passport</dt><dd class="mono">' + UI.esc(c.nida) + '</dd>' +
            '<dt>Status</dt><dd>' + UI.badge(c.status) + '</dd>' +
          '</dl></div>' +
          '<div><div class="panel-title">Next of kin / emergency</div><dl class="kv">' +
            '<dt>Name</dt><dd>' + UI.esc(c.kinName || '—') + '</dd>' +
            '<dt>Relation</dt><dd>' + UI.esc(c.kinRelation || '—') + '</dd>' +
            '<dt>Phone</dt><dd>' + UI.esc(c.kinPhone || '—') + '</dd>' +
            '<dt>Customer since</dt><dd>' + UI.date(c.registeredAt) + '</dd>' +
            '<dt>Portal access</dt><dd>View-only</dd>' +
          '</dl></div>' +
        '</div>' +
        '<div><div class="panel-title" style="margin-bottom:8px">Purchase history</div>' +
          (purchases.length ?
          '<div class="table-wrap" style="border:1px solid var(--line);border-radius:12px"><table class="data"><thead><tr><th>Agreement</th><th>Plot</th><th class="num">Price</th><th class="num">Paid</th><th class="num">Balance</th><th>Status</th><th></th></tr></thead><tbody>' +
            purchases.map(x => '<tr><td><span class="t-main mono">' + UI.esc(x.sale.id) + '</span><div class="t-sub">' + UI.date(x.sale.saleDate) + '</div></td>' +
              '<td><div class="t-main">' + UI.esc(x.plot ? x.plot.plotNo : '—') + '</div><div class="t-sub">' + UI.esc(x.project ? x.project.name : '') + '</div></td>' +
              '<td class="num">' + UI.money(x.sale.price) + '</td><td class="num">' + UI.money(Store.salePaid(x.sale.id)) + '</td>' +
              '<td class="num">' + UI.money(Store.saleBalance(x.sale.id)) + '</td><td>' + UI.badge(x.sale.status) + '</td>' +
              '<td>' + (x.plan ? '<button class="btn btn-sm btn-ghost" data-open-plan="' + x.plan.id + '">Installment</button>' : '<span class="muted small">No plan</span>') + '</td></tr>').join('') +
          '</tbody></table></div>' : '<div class="notice">' + Icons.get('info') + '<div>No purchases recorded for this customer.</div></div>') +
        '</div>' +
        '<div><div class="panel-title" style="margin-bottom:8px">Payment history</div>' +
          (payments.length ? '<div class="table-wrap" style="border:1px solid var(--line);border-radius:12px;max-height:230px;overflow:auto"><table class="data"><thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th>Agreement</th><th class="num">Amount</th><th></th></tr></thead><tbody>' +
            payments.slice(0, 12).map(p => '<tr><td class="mono">' + UI.esc(p.receiptNo) + '</td><td>' + UI.date(p.date) + '</td><td>' + UI.methodChip(p.method) + '</td><td class="mono">' + UI.esc(p.saleId) + '</td><td class="num strong">' + UI.money(p.amount) + '</td><td><button class="btn btn-sm btn-ghost" data-receipt="' + p.id + '">Receipt</button></td></tr>').join('') +
          '</tbody></table></div>' : '<div class="notice">' + Icons.get('info') + '<div>No payments recorded.</div></div>') +
        '</div>' +
        '<div class="notice info">' + Icons.get('smartphone') + '<div><strong>Customer portal.</strong> This account is created automatically and is view-only. Customers cannot edit details or make online payments; invoices are excluded from the portal.</div></div>' +
      '</div>',
      footer: '<button class="btn btn-outline" data-x="close">Close</button>' +
        '<a class="btn btn-outline" href="customer-portal.html?customer=' + encodeURIComponent(c.id) + '" target="_blank" rel="noopener">' + Icons.get('external') + 'Open portal</a>' +
        (App.can('customerWrite') ? '<button class="btn btn-primary" data-x="edit">' + Icons.get('edit') + 'Edit customer</button>' : '')
    });
    $('[data-x="close"]', m.el).addEventListener('click', m.close);
    const editBtn = $('[data-x="edit"]', m.el);
    if (editBtn) editBtn.addEventListener('click', () => { m.close(); customerForm(c); });
    $$('[data-open-plan]', m.el).forEach(b => b.addEventListener('click', () => { m.close(); App.go('/installments/' + b.getAttribute('data-open-plan')); }));
    $$('[data-receipt]', m.el).forEach(b => b.addEventListener('click', () => {
      const p = Store.db.payments.find(x => x.id === b.getAttribute('data-receipt'));
      if (p) UI.showReceipt(p);
    }));
  }

  function customerForm(existing) {
    if (!App.can('customerWrite')) { UI.toast('Your access profile cannot register customers.', 'warn'); return; }
    const c = existing || {};
    const m = UI.modal({
      title: existing ? 'Edit customer' : 'Register customer',
      subtitle: existing ? c.id : 'A view-only customer portal account will be created automatically',
      size: 'lg',
      body: '<form id="customerForm" novalidate>' +
        '<div class="form-section"><div class="form-section-title">' + Icons.get('user') + 'Personal information</div>' +
          '<div class="form-grid">' +
            '<div class="field full" data-field="name"><label>Full name <span class="req">*</span></label><input class="input" name="name" value="' + UI.esc(c.name || '') + '" placeholder="e.g. Neema Joseph Mushi" /><span class="error-msg">Full name is required.</span></div>' +
            '<div class="field" data-field="phone"><label>Phone number <span class="req">*</span></label><input class="input" name="phone" value="' + UI.esc(c.phone || '') + '" placeholder="+255 754 000 000" /><span class="error-msg">Enter a valid Tanzanian phone number (e.g. +255 754 123 456).</span></div>' +
            '<div class="field" data-field="email"><label>Email address</label><input class="input" name="email" type="email" value="' + UI.esc(c.email || '') + '" placeholder="name@example.co.tz" /><span class="error-msg">Enter a valid email address.</span></div>' +
            '<div class="field full" data-field="address"><label>Physical address <span class="req">*</span></label><input class="input" name="address" value="' + UI.esc(c.address || '') + '" placeholder="Street / ward, district, region" /><span class="error-msg">Physical address is required.</span></div>' +
            '<div class="field full" data-field="nida"><label>NIDA or passport number <span class="req">*</span></label><input class="input" name="nida" value="' + UI.esc(c.nida || '') + '" placeholder="e.g. 19850412-12345-678-90" /><span class="error-msg">NIDA or passport number is required.</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="form-section"><div class="form-section-title">' + Icons.get('phone') + 'Next of kin / emergency contact</div>' +
          '<div class="form-grid">' +
            '<div class="field"><label>Full name</label><input class="input" name="kinName" value="' + UI.esc(c.kinName || '') + '" placeholder="Contact name" /></div>' +
            '<div class="field"><label>Relationship</label><select class="select" name="kinRelation">' + UI.options([{ value: 'Spouse', label: 'Spouse' }, { value: 'Sibling', label: 'Sibling' }, { value: 'Parent', label: 'Parent' }, { value: 'Child', label: 'Child' }, { value: 'Guardian', label: 'Guardian' }, { value: 'Other', label: 'Other' }], c.kinRelation || 'Spouse') + '</select></div>' +
            '<div class="field" data-field="kinPhone"><label>Contact phone</label><input class="input" name="kinPhone" value="' + UI.esc(c.kinPhone || '') + '" placeholder="+255 754 000 000" /><span class="error-msg">Enter a valid phone number.</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="notice info" style="margin-top:18px">' + Icons.get('smartphone') + '<div><strong>Portal account.</strong> Once registered, the customer receives a view-only portal account (customer number + demo password). Portal access cannot be edited here.</div></div>' +
      '</form>',
      footer: '<button class="btn btn-outline" data-x="cancel">Cancel</button><button class="btn btn-primary" type="submit" form="customerForm">' + (existing ? 'Save changes' : 'Register customer') + '</button>'
    });
    $('[data-x="cancel"]', m.el).addEventListener('click', m.close);
    $('#customerForm', m.el).addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      if (!UI.validate(form, [
        { name: 'name', required: true, msg: 'Full name is required.' },
        { name: 'phone', required: true, test: v => UI.patterns.phone.test(v.replace(/\s+/g, ' ')), msg: 'Enter a valid Tanzanian phone number.' },
        { name: 'email', test: v => UI.patterns.email.test(v), msg: 'Enter a valid email address.' },
        { name: 'address', required: true, msg: 'Physical address is required.' },
        { name: 'nida', required: true, msg: 'NIDA or passport number is required.' },
        { name: 'kinPhone', test: v => UI.patterns.phone.test(v.replace(/\s+/g, ' ')), msg: 'Enter a valid phone number.' }
      ])) return;
      const data = UI.readForm(form);
      if (existing) {
        Store.updateCustomer(existing.id, data);
        m.close();
        UI.toast('Customer details updated.');
        App.refresh();
      } else {
        const created = Store.addCustomer(data);
        m.close();
        App.refresh();
        UI.modal({
          title: 'Customer registered',
          body: '<div style="text-align:center;padding:8px 0 4px"><div style="width:52px;height:52px;border-radius:50%;background:var(--green-50);color:var(--green-600);display:grid;place-items:center;margin:0 auto 12px">' + Icons.get('check-circle') + '</div>' +
            '<h3 style="font-size:16px;font-weight:650">' + UI.esc(created.name) + '</h3>' +
            '<p class="muted small" style="margin-top:4px">Customer number <strong>' + created.id + '</strong></p></div>' +
            '<div class="notice info" style="margin-top:8px">' + Icons.get('smartphone') + '<div><strong>Customer portal account created automatically.</strong><br>Sign-in: <strong>' + created.id + '</strong> or registered phone · demo password <strong>' + Store.DEMO_PASSWORD + '</strong><br><span class="muted">An SMS invite is simulated; no message is actually sent.</span></div></div>',
          footer: '<button class="btn btn-outline" data-x="close">Close</button><button class="btn btn-primary" data-x="view">View customer</button>',
          onMount(el, close) {
            $('[data-x="close"]', el).addEventListener('click', close);
            $('[data-x="view"]', el).addEventListener('click', () => { close(); customerModal(created); });
          }
        });
      }
    });
  }

  function requestModal(r) {
    const c = Store.customer(r.customerId);
    const s = Store.sale(r.saleId);
    const p = s ? Store.plot(s.plotId) : null;
    const m = UI.modal({
      title: 'Plot size expansion request',
      subtitle: r.id + ' · submitted ' + UI.date(r.submittedAt),
      size: 'md',
      body: '<dl class="kv two">' +
          '<dt>Customer</dt><dd>' + UI.esc(c ? c.name : '—') + '</dd>' +
          '<dt>Agreement</dt><dd>' + UI.esc(s ? s.id : '—') + '</dd>' +
          '<dt>Plot</dt><dd>' + UI.esc(p ? p.plotNo : '—') + '</dd>' +
          '<dt>Current size</dt><dd>' + r.currentSize + ' sqm</dd>' +
          '<dt>Requested additional size</dt><dd class="strong">' + r.requestedSize + ' sqm</dd>' +
          '<dt>Status</dt><dd>' + UI.badge(r.status) + '</dd>' +
        '</dl>' +
        '<div class="divider"></div>' +
        '<div class="panel-title">Customer explanation</div>' +
        '<div class="msg-preview">' + UI.esc(r.note || '—') + '</div>' +
        (r.response ? '<div class="notice green" style="margin-top:14px">' + Icons.get('info') + '<div><strong>Recorded outcome:</strong> ' + UI.esc(r.response) + '</div></div>' : '') +
        '<div class="notice warn" style="margin-top:14px">' + Icons.get('alert') + '<div><strong>Pending clarification.</strong> The authority responsible for approving or rejecting expansion requests, and the checks required before changing plot records, have not been defined in the PRD. This request does not change the plot record.</div></div>',
      footer: '<button class="btn btn-primary" data-x="close">Close</button>'
    });
    $('[data-x="close"]', m.el).addEventListener('click', m.close);
  }

  V.customers = {
    render() {
      const rows = Store.db.customers.map(Store.rowForCustomer);
      const requests = Store.db.requests.slice().sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
      const totalPaid = rows.reduce((s, r) => s + r.totalPaid, 0);
      const withBalance = rows.filter(r => r.balance > 0).length;
      const pendingReq = requests.filter(r => r.status === 'Pending review').length;

      return '<div class="page">' +
        '<div class="page-head-row"><div><h2>Customer & Sales Management</h2><div class="sub">Registered customers, purchase history and portal accounts. Each customer gets a view-only portal account automatically.</div></div>' +
          '<div class="page-actions">' + (App.can('customerWrite') ? '<button class="btn btn-primary" data-act="new-customer">' + Icons.get('plus') + 'Register customer</button>' : '<span class="chip">' + Icons.get('lock') + 'Read-only access</span>') + '</div>' +
        '</div>' +
        '<div class="mini-stats">' +
          '<div class="mini-stat"><div class="ms-icon green">' + Icons.get('customers') + '</div><div><div class="k">Customers</div><div class="v">' + rows.length + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon blue">' + Icons.get('receipt') + '</div><div><div class="k">Total paid</div><div class="v">' + UI.moneyShort(totalPaid) + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon amber">' + Icons.get('clock') + '</div><div><div class="k">With outstanding balance</div><div class="v">' + withBalance + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon">' + Icons.get('plots') + '</div><div><div class="k">Size requests</div><div class="v">' + pendingReq + ' pending</div></div></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="tabs"><button class="tab ' + (state.tab === 'customers' ? 'active' : '') + '" data-tab="customers">Customers <span class="count">' + rows.length + '</span></button>' +
            '<button class="tab ' + (state.tab === 'requests' ? 'active' : '') + '" data-tab="requests">Plot size requests <span class="count">' + requests.length + '</span></button></div>' +
          '<div class="filter-bar"><div class="field-inline" style="width:280px"><span data-x>' + Icons.get('search') + '</span><input class="input search-input" id="customerSearch" placeholder="Search name, phone, NIDA…" value="' + UI.esc(state.q) + '" /></div><div class="spacer"></div><span class="filter-count" id="custCount"></span></div>' +
          (state.tab === 'customers' ?
            '<div class="table-wrap"><table class="data" id="customerTable"><thead><tr><th>Customer</th><th>Contact</th><th>NIDA / passport</th><th class="num">Plots</th><th class="num">Total paid</th><th class="num">Balance</th><th>Status</th><th></th></tr></thead><tbody>' +
              rows.map(customerRow).join('') + '</tbody></table></div>' +
            '<div class="table-foot"><span id="customerFoot"></span><span class="muted small">Customer records are linked to sales, payments and purchase documents.</span></div>'
          :
            '<div class="table-wrap"><table class="data"><thead><tr><th>Request</th><th>Customer</th><th>Current size</th><th>Requested</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>' +
              requests.map(requestRow).join('') + '</tbody></table></div>' +
            '<div class="card-body" style="border-top:1px solid var(--line-soft)"><div class="notice warn">' + Icons.get('alert') + '<div><strong>Approval workflow pending clarification.</strong> Requests are recorded from the customer portal but not automatically approved. The responsible authority and checks before changing plot records are still to be confirmed.</div></div></div>') +
        '</div>' +
      '</div>';
    },

    mount(el) {
      $$('[data-tab]', el).forEach(b => b.addEventListener('click', () => { state.tab = b.getAttribute('data-tab'); App.refresh(); }));
      const newBtn = $('[data-act="new-customer"]', el);
      if (newBtn) newBtn.addEventListener('click', () => customerForm(null));

      const search = $('#customerSearch', el);
      if (search) {
        const apply = () => {
          state.q = search.value;
          const rows = $$('tbody tr', el);
          let visible = 0;
          rows.forEach(r => {
            const hay = (r.getAttribute('data-search') || '').toLowerCase();
            const show = !state.q || hay.includes(state.q.toLowerCase());
            r.style.display = show ? '' : 'none';
            if (show) visible++;
          });
          const cnt = $('#custCount', el); if (cnt) cnt.textContent = visible + ' of ' + rows.length;
          const foot = $('#customerFoot', el); if (foot) foot.textContent = 'Showing ' + visible + ' of ' + rows.length + ' customers';
        };
        search.addEventListener('input', UI.debounce(apply, 140));
        apply();
      }

      el.addEventListener('click', (e) => {
        const vc = e.target.closest('[data-view-customer]');
        if (vc) { e.stopPropagation(); customerModal(Store.customer(vc.getAttribute('data-view-customer'))); return; }
        const ec = e.target.closest('[data-edit-customer]');
        if (ec) { e.stopPropagation(); customerForm(Store.customer(ec.getAttribute('data-edit-customer'))); return; }
        const row = e.target.closest('tr[data-customer]');
        if (row) { customerModal(Store.customer(row.getAttribute('data-customer'))); return; }
        const vr = e.target.closest('[data-view-request]');
        if (vr) { requestModal(Store.db.requests.find(r => r.id === vr.getAttribute('data-view-request'))); return; }
        const rrow = e.target.closest('tr[data-request]');
        if (rrow) { requestModal(Store.db.requests.find(r => r.id === rrow.getAttribute('data-request'))); }
      });
    },

    openDetail(id) {
      const c = Store.customer(id);
      if (c) customerModal(c);
    }
  };
})(window);
