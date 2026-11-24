/* Ardhi LIMS — customer portal (view-only) */
(function (global) {
  'use strict';
  const $ = UI.$;
  const $$ = UI.$$;

  let section = 'overview';
  let saleId = null;

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

  function normalPhone(s) { return String(s || '').replace(/\D/g, '').slice(-9); }

  function findCustomer(identifier) {
    const raw = String(identifier || '').trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    const digits = raw.replace(/\D/g, '');
    return Store.db.customers.find(c => {
      if (c.id.toLowerCase() === lower) return true;
      if (digits && c.phone.replace(/\D/g, '') === digits) return true;
      if (digits.length >= 9 && normalPhone(c.phone) === digits.slice(-9)) return true;
      return false;
    }) || null;
  }

  function ctx() {
    const customer = Store.currentCustomer();
    if (!customer) return null;
    let sales = Store.salesForCustomer(customer.id).slice();
    if (!sales.length) return { customer, sales: [], sale: null, plot: null, project: null, plan: null, stats: null, payments: [] };
    if (!saleId || !sales.some(s => s.id === saleId)) saleId = sales[0].id;
    const sale = sales.find(s => s.id === saleId);
    const plot = sale ? Store.plot(sale.plotId) : null;
    const project = sale ? Store.project(sale.projectId) : null;
    const plan = sale ? Store.planBySale(sale.id) : null;
    const stats = plan ? Store.planStats(plan) : null;
    const payments = sale ? Store.paymentsForSale(sale.id).slice().sort((a, b) => (a.date < b.date ? 1 : -1)) : [];
    return { customer, sales, sale, plot, project, plan, stats, payments };
  }

  /* ---------------- login ---------------- */
  function renderDemoAccounts() {
    const withSales = [];
    Store.db.customers.forEach(c => { if (Store.salesForCustomer(c.id).length && withSales.length < 4) withSales.push(c); });
    const wrap = $('#portalDemoAccounts');
    wrap.innerHTML = withSales.map(c => {
      const s = Store.salesForCustomer(c.id)[0];
      return '<button type="button" class="demo-chip" data-customer="' + c.id + '">' + UI.avatar(c.name) +
        '<span><span class="nm" style="display:block">' + UI.esc(c.name.split(' ')[0]) + ' ' + UI.esc(c.name.split(' ').slice(1).join(' ')) + '</span>' +
        '<span class="rl" style="display:block">' + UI.esc(c.id) + ' · ' + UI.esc(s ? Store.plot(s.plotId).plotNo : '') + '</span></span></button>';
    }).join('');
    $$('.demo-chip', wrap).forEach(btn => btn.addEventListener('click', () => {
      const c = Store.customer(btn.getAttribute('data-customer'));
      $('#portalId').value = c.id;
      $('#portalPassword').value = Store.DEMO_PASSWORD;
      hideLoginError();
      UI.toast('Demo credentials filled. Click "Sign in to my account".');
    }));
  }

  function showLoginError(msg) {
    const box = $('#portalLoginError');
    box.style.display = 'flex';
    $('div', box).textContent = msg;
  }
  function hideLoginError() { $('#portalLoginError').style.display = 'none'; }

  function bindLogin() {
    const form = $('#portalLoginForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      hideLoginError();
      const ok = UI.validate(form, [
        { name: 'identifier', required: true, msg: 'Enter your customer number or phone number.' },
        { name: 'password', required: true, msg: 'Enter your password.' }
      ]);
      if (!ok) return;
      const id = form.elements.identifier.value;
      const c = findCustomer(id);
      if (!c) { showLoginError('No customer account matches that customer number or phone number.'); return; }
      if ((form.elements.password.value || '') !== Store.DEMO_PASSWORD) { showLoginError('Incorrect demo password. Use demo1234.'); return; }
      if (c.status && c.status !== 'Active') { showLoginError('This customer account is not active. Please contact the office.'); return; }
      Store.portalSignIn(c.id);
      saleId = null;
      section = 'overview';
      showPortal();
      UI.toast('Welcome, ' + c.name.split(' ')[0] + '.');
    });
  }

  /* ---------------- shell ---------------- */
  function showPortal() {
    document.body.classList.add('portal-authed');
    const c = Store.currentCustomer();
    $('#portalUser').innerHTML = UI.avatar(c.name, 'sm') + '<div><div class="nm">' + UI.esc(c.name) + '</div><div class="rl">' + UI.esc(c.id) + ' · Customer</div></div>';
    renderSection();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function signOut() {
    Store.portalSignOut();
    document.body.classList.remove('portal-authed');
    saleId = null;
    section = 'overview';
    history.replaceState(null, '', location.pathname);
    $('#portalLoginForm').reset();
    hideLoginError();
    UI.toast('Signed out of the customer portal.');
  }

  function setSection(next) {
    section = next;
    renderSection();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function renderSection() {
    const c = Store.currentCustomer();
    if (!c) return;
    const data = ctx();
    const el = $('#portalView');
    const views = { overview: overviewHTML, schedule: scheduleHTML, payments: paymentsHTML, documents: documentsHTML, requests: requestsHTML };
    el.innerHTML = (views[section] || overviewHTML)(data);
    paintIcons(el);
    $$('#portalNav [data-section]').forEach(b => b.classList.toggle('active', b.getAttribute('data-section') === section));
    if (section === 'requests') bindRequests(data);
  }

  function saleSwitcher(data) {
    if (data.sales.length < 2) return '';
    return '<div class="ph-side"><label for="portalSaleSelect">Viewing purchase</label><select class="select" id="portalSaleSelect">' +
      data.sales.map(s => {
        const plot = Store.plot(s.plotId);
        return '<option value="' + s.id + '"' + (s.id === data.sale.id ? ' selected' : '') + '>' + UI.esc(s.id + ' · Plot ' + plot.plotNo) + '</option>';
      }).join('') + '</select></div>';
  }

  function heroHTML(data, title, sub) {
    const c = data.customer;
    return '<div class="portal-hero"><div style="position:relative;z-index:1">' +
      '<span class="badge no-dot">' + Icons.get('eye') + ' View-only account</span>' +
      '<h2>' + UI.esc(title) + '</h2>' +
      '<p>' + UI.esc(sub) + '</p></div>' + saleSwitcher(data) + '</div>';
  }

  function entryLabel(e) {
    const st = Store.entryState(e);
    if (st === 'paid') return UI.badge('Paid', 'green');
    if (st === 'overdue') return UI.badge('Overdue', 'red');
    if (st === 'partial') return UI.badge('Partial', 'amber');
    return UI.badge('Pending', 'grey');
  }

  /* ---------------- overview ---------------- */
  function overviewHTML(data) {
    const c = data.customer;
    if (!data.sale) {
      return heroHTML(data, 'Hello, ' + c.name.split(' ')[0], 'Your customer account exists, but no plot purchase has been recorded yet.') +
        '<div class="card"><div class="card-body">' + UI.emptyState('land', 'No plot purchase yet', 'When the office registers your sale, your plot, installment plan and receipts will appear here.') + '</div></div>' +
        viewOnlyNotice();
    }
    const s = data.sale;
    const st = data.stats;
    const next = st.next;
    const openEntries = data.plan.entries.filter(e => e.paid < e.amount).slice(0, 4);
    const recent = data.payments.slice(0, 4);
    const balance = Store.saleBalance(s.id);
    return heroHTML(data, 'Hello, ' + c.name.split(' ')[0], 'Customer ' + c.id + ' · ' + c.phone + '. Follow your plot purchase and installment progress below.') +
      '<div class="portal-stats">' +
        '<div class="portal-stat accent"><div class="k">Total paid</div><div class="v">' + UI.moneyShort(Store.salePaid(s.id)) + '</div><div class="s">' + data.payments.length + ' payment(s) recorded</div></div>' +
        '<div class="portal-stat ' + (balance > 0 ? '' : 'accent') + '"><div class="k">Outstanding balance</div><div class="v">' + (balance > 0 ? UI.moneyShort(balance) : 'Fully paid') + '</div><div class="s">' + (st.next ? 'Next due ' + UI.date(st.next.dueDate) : 'No pending installments') + '</div></div>' +
        '<div class="portal-stat ' + (st.overdue ? 'tone-red' : '') + '"><div class="k">Next installment</div><div class="v">' + (next ? UI.moneyShort(next.amount - (next.paid || 0)) : '—') + '</div><div class="s">' + (next ? 'Installment #' + next.n + ' · ' + UI.date(next.dueDate) : 'Schedule complete') + '</div></div>' +
        '<div class="portal-stat"><div class="k">Payment progress</div><div class="v">' + st.pct + '%</div><div class="s">' + st.paid + ' of ' + st.entries + ' installments paid</div></div>' +
      '</div>' +
      '<div class="portal-section-grid" style="margin-bottom:18px">' +
        '<div class="card"><div class="card-head"><div><h3>My plot</h3><div class="sub">' + UI.esc(data.project.name) + '</div></div><div class="right">' + UI.badge(data.plot.status) + '</div></div><div class="card-body">' +
          '<div class="portal-plot"><div class="pp-icon">' + Icons.get('land') + '</div><div><div class="pp-name">Plot ' + UI.esc(data.plot.plotNo) + '</div><div class="pp-sub">' + UI.esc(data.project.district) + ', ' + UI.esc(data.project.region) + ' · ' + UI.esc(data.project.locationClass) + ' classification</div></div></div>' +
          '<div class="portal-info">' +
            '<div><div class="pi-k">Plot size</div><div class="pi-v">' + UI.num(data.plot.size) + ' sqm</div></div>' +
            '<div><div class="pi-k">Intended use</div><div class="pi-v">' + UI.esc(data.plot.use) + '</div></div>' +
            '<div><div class="pi-k">Selling price</div><div class="pi-v">' + UI.money(s.price) + '</div></div>' +
            '<div><div class="pi-k">Purchase date</div><div class="pi-v">' + UI.date(s.saleDate) + '</div></div>' +
            '<div><div class="pi-k">Agreement</div><div class="pi-v mono">' + UI.esc(s.ref) + '</div></div>' +
            '<div><div class="pi-k">Sales agent</div><div class="pi-v">' + UI.esc(s.agent) + '</div></div>' +
          '</div>' +
          '<div class="notice" style="margin-top:16px">' + Icons.get('info') + '<div>Plot boundaries and surveys are held as physical maps by the company. An interactive digital map is not yet available.</div></div>' +
        '</div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Installment plan</h3><div class="sub">' + UI.esc(data.plan.type) + ' · ' + data.plan.termMonths + ' months · ' + UI.esc(data.plan.frequency) + '</div></div></div><div class="card-body">' +
          '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">' + UI.ring(st.pct, 132, 11, st.pct + '%', 'paid') +
          '<div style="flex:1;min-width:150px"><div class="stack-legend" style="gap:8px 16px"><span class="lg"><i class="paid"></i>' + st.paid + ' paid</span><span class="lg"><i class="free"></i>' + (st.entries - st.paid) + ' remaining</span></div>' +
          '<div class="portal-info" style="margin-top:14px"><div><div class="pi-k">Paid to date</div><div class="pi-v">' + UI.moneyShort(Store.salePaid(s.id)) + '</div></div><div><div class="pi-k">Balance</div><div class="pi-v">' + UI.moneyShort(balance) + '</div></div></div></div></div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><button class="btn btn-outline btn-sm" data-goto="schedule">' + Icons.get('installments') + 'View full schedule</button><button class="btn btn-outline btn-sm" data-goto="payments">' + Icons.get('receipt') + 'Payment history</button></div>' +
        '</div></div>' +
      '</div>' +
      '<div class="grid grid-2" style="align-items:start;margin-bottom:18px">' +
        '<div class="card"><div class="card-head"><div><h3>Upcoming installments</h3><div class="sub">Next payments on your schedule</div></div></div><div class="card-body" style="padding-top:4px">' +
          (openEntries.length ? '<div class="p-list">' + openEntries.map(e => {
            const state = Store.entryState(e);
            return '<div class="p-item"><div class="pi-icon ' + (state === 'overdue' ? 'red' : state === 'partial' ? 'amber' : '') + '">' + Icons.get(state === 'overdue' ? 'alert' : 'clock') + '</div><div class="pi-main"><div class="pi-title">Installment #' + e.n + ' of ' + data.plan.entries.length + '</div><div class="pi-sub">Due ' + UI.date(e.dueDate) + '</div></div><div class="pi-right">' + entryLabel(e) + '<div class="pi-sub" style="margin-top:4px">' + UI.money(e.amount - (e.paid || 0)) + '</div></div></div>';
          }).join('') + '</div>' : '<div class="muted small" style="padding:8px 0">All installments are settled.</div>') +
        '</div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Recent payments</h3><div class="sub">Your latest receipts</div></div><div class="right"><button class="btn-link" data-goto="payments">View all</button></div></div><div class="card-body" style="padding-top:4px">' +
          (recent.length ? '<div class="p-list">' + recent.map(p => '<div class="p-item"><div class="pi-icon green">' + Icons.get('receipt') + '</div><div class="pi-main"><div class="pi-title">' + UI.esc(p.receiptNo) + '</div><div class="pi-sub">' + UI.date(p.date) + ' · ' + UI.esc(p.method) + '</div></div><div class="pi-right">' + UI.moneyShort(p.amount) + '<div style="margin-top:4px"><button class="btn-link" data-receipt="' + p.id + '">View receipt</button></div></div></div>').join('') + '</div>' :
          '<div class="muted small" style="padding:8px 0">No payments recorded yet.</div>') +
        '</div></div>' +
      '</div>' +
      '<div class="grid grid-2" style="align-items:start">' +
        '<div class="card"><div class="card-head"><div><h3>Need more land?</h3><div class="sub">Request an increase to your plot size</div></div></div><div class="card-body"><div class="portal-doc-note">Submit a request describing the additional size you need. Requests are recorded for review; the approval authority and conditions are still being confirmed.</div><div style="margin-top:12px"><button class="btn btn-outline btn-sm" data-goto="requests">' + Icons.get('send') + 'Request a plot size increase</button></div></div></div>' +
        '<div class="card"><div class="card-head"><div><h3>My documents</h3><div class="sub">Agreement, schedule and receipts</div></div></div><div class="card-body"><div class="portal-doc-note">Download a demo copy of your purchase agreement and installment schedule, or view printable receipts.</div><div style="margin-top:12px"><button class="btn btn-outline btn-sm" data-goto="documents">' + Icons.get('file') + 'Open documents</button></div></div></div>' +
      '</div>' + viewOnlyNotice();
  }

  function viewOnlyNotice() {
    return '<div class="notice warn" style="margin-top:18px">' + Icons.get('lock') + '<div><strong>This portal is view-only.</strong> You cannot make online payments, edit your account information, access invoices, or see any other customer\'s records. Please visit the office for any account changes.</div></div>';
  }

  /* ---------------- schedule ---------------- */
  function scheduleHTML(data) {
    if (!data.sale) return heroHTML(data, 'My installment schedule', 'No purchase recorded yet.') + noSale();
    const s = data.sale, plan = data.plan, st = data.stats;
    const rows = plan.entries.map(e => {
      const state = Store.entryState(e);
      return '<tr><td class="mono">#' + e.n + '</td><td>' + UI.date(e.dueDate) + '</td><td class="num">' + UI.money(e.amount) + '</td><td class="num">' + (e.paid ? UI.money(e.paid) : '—') + '</td><td class="num">' + UI.money(Math.max(0, e.amount - (e.paid || 0))) + '</td><td>' + entryLabel(e) + '</td><td>' + (state === 'paid' ? UI.date(e.paidDate) : '—') + '</td></tr>';
    }).join('');
    const partialCount = plan.entries.filter(e => Store.entryState(e) === 'partial').length;
    const counts = {
      paid: st.paid,
      overdue: st.overdue,
      partial: partialCount,
      pending: Math.max(0, st.entries - st.paid - st.overdue - partialCount)
    };
    const statusParts = [
      { value: counts.paid, color: 'var(--green)' },
      { value: counts.overdue, color: 'var(--red)' },
      { value: counts.partial, color: '#F59E0B' },
      { value: counts.pending, color: '#D6DAD4' }
    ];
    const statusLegend =
      '<div class="status-legend">' +
        '<div class="sl-row"><span class="lg-inline"><i class="paid"></i>Paid</span><strong>' + counts.paid + '</strong></div>' +
        '<div class="sl-row"><span class="lg-inline"><i class="pending"></i>Pending</span><strong>' + counts.pending + '</strong></div>' +
        '<div class="sl-row"><span class="lg-inline"><i class="overdue"></i>Overdue</span><strong style="color:' + (counts.overdue ? 'var(--red)' : 'inherit') + '">' + counts.overdue + '</strong></div>' +
        (counts.partial ? '<div class="sl-row"><span class="lg-inline"><i class="partial"></i>Partial</span><strong>' + counts.partial + '</strong></div>' : '') +
      '</div>';
    return heroHTML(data, 'My installment schedule', 'Agreement ' + s.ref + ' · ' + plan.type + ' plan · ' + plan.termMonths + ' months · ' + plan.frequency + ' payments.') +
      '<div class="portal-toolbar"><div><h2>Schedule details</h2><div class="sub">All amounts in Tanzanian Shillings. Amounts shown are scheduled installments; the initial deposit is recorded separately.</div></div>' +
        '<div class="right"><button class="btn btn-outline btn-sm" data-dl-schedule="1">' + Icons.get('download') + 'Download schedule</button><button class="btn btn-outline btn-sm" data-print-schedule="1">' + Icons.get('print') + 'Print schedule</button></div></div>' +
      '<div class="grid grid-2" style="margin-bottom:18px">' +
        '<div class="card"><div class="card-body"><div class="kv-cards" style="padding:0"><div class="item"><div class="k">Plan type</div><div class="v" style="font-size:14px">' + UI.esc(plan.type) + '</div><div class="small muted">' + plan.termMonths + ' months · ' + UI.esc(plan.frequency) + '</div></div><div class="item"><div class="k">Selling price</div><div class="v" style="font-size:14px">' + UI.money(s.price) + '</div><div class="small muted">Agreed price</div></div><div class="item"><div class="k">Outstanding</div><div class="v" style="font-size:14px">' + UI.money(Store.saleBalance(s.id)) + '</div><div class="small muted">' + (st.overdue ? st.overdue + ' overdue' : 'No overdue installments') + '</div></div></div></div></div>' +
        '<div class="card"><div class="card-body"><div class="compo-head"><span>Installment status</span><strong>' + counts.paid + ' of ' + st.entries + ' paid</strong></div>' +
          '<div class="status-chart">' +
          UI.partsDonut(statusParts, 108, counts.paid + ' / ' + st.entries, 'paid', counts.paid + ' paid, ' + counts.pending + ' pending, ' + counts.overdue + ' overdue' + (counts.partial ? ', ' + counts.partial + ' partial' : '')) +
          statusLegend +
          '</div>' +
        '</div></div>' +
      '</div>' +
      '<div class="card"><div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>Due date</th><th class="num">Scheduled</th><th class="num">Paid</th><th class="num">Remaining</th><th>Status</th><th>Paid on</th></tr></thead><tbody>' + rows + '</tbody>' +
        '<tfoot><tr><td colspan="2">Total</td><td class="num">' + UI.money(plan.entries.reduce((sum, e) => sum + e.amount, 0)) + '</td><td class="num">' + UI.money(plan.entries.reduce((sum, e) => sum + (e.paid || 0), 0)) + '</td><td class="num">' + UI.money(Store.saleBalance(s.id)) + '</td><td colspan="2"></td></tr></tfoot></table></div>' +
        '<div class="table-foot"><span>Initial deposit of ' + UI.money(s.deposit) + ' was recorded at purchase.</span><span class="muted small">View your receipts under Payments.</span></div></div>' +
      '<div class="notice" style="margin-top:16px">' + Icons.get('info') + '<div>The schedule is for information only. Overdue-reason and payment-approval workflows are still pending clarification and are not applied to your account in this prototype.</div></div>' + viewOnlyNotice();
  }

  function noSale() {
    return '<div class="card"><div class="card-body">' + UI.emptyState('land', 'No purchase recorded', 'This section will be available once a plot purchase is registered for your account.') + '</div></div>';
  }

  /* ---------------- payments ---------------- */
  function paymentsHTML(data) {
    if (!data.sale) return heroHTML(data, 'My payments', 'No purchase recorded yet.') + noSale();
    const s = data.sale;
    const total = data.payments.reduce((sum, p) => sum + p.amount, 0);
    return heroHTML(data, 'My payments', 'Every payment recorded against your agreement, with a printable receipt for each transaction.') +
      '<div class="portal-stats">' +
        '<div class="portal-stat accent"><div class="k">Total paid</div><div class="v">' + UI.moneyShort(total) + '</div><div class="s">' + data.payments.length + ' transactions</div></div>' +
        '<div class="portal-stat"><div class="k">Outstanding balance</div><div class="v">' + UI.moneyShort(Store.saleBalance(s.id)) + '</div><div class="s">After all recorded payments</div></div>' +
        '<div class="portal-stat"><div class="k">Last payment</div><div class="v" style="font-size:15px">' + (data.payments[0] ? UI.date(data.payments[0].date) : '—') + '</div><div class="s">' + (data.payments[0] ? UI.moneyShort(data.payments[0].amount) : 'No payments yet') + '</div></div>' +
        '<div class="portal-stat"><div class="k">Receipts</div><div class="v">' + data.payments.length + '</div><div class="s">View or download any receipt</div></div>' +
      '</div>' +
      '<div class="card"><div class="card-head"><div><h3>Payment history</h3><div class="sub">Agreement ' + UI.esc(s.id) + ' · ' + UI.esc(s.ref) + '</div></div><div class="right">' + UI.badge('Simulated', 'grey', { noDot: true }) + '</div></div>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th>Receipt</th><th>Date</th><th>Type</th><th>Method</th><th>Reference</th><th class="num">Amount</th><th></th></tr></thead><tbody>' +
        (data.payments.length ? data.payments.map(p => '<tr><td class="mono">' + UI.esc(p.receiptNo) + '</td><td>' + UI.date(p.date) + '</td><td>' + UI.esc(p.type) + '</td><td>' + UI.methodChip(p.method) + '</td><td class="mono small">' + UI.esc(p.txnRef) + '</td><td class="num strong">' + UI.money(p.amount) + '</td><td><div style="display:flex;gap:6px;justify-content:flex-end"><button class="btn btn-sm btn-ghost" data-receipt="' + p.id + '">View receipt</button><button class="icon-btn" style="width:30px;height:30px" data-dl-receipt="' + p.id + '" title="Download receipt" aria-label="Download receipt">' + Icons.get('download') + '</button></div></td></tr>').join('') : '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:26px">No payments have been recorded yet.</td></tr>') +
        '</tbody><tfoot><tr><td colspan="5">Total paid</td><td class="num">' + UI.money(total) + '</td><td></td></tr></tfoot></table></div>' +
        '<div class="table-foot"><span>Receipts are simulated demo documents and can be printed from the receipt preview.</span><span class="muted small">No online payment is available.</span></div></div>' + viewOnlyNotice();
  }

  function downloadReceipt(payment) {
    const receipt = UI.receiptHTML(payment);
    UI.download('Receipt_' + payment.receiptNo + '.html', '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ' + payment.receiptNo + '</title><link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/modules.css"></head><body style="background:#fff;padding:30px;max-width:760px;margin:auto">' + receipt + '<p style="font-family:sans-serif;color:#777;font-size:12px;margin-top:20px">Demo receipt downloaded from the customer portal. No real payment was processed.</p></body></html>', 'text/html');
    UI.toast('Receipt downloaded.');
  }

  /* ---------------- documents ---------------- */
  function documentsHTML(data) {
    if (!data.sale) return heroHTML(data, 'My documents', 'No documents yet.') + noSale();
    const s = data.sale;
    const requests = Store.db.requests.filter(r => r.customerId === data.customer.id);
    return heroHTML(data, 'My documents', 'Download demo copies of your agreement and schedule, and review your receipts.') +
      '<div class="doc-grid">' +
        '<div class="doc-card"><div class="dc-top"><div class="dc-icon">' + Icons.get('file') + '</div><div><div class="dc-name">' + UI.esc(s.document ? s.document.name : 'Purchase agreement') + '</div><div class="dc-meta">Purchase agreement · demo copy (TXT)</div></div></div><div style="font-size:11.5px;color:var(--muted)">Signed paper copies are held by the company. This downloadable copy is simulated.</div><div class="dc-actions"><button class="btn btn-sm btn-outline" data-dl-agreement="1">' + Icons.get('download') + 'Download</button></div></div>' +
        '<div class="doc-card"><div class="dc-top"><div class="dc-icon">' + Icons.get('installments') + '</div><div><div class="dc-name">Installment schedule</div><div class="dc-meta">' + data.plan.entries.length + ' installments · ' + UI.esc(data.plan.frequency) + '</div></div></div><div style="font-size:11.5px;color:var(--muted)">Full due dates, amounts and payment progress for your plan.</div><div class="dc-actions"><button class="btn btn-sm btn-outline" data-dl-schedule="1">' + Icons.get('download') + 'Download</button></div></div>' +
        '<div class="doc-card"><div class="dc-top"><div class="dc-icon">' + Icons.get('receipt') + '</div><div><div class="dc-name">Payment receipts</div><div class="dc-meta">' + data.payments.length + ' receipt(s) available</div></div></div><div style="font-size:11.5px;color:var(--muted)">Open any receipt to print or download it.</div><div class="dc-actions"><button class="btn btn-sm btn-outline" data-goto="payments">' + Icons.get('eye') + 'View receipts</button></div></div>' +
        '<div class="doc-card"><div class="dc-top"><div class="dc-icon">' + Icons.get('map-pin') + '</div><div><div class="dc-name">Plot map copy</div><div class="dc-meta">Physical map held by office</div></div></div><div style="font-size:11.5px;color:var(--muted)">Digital plot maps are not yet available; surveys remain on physical maps.</div><div class="dc-actions"><button class="btn btn-sm btn-outline" disabled>' + Icons.get('lock') + 'Not available</button></div></div>' +
        '<div class="doc-card"><div class="dc-top"><div class="dc-icon">' + Icons.get('send') + '</div><div><div class="dc-name">Plot size requests</div><div class="dc-meta">' + requests.length + ' request(s)</div></div></div><div style="font-size:11.5px;color:var(--muted)">Track requests to increase your plot size.</div><div class="dc-actions"><button class="btn btn-sm btn-outline" data-goto="requests">' + Icons.get('eye') + 'View requests</button></div></div>' +
      '</div>' +
      '<div class="notice" style="margin-top:16px">' + Icons.get('info') + '<div>Downloaded documents are clearly marked as demo copies. Invoices are not provided in the customer portal.</div></div>' + viewOnlyNotice();
  }

  function agreementText(data) {
    const s = data.sale, c = data.customer, plot = data.plot, prj = data.project, plan = data.plan;
    const lines = [];
    lines.push(Store.db.settings.companyName.toUpperCase());
    lines.push(Store.db.settings.companyAddress);
    lines.push('');
    lines.push('PURCHASE AGREEMENT — DEMO COPY');
    lines.push('Agreement reference: ' + s.ref + '  (' + s.id + ')');
    lines.push('Purchase date: ' + UI.date(s.saleDate));
    lines.push('');
    lines.push('CUSTOMER');
    lines.push('Name: ' + c.name);
    lines.push('Customer number: ' + c.id);
    lines.push('Phone: ' + c.phone + '   Email: ' + (c.email || '—'));
    lines.push('NIDA / passport: ' + c.nida);
    lines.push('Address: ' + (c.address || '—'));
    lines.push('');
    lines.push('PROPERTY');
    lines.push('Project: ' + prj.name + ' (' + prj.district + ', ' + prj.region + ')');
    lines.push('Plot number: ' + plot.plotNo + '   Size: ' + plot.size + ' sqm');
    lines.push('Intended use: ' + plot.use + '   Location classification: ' + prj.locationClass);
    lines.push('Selling price: ' + UI.money(s.price));
    lines.push('Initial deposit: ' + UI.money(s.deposit));
    lines.push('');
    lines.push('INSTALLMENT PLAN');
    lines.push(plan.type + ' plan · ' + plan.termMonths + ' months · ' + plan.frequency + ' payments');
    setupScheduleRows(plan).forEach(e => lines.push('#' + e.n + ' due ' + e.dueDate + ' — ' + UI.money(e.amount)));
    lines.push('');
    lines.push('Sales agent: ' + s.agent);
    lines.push('Contract document: ' + (s.document ? s.document.name : 'Purchase agreement'));
    lines.push('');
    lines.push('This is a simulated demo document generated by the Ardhi LIMS prototype.');
    lines.push('It is not a legally binding contract. All names, plots and amounts are fictional.');
    return lines.join('\n');
  }

  function setupScheduleRows(plan) {
    return plan.entries.map(e => ({ n: e.n, dueDate: e.dueDate, amount: e.amount }));
  }

  function downloadAgreement() {
    const data = ctx();
    if (!data.sale) return;
    UI.download(data.sale.id + '_Purchase_Agreement_DEMO.txt', agreementText(data), 'text/plain');
    UI.toast('Demo purchase agreement downloaded.');
  }

  function scheduleCSV(data) {
    const rows = [['Installment', 'Due date', 'Scheduled (TZS)', 'Paid (TZS)', 'Status', 'Paid on']];
    data.plan.entries.forEach(e => rows.push([e.n, e.dueDate, e.amount, e.paid || 0, Store.entryState(e), e.paidDate || '']));
    return rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  }

  function downloadSchedule() {
    const data = ctx();
    if (!data.sale) return;
    UI.download(data.sale.id + '_Installment_Schedule_DEMO.csv', scheduleCSV(data), 'text/csv');
    UI.toast('Demo installment schedule downloaded.');
  }

  function printSchedule() {
    const data = ctx();
    if (!data.sale) return;
    const s = data.sale;
    const rows = data.plan.entries.map(e => '<tr><td>' + e.n + '</td><td>' + UI.date(e.dueDate) + '</td><td style="text-align:right">' + UI.money(e.amount) + '</td><td style="text-align:right">' + (e.paid ? UI.money(e.paid) : '—') + '</td><td>' + (Store.entryState(e)) + '</td><td>' + (e.paidDate ? UI.date(e.paidDate) : '—') + '</td></tr>').join('');
    const doc = document.createElement('div');
    doc.innerHTML = '<div class="print-letterhead"><div><div class="nm">' + UI.esc(Store.db.settings.companyName) + '</div><div class="sub">' + UI.esc(Store.db.settings.companyAddress) + '</div><div class="sub">' + UI.esc(Store.db.settings.companyPhone) + '</div></div>' +
      '<div style="text-align:right"><div class="nm" style="font-size:12px">Installment schedule</div><div class="sub">' + UI.esc(data.customer.name) + ' · ' + UI.esc(s.id) + '</div><div class="sub">Generated ' + UI.date(Store.iso(Store.today())) + '</div></div></div>' +
      '<table class="report-table-print"><thead><tr><th>#</th><th>Due date</th><th style="text-align:right">Scheduled</th><th style="text-align:right">Paid</th><th>Status</th><th>Paid on</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p style="font-size:10px;color:#777;margin-top:12px">Demo schedule from the Ardhi customer portal. Amounts are in TZS and are not a real financial statement.</p>';
    UI.printElement(doc, 'Installment schedule — ' + data.customer.name);
  }

  /* ---------------- requests ---------------- */
  function requestsHTML(data) {
    if (!data.sale) return heroHTML(data, 'My requests', 'No purchase recorded yet.') + noSale();
    const c = data.customer, s = data.sale, plot = data.plot;
    const requests = Store.db.requests.filter(r => r.customerId === c.id && r.saleId === s.id).slice().sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
    const rows = requests.map(r => '<tr data-request-row="' + r.id + '"><td class="mono">' + UI.esc(r.id) + '</td><td>' + UI.date(r.submittedAt) + '</td><td class="num">' + UI.num(r.currentSize) + ' sqm</td><td class="num">+' + UI.num(r.requestedSize) + ' sqm</td><td>' + UI.badge(r.status) + '</td><td><button class="btn btn-sm btn-ghost" data-request="' + r.id + '">View</button></td></tr>').join('');
    return heroHTML(data, 'Plot size requests', 'Ask to increase your plot size. Requests are recorded; the approval process is still subject to confirmation.') +
      '<div class="portal-section-grid">' +
        '<div class="card"><div class="card-head"><div><h3>Request additional plot size</h3><div class="sub">Plot ' + UI.esc(plot.plotNo) + ' · ' + UI.num(plot.size) + ' sqm currently</div></div></div><div class="card-body">' +
          '<div class="kv-cards" style="padding:0;margin-bottom:16px"><div class="item"><div class="k">Project</div><div class="v" style="font-size:13px">' + UI.esc(data.project.name) + '</div></div><div class="item"><div class="k">Current size</div><div class="v" style="font-size:13px">' + UI.num(plot.size) + ' sqm</div></div><div class="item"><div class="k">Current price</div><div class="v" style="font-size:13px">' + UI.money(s.price) + '</div></div></div>' +
          '<form id="requestForm" class="portal-request-form" novalidate>' +
            '<div class="field" data-field="requestedSize"><label>Additional size requested (sqm) <span class="req">*</span></label><input class="input" type="number" name="requestedSize" id="reqSize" min="1" step="1" placeholder="e.g. 100" /><span class="error-msg">Enter the additional size in square metres.</span><span class="hint" id="reqTotal">New plot size will appear here.</span></div>' +
            '<div class="field" data-field="note"><label>Explanation <span class="req">*</span></label><textarea class="textarea" name="note" placeholder="Explain why you would like to increase your plot size…" style="min-height:110px"></textarea><span class="error-msg">Please describe your request.</span></div>' +
            '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">' + Icons.get('send') + 'Submit request</button></div>' +
          '</form>' +
          '<div class="notice warn" style="margin-top:14px">' + Icons.get('alert') + '<div><strong>Approval pending clarification.</strong> The responsible authority, required checks and any price adjustment are not yet defined. Submitting a request does not change your plot record.</div></div>' +
          '<div class="notice" style="margin-top:10px">' + Icons.get('info') + '<div>Requests are submitted to the management office for review. No online payment is required in this portal.</div></div>' +
        '</div></div>' +
        '<div class="card"><div class="card-head"><div><h3>My requests</h3><div class="sub">' + requests.length + ' request(s)</div></div></div>' +
          (requests.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>Request</th><th>Submitted</th><th class="num">Current</th><th class="num">Requested</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' :
            '<div class="card-body">' + UI.emptyState('send', 'No requests yet', 'Your plot size requests will appear here after submission.') + '</div>') +
          '<div class="card-body" style="border-top:1px solid var(--line-soft)"><div class="portal-doc-note">Request statuses shown here are informational. Approval, rejection and pricing rules are pending clarification.</div></div>' +
        '</div>' +
      '</div>' + viewOnlyNotice();
  }

  function bindRequests(data) {
    const form = $('#requestForm');
    if (!form) return;
    const sizeInput = $('#reqSize');
    const update = () => {
      const n = Number(sizeInput.value);
      $('#reqTotal').textContent = n > 0 ? 'New plot size would be ' + UI.num(data.plot.size + n) + ' sqm (subject to approval).' : 'New plot size will appear here.';
    };
    sizeInput.addEventListener('input', update);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = UI.validate(form, [
        { name: 'requestedSize', required: true, msg: 'Enter the additional size in square metres.' },
        { name: 'note', required: true, msg: 'Please describe your request.' }
      ]);
      const n = Number(sizeInput.value);
      if (!(n > 0)) { UI.fieldError(sizeInput, 'Enter a positive number of square metres.'); return; }
      if (!ok) return;
      const req = Store.submitRequest({
        customerId: data.customer.id, saleId: data.sale.id,
        requestedSize: n, note: form.elements.note.value
      });
      form.reset();
      $('#reqTotal').textContent = 'New plot size will appear here.';
      renderSection();
      UI.modal({
        title: 'Request submitted',
        subtitle: req.id + ' · ' + UI.date(req.submittedAt),
        size: 'md',
        body: '<div class="notice green">' + Icons.get('check-circle') + '<div><strong>Your request has been recorded.</strong> The office can now review your plot size increase request.</div></div>' +
          '<div class="kv-cards" style="margin-top:14px"><div class="item"><div class="k">Current size</div><div class="v" style="font-size:14px">' + UI.num(req.currentSize) + ' sqm</div></div><div class="item"><div class="k">Additional requested</div><div class="v" style="font-size:14px">' + UI.num(req.requestedSize) + ' sqm</div></div><div class="item"><div class="k">Status</div><div class="v" style="font-size:14px">' + UI.badge(req.status) + '</div></div></div>' +
          '<div class="notice warn" style="margin-top:14px">' + Icons.get('alert') + '<div><strong>Approval workflow pending clarification.</strong> No approval authority or conditions have been finalised. Your plot record has not changed.</div></div>',
        footer: '<button class="btn btn-primary" data-x="close">Done</button>',
        onMount(el2, close) { $('[data-x="close"]', el2).addEventListener('click', close); }
      });
      UI.toast('Request ' + req.id + ' submitted for review.');
    });
  }

  function requestModal(r) {
    const s = Store.sale(r.saleId);
    const plot = s ? Store.plot(s.plotId) : null;
    UI.modal({
      title: 'Plot size request ' + r.id,
      subtitle: UI.date(r.submittedAt) + ' · ' + r.status,
      size: 'md',
      body: '<div class="kv-cards"><div class="item"><div class="k">Plot</div><div class="v" style="font-size:13px">' + UI.esc(plot ? plot.plotNo : '—') + '</div></div><div class="item"><div class="k">Current size</div><div class="v" style="font-size:13px">' + UI.num(r.currentSize) + ' sqm</div></div><div class="item"><div class="k">Additional size</div><div class="v" style="font-size:13px">+' + UI.num(r.requestedSize) + ' sqm</div></div></div>' +
        '<div style="margin-top:14px"><div class="k" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;margin-bottom:5px">Your explanation</div><div class="msg-preview">' + UI.esc(r.note || '—') + '</div></div>' +
        '<div style="margin-top:12px">' + UI.badge(r.status) + '</div>' +
        (r.response ? '<div class="notice info" style="margin-top:12px">' + Icons.get('info') + '<div>' + UI.esc(r.response) + '</div></div>' : '') +
        '<div class="notice warn" style="margin-top:12px">' + Icons.get('alert') + '<div><strong>Pending clarification.</strong> Approval authority, checks and any price adjustment for plot size increases are not yet defined in the PRD.</div></div>',
      footer: '<button class="btn btn-primary" data-x="close">Close</button>',
      onMount(el, close) { $('[data-x="close"]', el).addEventListener('click', close); }
    });
  }

  /* ---------------- events ---------------- */
  function handleClick(e) {
    const goto = e.target.closest('[data-goto]');
    if (goto) { setSection(goto.getAttribute('data-goto')); return; }
    const rc = e.target.closest('[data-receipt]');
    if (rc) {
      const p = Store.db.payments.find(x => x.id === rc.getAttribute('data-receipt'));
      if (p) UI.showReceipt(p);
      return;
    }
    const dlr = e.target.closest('[data-dl-receipt]');
    if (dlr) {
      const p = Store.db.payments.find(x => x.id === dlr.getAttribute('data-dl-receipt'));
      if (p) downloadReceipt(p);
      return;
    }
    if (e.target.closest('[data-dl-agreement]')) { downloadAgreement(); return; }
    if (e.target.closest('[data-dl-schedule]')) { downloadSchedule(); return; }
    if (e.target.closest('[data-print-schedule]')) { printSchedule(); return; }
    const req = e.target.closest('[data-request]');
    if (req) {
      const r = Store.db.requests.find(x => x.id === req.getAttribute('data-request'));
      if (r) requestModal(r);
    }
  }

  function init() {
    Store.init();
    paintIcons();
    renderDemoAccounts();
    bindLogin();

    $('#portalNav').addEventListener('click', (e) => {
      const b = e.target.closest('[data-section]');
      if (b) setSection(b.getAttribute('data-section'));
    });
    $('#portalLogout').addEventListener('click', signOut);
    $('#portalView').addEventListener('click', handleClick);
    $('#portalView').addEventListener('change', (e) => {
      if (e.target.id === 'portalSaleSelect') {
        saleId = e.target.value;
        renderSection();
      }
    });

    const param = new URLSearchParams(location.search).get('customer');
    if (param) {
      const found = findCustomer(param);
      if (found) Store.portalSignIn(found.id);
    }

    if (Store.currentCustomer()) showPortal();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
