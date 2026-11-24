/* Ardhi LIMS — Reports with role-based access */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;
  const $$ = UI.$$;

  const CATS = [
    { id: 'land', label: 'Land & plot reports', icon: 'land', roles: ['Owner'] },
    { id: 'sales', label: 'Sales reports', icon: 'sales', roles: ['Owner', 'Manager'] },
    { id: 'customers', label: 'Customer reports', icon: 'customers', roles: ['Owner'] },
    { id: 'installments', label: 'Installment reports', icon: 'installments', roles: ['Owner', 'Manager'] },
    { id: 'payments', label: 'Payment reports', icon: 'payments', roles: ['Owner', 'Manager'] },
    { id: 'outstanding', label: 'Outstanding balances', icon: 'receipt', roles: ['Owner', 'Manager'] },
    { id: 'overdue', label: 'Overdue payments', icon: 'alert', roles: ['Owner', 'Manager'] },
    { id: 'projects', label: 'Project performance', icon: 'reports', roles: ['Owner', 'Manager'] },
    { id: 'staff', label: 'Staff operational activity', icon: 'users', roles: ['Owner', 'Manager'] }
  ];

  const state = { cat: 'sales', period: 'monthly', project: 'all', from: null, to: null };
  let chartRender = null;

  const cat = (id) => CATS.find(c => c.id === id) || CATS[1];
  const canAccessCat = (c) => c.roles.includes(App.role());

  function currentRange() {
    const today = Store.today();
    const to = Store.iso(today);
    if (state.period === 'custom' && state.from && state.to) {
      return { from: state.from, to: state.to, label: UI.date(state.from) + ' – ' + UI.date(state.to) };
    }
    let from = to;
    if (state.period === 'weekly') from = Store.iso(Store.addDays(today, -6));
    if (state.period === 'monthly') from = Store.iso(new Date(today.getFullYear(), today.getMonth(), 1));
    if (state.period === 'annual') from = today.getFullYear() + '-01-01';
    return { from, to, label: UI.date(from) + ' – ' + UI.date(to) };
  }

  function projectLabel() { return state.project === 'all' ? 'All projects' : Store.project(state.project).name; }
  function inRange(dateStr) {
    if (!dateStr) return false;
    const d = String(dateStr).slice(0, 10);
    const r = currentRange();
    return d >= r.from && d <= r.to;
  }
  function inProject(id) { return state.project === 'all' || id === state.project; }
  const money = UI.money;
  const mshort = UI.moneyShort;

  function emptyRow(cols, msg) {
    return '<tr><td colspan="' + cols + '" style="text-align:center;color:var(--muted);padding:26px 10px">' + UI.esc(msg) + '</td></tr>';
  }

  function chartCard(inner) {
    return '<div style="margin-bottom:20px"><div class="k" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;margin-bottom:10px">Visual summary</div>' + inner + '</div>';
  }

  /* ---------- per-category report builders ---------- */
  function buildLand() {
    const plots = Store.db.plots.filter(p => inProject(p.projectId));
    const projects = Store.db.projects.filter(p => inProject(p.id));
    const counts = { Available: 0, Reserved: 0, Installment: 0, Sold: 0 };
    plots.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    const value = plots.reduce((s, p) => s + p.price, 0);
    const rows = projects.map(prj => {
      const ps = Store.db.plots.filter(p => p.projectId === prj.id);
      const prjValue = ps.reduce((s, p) => s + p.price, 0);
      const collected = Store.db.payments.filter(p => p.projectId === prj.id).reduce((s, p) => s + p.amount, 0);
      const available = ps.filter(p => p.status === 'Available').length;
      const sold = ps.filter(p => p.status === 'Sold').length;
      const mid = ps.filter(p => p.status === 'Reserved' || p.status === 'Installment').length;
      return { prj, ps, prjValue, collected, available, sold, mid };
    });
    return {
      title: 'Land & plot report',
      desc: 'Inventory position by project, plot status and portfolio value as at ' + UI.date(Store.iso(Store.today())) + '.',
      summary: [
        { k: 'Total plots', v: plots.length, s: plots.reduce((s, p) => s + p.size, 0).toLocaleString('en-US') + ' sqm total' },
        { k: 'Sold plots', v: counts.Sold, s: counts.Installment + ' under installment' },
        { k: 'Available plots', v: counts.Available, s: counts.Reserved + ' reserved' },
        { k: 'Portfolio value', v: mshort(value), s: 'Across ' + projects.length + ' projects' }
      ],
      table: '<table class="data report-table-print"><thead><tr><th>Project</th><th>Location class</th><th class="num">Plots</th><th class="num">Sold</th><th class="num">Available</th><th class="num">Reserved / Inst.</th><th class="num">Area (sqm)</th><th class="num">Portfolio value</th><th class="num">Collected</th></tr></thead><tbody>' +
        rows.map(x => '<tr><td><div class="t-main">' + UI.esc(x.prj.name) + '</div><div class="t-sub">' + UI.esc(x.prj.district) + ', ' + UI.esc(x.prj.region) + '</div></td><td>' + UI.esc(x.prj.locationClass) + '</td><td class="num">' + x.ps.length + '</td><td class="num">' + x.sold + '</td><td class="num">' + x.available + '</td><td class="num">' + x.mid + '</td><td class="num">' + UI.num(x.ps.reduce((s, p) => s + p.size, 0)) + '</td><td class="num">' + money(x.prjValue) + '</td><td class="num">' + money(x.collected) + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td>Total</td><td></td><td class="num">' + plots.length + '</td><td class="num">' + counts.Sold + '</td><td class="num">' + counts.Available + '</td><td class="num">' + (counts.Reserved + counts.Installment) + '</td><td class="num">' + UI.num(plots.reduce((s, p) => s + p.size, 0)) + '</td><td class="num">' + money(value) + '</td><td class="num">' + money(Store.db.payments.filter(p => inProject(p.projectId)).reduce((s, p) => s + p.amount, 0)) + '</td></tr></tfoot></table>',
      chart: (container) => UI.donutChart(container, {
        centerValue: plots.length, centerLabel: 'plots',
        segments: [
          { label: 'Available', value: counts.Available, color: '#16A34A' },
          { label: 'Reserved', value: counts.Reserved, color: '#F59E0B' },
          { label: 'Installment', value: counts.Installment, color: '#2563EB' },
          { label: 'Sold', value: counts.Sold, color: '#171717' }
        ]
      }),
      note: '<div class="notice info">' + Icons.get('info') + '<div>Plot status counts are a live snapshot. Physical map digitisation is still pending, so no spatial boundaries are reported.</div></div>'
    };
  }

  function salesSeries(list) {
    const r = currentRange();
    const days = Math.round((Store.parseDate(r.to) - Store.parseDate(r.from)) / 86400000) + 1;
    const labels = [], data = [];
    if (days > 31) {
      let d = new Date(Store.parseDate(r.from).getFullYear(), Store.parseDate(r.from).getMonth(), 1);
      while (d <= Store.parseDate(r.to)) {
        labels.push(UI.date(Store.iso(d), 'month'));
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        data.push(list.filter(s => s.saleDate.slice(0, 7) === key).reduce((sum, s) => sum + s.price, 0));
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
    } else {
      let d = Store.parseDate(r.from);
      while (d <= Store.parseDate(r.to)) {
        const iso = Store.iso(d);
        labels.push(UI.date(iso, 'short'));
        data.push(list.filter(s => s.saleDate === iso).reduce((sum, s) => sum + s.price, 0));
        d = Store.addDays(d, 1);
      }
    }
    return { labels, data };
  }

  function buildSales() {
    const list = Store.db.sales.filter(s => inRange(s.saleDate) && inProject(s.projectId));
    const value = list.reduce((s, x) => s + x.price, 0);
    const deposits = list.reduce((s, x) => s + x.deposit, 0);
    return {
      title: 'Sales report',
      desc: 'New sales recorded in the selected period. Values are agreed selling prices, not cash collected.',
      summary: [
        { k: 'Sales recorded', v: list.length, s: currentRange().label },
        { k: 'Agreed value', v: mshort(value), s: 'Total contract value' },
        { k: 'Initial deposits', v: mshort(deposits), s: value ? Math.round((deposits / value) * 100) + '% of value' : '—' },
        { k: 'Average sale', v: list.length ? mshort(value / list.length) : '—', s: 'Per agreement' }
      ],
      table: '<table class="data report-table-print"><thead><tr><th>Date</th><th>Agreement</th><th>Customer</th><th>Project / plot</th><th class="num">Selling price</th><th class="num">Deposit</th><th>Agent</th><th>Status</th></tr></thead><tbody>' +
        (list.length ? list.slice().sort((a, b) => (a.saleDate < b.saleDate ? 1 : -1)).map(s => {
          const c = Store.customer(s.customerId);
          const plot = Store.plot(s.plotId);
          return '<tr><td>' + UI.date(s.saleDate) + '</td><td class="mono">' + UI.esc(s.id) + '<div class="t-sub">' + UI.esc(s.ref) + '</div></td><td>' + UI.esc(c ? c.name : '—') + '</td><td>' + UI.esc(Store.project(s.projectId).name) + '<div class="t-sub">Plot ' + UI.esc(plot ? plot.plotNo : '—') + '</div></td><td class="num">' + money(s.price) + '</td><td class="num">' + money(s.deposit) + '</td><td>' + UI.esc(s.agent) + '</td><td>' + UI.badge(s.status) + '</td></tr>';
        }).join('') : emptyRow(8, 'No sales recorded in this period.')) +
        '</tbody><tfoot><tr><td colspan="4">Total</td><td class="num">' + money(value) + '</td><td class="num">' + money(deposits) + '</td><td colspan="2">' + list.length + ' sale(s)</td></tr></tfoot></table>',
      chart: (container) => {
        const series = salesSeries(list);
        UI.lineChart(container, { labels: series.labels, data: series.data, height: 220, format: (v) => mshort(v) });
      },
      note: '<div class="notice">' + Icons.get('info') + '<div>This report shows agreed sale values and deposits. Cash collected is reported separately under Payment reports.</div></div>'
    };
  }

  function buildCustomers() {
    const all = Store.db.customers.slice();
    const scope = all.filter(c => state.project === 'all' || Store.db.sales.some(s => s.customerId === c.id && s.projectId === state.project));
    const fresh = scope.filter(c => inRange(c.registeredAt));
    const withBalance = scope.filter(c => Store.rowForCustomer(c).balance > 0);
    const rows = scope.map(c => ({ c, row: Store.rowForCustomer(c) })).sort((a, b) => b.row.totalPaid - a.row.totalPaid);
    return {
      title: 'Customer report',
      desc: 'Registered customers, new registrations in the period, and lifetime payment position.',
      summary: [
        { k: 'New customers', v: fresh.length, s: currentRange().label },
        { k: 'Customers in scope', v: scope.length, s: 'With portal accounts' },
        { k: 'With balance', v: withBalance.length, s: 'Outstanding installments' },
        { k: 'Lifetime collected', v: mshort(scope.reduce((s, c) => s + Store.rowForCustomer(c).totalPaid, 0)), s: 'From customer payments' }
      ],
      table: '<table class="data report-table-print"><thead><tr><th>Customer</th><th>Contact</th><th>NIDA / passport</th><th class="num">Plots</th><th class="num">Total paid</th><th class="num">Balance</th><th>Registered</th></tr></thead><tbody>' +
        (rows.length ? rows.map(x => '<tr><td><div class="t-main">' + UI.esc(x.c.name) + '</div><div class="t-sub">' + UI.esc(x.c.id) + '</div></td><td>' + UI.esc(x.c.phone) + '<div class="t-sub">' + UI.esc(x.c.email || '—') + '</div></td><td class="mono">' + UI.esc(x.c.nida) + '</td><td class="num">' + x.row.plots + '</td><td class="num">' + money(x.row.totalPaid) + '</td><td class="num">' + money(x.row.balance) + '</td><td>' + UI.date(x.c.registeredAt) + '</td></tr>').join('') : emptyRow(7, 'No customers in scope.')) +
        '</tbody></table>',
      chart: (container) => UI.barChart(container, {
        items: rows.slice(0, 6).map((x, i) => ({ label: x.c.name, value: x.row.totalPaid, color: ['#16A34A', '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#DCFCE7'][i] })),
        format: (v) => mshort(v)
      }),
      note: '<div class="notice">' + Icons.get('info') + '<div>Customer identities shown are fictional demo records. The customer portal exposes only the signed-in customer\'s own account.</div></div>'
    };
  }

  function planRows() {
    return Store.db.plans.map(p => {
      const s = Store.sale(p.saleId);
      const st = Store.planStats(p);
      return { p, s, c: Store.customer(p.customerId), st, status: Store.planStatus(p) };
    }).filter(x => x.s && inProject(x.s.projectId));
  }

  function buildInstallments() {
    const rows = planRows();
    const scheduled = rows.reduce((sum, x) => sum + x.p.entries.filter(e => inRange(e.dueDate)).reduce((a, e) => a + e.amount, 0), 0);
    const paidInPeriod = Store.db.payments.filter(p => inRange(p.date) && inProject(p.projectId)).reduce((s, p) => s + p.amount, 0);
    const completed = rows.filter(x => x.st.completed).length;
    const overdue = rows.filter(x => x.st.overdue).length;
    return {
      title: 'Installment report',
      desc: 'Installment plans, progress and amounts scheduled within the selected period.',
      summary: [
        { k: 'Plans in scope', v: rows.length, s: completed + ' completed' },
        { k: 'Scheduled this period', v: mshort(scheduled), s: currentRange().label },
        { k: 'Collected this period', v: mshort(paidInPeriod), s: 'All payment types' },
        { k: 'Plans overdue', v: overdue, s: overdue ? 'Requires follow-up' : 'None overdue' }
      ],
      table: '<table class="data report-table-print"><thead><tr><th>Customer</th><th>Account</th><th>Project / plot</th><th>Plan</th><th class="num">Progress</th><th>Next due</th><th>Status</th></tr></thead><tbody>' +
        (rows.length ? rows.map(x => '<tr><td>' + UI.esc(x.c.name) + '<div class="t-sub">' + UI.esc(x.c.phone) + '</div></td><td class="mono">' + UI.esc(x.p.id) + '<div class="t-sub">' + UI.esc(x.s.id) + '</div></td><td>' + UI.esc(Store.project(x.s.projectId).name) + '<div class="t-sub">Plot ' + UI.esc(Store.plot(x.s.plotId).plotNo) + '</div></td><td>' + UI.esc(x.p.type) + '<div class="t-sub">' + x.p.termMonths + ' months · ' + UI.esc(x.p.frequency) + '</div></td><td class="num">' + x.st.pct + '%</td><td>' + (x.st.next ? UI.date(x.st.next.dueDate) : '—') + '</td><td>' + UI.badge(x.status.label, x.status.cls) + '</td></tr>').join('') : emptyRow(7, 'No installment plans in scope.')) +
        '</tbody></table>',
      chart: (container) => UI.donutChart(container, {
        centerValue: rows.length, centerLabel: 'plans',
        segments: [
          { label: 'On track', value: rows.filter(x => x.status.key === 'ontrack').length, color: '#2563EB' },
          { label: 'Overdue', value: overdue, color: '#DC2626' },
          { label: 'Completed', value: completed, color: '#16A34A' }
        ]
      }),
      note: '<div class="notice">' + Icons.get('info') + '<div>Scheduled amounts reflect due dates within the period. Collected amounts reflect payments recorded in the same period.</div></div>'
    };
  }

  function buildPayments() {
    const list = Store.db.payments.filter(p => inRange(p.date) && inProject(p.projectId));
    const total = list.reduce((s, p) => s + p.amount, 0);
    const methods = {};
    list.forEach(p => { methods[p.method] = (methods[p.method] || 0) + p.amount; });
    const methodKeys = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Bank Transfer', 'Cash', 'Cheque'];
    return {
      title: 'Payment report',
      desc: 'Payments recorded in the selected period, by method and receiving officer.',
      summary: [
        { k: 'Total collected', v: mshort(total), s: currentRange().label },
        { k: 'Transactions', v: list.length, s: 'Receipts issued' },
        { k: 'Average payment', v: list.length ? mshort(total / list.length) : '—', s: 'Per receipt' },
        { k: 'Customers paying', v: new Set(list.map(p => p.customerId)).size, s: 'Unique customers' }
      ],
      table: '<table class="data report-table-print"><thead><tr><th>Date</th><th>Receipt</th><th>Customer</th><th>Agreement</th><th>Method</th><th>Reference</th><th class="num">Amount</th><th>Recorded by</th></tr></thead><tbody>' +
        (list.length ? list.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map(p => {
          const c = Store.customer(p.customerId);
          return '<tr><td>' + UI.date(p.date) + '</td><td class="mono">' + UI.esc(p.receiptNo) + '</td><td>' + UI.esc(c ? c.name : '—') + '</td><td class="mono">' + UI.esc(p.saleId) + '</td><td>' + UI.esc(p.method) + '</td><td class="mono">' + UI.esc(p.txnRef) + '</td><td class="num">' + money(p.amount) + '</td><td>' + UI.esc(p.recordedBy) + '</td></tr>';
        }).join('') : emptyRow(8, 'No payments recorded in this period.')) +
        '</tbody><tfoot><tr><td colspan="6">Total</td><td class="num">' + money(total) + '</td><td>' + list.length + ' receipt(s)</td></tr></tfoot></table>',
      chart: (container) => UI.barChart(container, {
        items: methodKeys.map((m, i) => ({ label: m, value: methods[m] || 0, color: ['#16A34A', '#2563EB', '#DC2626', '#6B7280', '#F59E0B', '#7C3AED'][i] })),
        format: (v) => mshort(v)
      }),
      note: '<div class="notice warn">' + Icons.get('alert') + '<div><strong>Demo figures.</strong> Payment receipts in this mockup are simulated; no real mobile money or bank settlement is reported.</div></div>'
    };
  }

  function buildOutstanding() {
    const open = Store.db.sales.filter(s => Store.saleBalance(s.id) > 0 && inProject(s.projectId));
    const total = open.reduce((s, x) => s + Store.saleBalance(x.id), 0);
    const customers = new Set(open.map(s => s.customerId)).size;
    const rows = open.slice().sort((a, b) => Store.saleBalance(b.id) - Store.saleBalance(a.id));
    const nextOf = (s) => { const plan = Store.planBySale(s.id); const st = plan ? Store.planStats(plan) : null; return st && st.next ? st.next : null; };
    return {
      title: 'Outstanding balances report',
      desc: 'Open installment accounts and remaining balances as at ' + UI.date(Store.iso(Store.today())) + '.',
      summary: [
        { k: 'Outstanding total', v: mshort(total), s: open.length + ' open account(s)' },
        { k: 'Accounts', v: open.length, s: customers + ' customers' },
        { k: 'Average balance', v: open.length ? mshort(total / open.length) : '—', s: 'Per account' },
        { k: 'Largest balance', v: open.length ? mshort(Math.max.apply(null, open.map(s => Store.saleBalance(s.id)))) : '—', s: 'Follow-up priority' }
      ],
      table: '<table class="data report-table-print"><thead><tr><th>Customer</th><th>Account</th><th>Project / plot</th><th class="num">Selling price</th><th class="num">Paid</th><th class="num">Outstanding</th><th>Next due</th><th>Last payment</th></tr></thead><tbody>' +
        (rows.length ? rows.map(s => {
          const c = Store.customer(s.customerId);
          const plot = Store.plot(s.plotId);
          const pay = Store.paymentsForSale(s.id).slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0];
          const next = nextOf(s);
          return '<tr><td>' + UI.esc(c.name) + '<div class="t-sub">' + UI.esc(c.phone) + '</div></td><td class="mono">' + UI.esc(s.id) + '</td><td>' + UI.esc(Store.project(s.projectId).name) + '<div class="t-sub">Plot ' + UI.esc(plot.plotNo) + '</div></td><td class="num">' + money(s.price) + '</td><td class="num">' + money(Store.salePaid(s.id)) + '</td><td class="num strong">' + money(Store.saleBalance(s.id)) + '</td><td>' + (next ? UI.date(next.dueDate) : '—') + '</td><td>' + (pay ? UI.date(pay.date) : '—') + '</td></tr>';
        }).join('') : emptyRow(8, 'No outstanding balances in scope.')) +
        '</tbody><tfoot><tr><td colspan="5">Total outstanding</td><td class="num">' + money(total) + '</td><td colspan="2"></td></tr></tfoot></table>',
      chart: (container) => UI.barChart(container, {
        items: rows.slice(0, 6).map(r => ({ label: Store.customer(r.customerId).name, value: Store.saleBalance(r.id), color: '#F59E0B' })),
        format: (v) => mshort(v)
      }),
      note: '<div class="notice">' + Icons.get('info') + '<div>Balances are calculated from recorded payments only. No invoices are produced in this mockup or in the customer portal.</div></div>'
    };
  }

  function buildOverdue() {
    const rows = planRows().filter(x => x.st.overdue > 0).map(x => {
      const overdueEntries = x.p.entries.filter(e => Store.entryState(e) === 'overdue' || Store.entryState(e) === 'partial' && Store.parseDate(e.dueDate) < Store.today());
      const oldest = overdueEntries.reduce((a, e) => (!a || e.dueDate < a.dueDate) ? e : a, null);
      return Object.assign({}, x, { overdueEntries, oldest, daysLate: oldest ? Store.daysBetween(Store.parseDate(oldest.dueDate), Store.today()) : 0 });
    }).sort((a, b) => b.st.overdueAmount - a.st.overdueAmount);
    const total = rows.reduce((s, x) => s + x.st.overdueAmount, 0);
    return {
      title: 'Overdue payments report',
      desc: 'Installments past their due date as at ' + UI.date(Store.iso(Store.today())) + '.',
      summary: [
        { k: 'Overdue amount', v: mshort(total), s: rows.length + ' account(s)' },
        { k: 'Overdue installments', v: rows.reduce((s, x) => s + x.st.overdue, 0), s: 'Across all accounts' },
        { k: 'Customers affected', v: new Set(rows.map(x => x.c.id)).size, s: 'Needs follow-up' },
        { k: 'Oldest overdue', v: rows.length ? Math.max.apply(null, rows.map(x => x.daysLate)) + ' days' : '—', s: 'Oldest due installment' }
      ],
      table: '<table class="data report-table-print"><thead><tr><th>Customer</th><th>Account</th><th>Project / plot</th><th class="num">Overdue inst.</th><th class="num">Overdue amount</th><th>Oldest due</th><th class="num">Days late</th></tr></thead><tbody>' +
        (rows.length ? rows.map(x => '<tr><td>' + UI.esc(x.c.name) + '<div class="t-sub">' + UI.esc(x.c.phone) + '</div></td><td class="mono">' + UI.esc(x.s.id) + '</td><td>' + UI.esc(Store.project(x.s.projectId).name) + '<div class="t-sub">Plot ' + UI.esc(Store.plot(x.s.plotId).plotNo) + '</div></td><td class="num">' + x.st.overdue + '</td><td class="num strong">' + money(x.st.overdueAmount) + '</td><td>' + (x.oldest ? UI.date(x.oldest.dueDate) : '—') + '</td><td class="num">' + x.daysLate + '</td></tr>').join('') : emptyRow(7, 'No overdue installments in scope.')) +
        '</tbody><tfoot><tr><td colspan="4">Total overdue</td><td class="num">' + money(total) + '</td><td colspan="2"></td></tr></tfoot></table>',
      chart: (container) => UI.barChart(container, {
        items: rows.slice(0, 6).map(x => ({ label: x.c.name, value: x.st.overdueAmount, color: '#DC2626' })),
        format: (v) => mshort(v)
      }),
      note: '<div class="notice warn">' + Icons.get('alert') + '<div><strong>Pending clarification.</strong> The PRD does not define an overdue-reason workflow or escalation rules. This report only identifies overdue amounts and ageing.</div></div>'
    };
  }

  function buildProjects() {
    const projects = Store.db.projects.filter(p => inProject(p.id));
    const rows = projects.map(prj => {
      const plots = Store.db.plots.filter(p => p.projectId === prj.id);
      const sold = plots.filter(p => p.status === 'Sold').length;
      const sales = Store.db.sales.filter(s => s.projectId === prj.id);
      const value = plots.reduce((s, p) => s + p.price, 0);
      const collected = Store.db.payments.filter(p => p.projectId === prj.id).reduce((s, p) => s + p.amount, 0);
      const outstanding = sales.reduce((s, x) => s + Store.saleBalance(x.id), 0);
      return { prj, plots, sold, sales, value, collected, outstanding, perf: value ? Math.round((collected / value) * 100) : 0 };
    });
    const value = rows.reduce((s, x) => s + x.value, 0);
    const collected = rows.reduce((s, x) => s + x.collected, 0);
    return {
      title: 'Project performance report',
      desc: 'Sales, collections and inventory performance by land project as at ' + UI.date(Store.iso(Store.today())) + '.',
      summary: [
        { k: 'Projects', v: rows.length, s: rows.reduce((s, x) => s + x.plots.length, 0) + ' plots' },
        { k: 'Portfolio value', v: mshort(value), s: 'Listed plot prices' },
        { k: 'Collected', v: mshort(collected), s: 'All recorded payments' },
        { k: 'Collection rate', v: value ? Math.round((collected / value) * 100) + '%' : '—', s: 'Collected vs. value' }
      ],
      table: '<table class="data report-table-print"><thead><tr><th>Project</th><th>Location</th><th class="num">Plots</th><th class="num">Sold</th><th class="num">Sales</th><th class="num">Value</th><th class="num">Collected</th><th class="num">Outstanding</th><th class="num">Collection rate</th></tr></thead><tbody>' +
        rows.map(x => '<tr><td><div class="t-main">' + UI.esc(x.prj.name) + '</div><div class="t-sub">' + UI.esc(x.prj.district) + '</div></td><td>' + UI.esc(x.prj.locationClass) + '</td><td class="num">' + x.plots.length + '</td><td class="num">' + x.sold + '</td><td class="num">' + x.sales.length + '</td><td class="num">' + money(x.value) + '</td><td class="num">' + money(x.collected) + '</td><td class="num">' + money(x.outstanding) + '</td><td class="num">' + x.perf + '%</td></tr>').join('') +
        '</tbody><tfoot><tr><td colspan="5">Total</td><td class="num">' + money(value) + '</td><td class="num">' + money(collected) + '</td><td class="num">' + money(rows.reduce((s, x) => s + x.outstanding, 0)) + '</td><td class="num">' + (value ? Math.round((collected / value) * 100) : 0) + '%</td></tr></tfoot></table>',
      chart: (container) => UI.barChart(container, {
        items: rows.map(x => ({ label: x.prj.name, value: x.collected, color: '#16A34A' })),
        format: (v) => mshort(v)
      }),
      note: '<div class="notice">' + Icons.get('info') + '<div>Collection rate compares recorded payments to total listed plot prices, including plots not yet sold. Treat it as a demo indicator, not audited performance.</div></div>'
    };
  }

  function buildStaff() {
    const isManager = App.role() === 'Manager';
    let acts = Store.db.activity.filter(a => inRange(a.date));
    if (isManager) acts = acts.filter(a => a.user !== 'Salma Mwinyi');
    acts = acts.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const byUser = {};
    acts.forEach(a => { byUser[a.user] = (byUser[a.user] || 0) + 1; });
    const modules = new Set(acts.map(a => a.module));
    return {
      title: 'Staff operational activity report',
      desc: isManager ? 'Your activity and that of staff within your operational scope.' : 'All staff activity recorded across the system in the period.',
      summary: [
        { k: 'Actions recorded', v: acts.length, s: currentRange().label },
        { k: 'Active staff', v: Object.keys(byUser).length, s: isManager ? 'Within manager scope' : 'Across all roles' },
        { k: 'Modules touched', v: modules.size, s: 'Operational areas' },
        { k: 'Most active', v: Object.keys(byUser).sort((a, b) => byUser[b] - byUser[a])[0] || '—', s: 'By action count' }
      ],
      table: '<table class="data report-table-print"><thead><tr><th>Date & time</th><th>User</th><th>Module</th><th>Activity</th></tr></thead><tbody>' +
        (acts.length ? acts.map(a => '<tr><td>' + UI.dateTime(a.date) + '</td><td>' + UI.esc(a.user) + '</td><td>' + UI.esc(a.module) + '</td><td>' + UI.esc(a.action) + '</td></tr>').join('') : emptyRow(4, 'No staff activity recorded in this period.')) +
        '</tbody></table>',
      chart: (container) => UI.barChart(container, {
        items: Object.keys(byUser).map(u => ({ label: u, value: byUser[u], color: '#2563EB' })).sort((a, b) => b.value - a.value),
        format: (v) => v + ' action(s)'
      }),
      note: isManager ? '<div class="notice warn">' + Icons.get('alert') + '<div><strong>Manager scope.</strong> This view excludes Owner activity and is limited to operational activity in this demo. Reporting lines and the exact staff scope are <strong>pending clarification</strong> in the PRD.</div></div>' :
        '<div class="notice">' + Icons.get('info') + '<div>Owner view includes activity across all roles. Activity entries are a demo audit trail.</div></div>'
    };
  }

  const BUILDERS = { land: buildLand, sales: buildSales, customers: buildCustomers, installments: buildInstallments, payments: buildPayments, outstanding: buildOutstanding, overdue: buildOverdue, projects: buildProjects, staff: buildStaff };

  function lockedPanel(c) {
    return '<div class="report-card"><div class="report-head"><div><h3>' + UI.esc(c.label) + '</h3><div class="sub">Restricted reporting scope</div></div>' +
      '<div class="right">' + UI.badge('Owner access only', 'dark') + '</div></div>' +
      '<div class="report-body">' + UI.emptyState('lock', 'Owner access required', 'In this demo, business-wide land and customer reports are reserved for the Owner, while the Manager receives operational reports.') +
        '<div class="notice warn" style="margin-top:12px">' + Icons.get('alert') + '<div><strong>Pending final access policy.</strong> The PRD confirms that the Owner has all reports and the Manager has operational reports, but the detailed report-level access for each role is still to be confirmed.</div></div>' +
      '</div></div>';
  }

  V.reports = {
    render() {
      chartRender = null;
      const c = cat(state.cat);
      const allowed = canAccessCat(c);
      const range = currentRange();
      const isOwner = App.role() === 'Owner';

      let report = null;
      if (allowed) {
        report = BUILDERS[c.id]();
        chartRender = report.chart;
      }

      const menu = '<div class="report-menu">' +
        '<div class="rm-head">Report categories</div>' +
        CATS.map(x => {
          const ok = canAccessCat(x);
          return '<button data-cat="' + x.id + '" class="' + (x.id === c.id ? 'active' : '') + '" style="' + (ok ? '' : 'opacity:.6') + '">' + Icons.get(x.icon) + UI.esc(x.label) + (ok ? '' : '<span class="lock">' + Icons.get('lock') + '</span>') + '</button>';
        }).join('') +
        '<div class="rm-note">Owner: all reports. Manager: operational reports and own/staff activity. Cashier and Accountant have no report module access.</div>' +
      '</div>';

      const reportCard = allowed && report ?
        '<div class="report-card">' +
          '<div class="report-head">' +
            '<div><h3>' + UI.esc(report.title) + '</h3><div class="sub">' + UI.esc(report.desc) + '</div></div>' +
            '<div class="right"><span class="chip">' + Icons.get('calendar') + range.label + '</span><button class="btn btn-outline btn-sm" data-act="print">' + Icons.get('print') + 'Print report</button></div>' +
          '</div>' +
          '<div class="report-body" id="reportPrintable">' +
            '<div class="print-letterhead"><div><div class="nm">' + UI.esc(Store.db.settings.companyName) + '</div><div class="sub">' + UI.esc(Store.db.settings.companyAddress) + '</div><div class="sub">' + UI.esc(Store.db.settings.companyPhone) + ' · ' + UI.esc(Store.db.settings.companyEmail) + '</div></div>' +
              '<div style="text-align:right"><div class="nm" style="font-size:12px">' + UI.esc(report.title) + '</div><div class="sub">' + range.label + ' · ' + UI.esc(projectLabel()) + '</div><div class="sub">Generated ' + UI.date(Store.iso(Store.today())) + ' by ' + UI.esc(App.user().name) + ' (' + App.role() + ')</div></div></div>' +
            '<div class="report-summary">' + report.summary.map(s => '<div class="rs"><div class="k">' + UI.esc(s.k) + '</div><div class="v">' + (typeof s.v === 'number' ? s.v.toLocaleString('en-US') : s.v) + '</div><div class="s">' + UI.esc(s.s) + '</div></div>').join('') + '</div>' +
            chartCard('<div id="reportChart"></div>') +
            '<div class="table-wrap">' + report.table + '</div>' +
            '<div style="margin-top:16px">' + report.note + '</div>' +
            '<div class="muted small" style="margin-top:14px">Report generated from simulated demo data · ' + UI.dateTime(new Date().toISOString()) + '</div>' +
          '</div>' +
        '</div>' : lockedPanel(c);

      return '<div class="page">' +
        '<div class="page-head-row"><div><h2>Reports</h2><div class="sub">Operational and business reporting with role-based access. Reports can be printed from the browser.</div></div>' +
          '<div class="page-actions"><span class="chip outline">' + Icons.get(isOwner ? 'shield-check' : 'user') + (isOwner ? 'Owner · all reports' : App.role() + ' · operational reports') + '</span></div>' +
        '</div>' +
        '<div class="card" style="margin-bottom:18px"><div class="filter-bar">' +
          '<div class="range-tabs">' +
            ['daily', 'weekly', 'monthly', 'annual'].map(p => '<button data-period="' + p + '" class="' + (state.period === p ? 'active' : '') + '">' + p.charAt(0).toUpperCase() + p.slice(1) + '</button>').join('') +
          '</div>' +
          '<select class="select" id="reportProject">' + UI.options([{ value: 'all', label: 'All projects' }].concat(Store.db.projects.map(p => ({ value: p.id, label: p.name }))), state.project) + '</select>' +
          '<input type="date" class="input" id="reportFrom" value="' + range.from + '" max="' + Store.iso(Store.today()) + '" aria-label="From date" style="width:145px" />' +
          '<span class="muted small">to</span>' +
          '<input type="date" class="input" id="reportTo" value="' + range.to + '" max="' + Store.iso(Store.today()) + '" aria-label="To date" style="width:145px" />' +
          '<button class="btn btn-outline btn-sm" data-act="apply">' + Icons.get('filter') + 'Apply</button>' +
          '<div class="spacer"></div><span class="filter-count">' + UI.esc(range.label) + '</span>' +
        '</div></div>' +
        '<div class="reports-layout">' + menu + reportCard + '</div>' +
      '</div>';
    },

    mount(el) {
      if (chartRender) {
        const box = $('#reportChart', el);
        if (box) chartRender(box);
      }
      $$('[data-period]', el).forEach(b => b.addEventListener('click', () => {
        state.period = b.getAttribute('data-period');
        state.from = null; state.to = null;
        App.refresh();
      }));
      const projectSel = $('#reportProject', el);
      if (projectSel) projectSel.addEventListener('change', () => { state.project = projectSel.value; App.refresh(); });
      const apply = $('[data-act="apply"]', el);
      if (apply) apply.addEventListener('click', () => {
        const f = $('#reportFrom', el).value;
        const t = $('#reportTo', el).value;
        if (!f || !t) { UI.toast('Select both a from and to date.', 'warn'); return; }
        if (f > t) { UI.toast('The from date must be before the to date.', 'warn'); return; }
        state.period = 'custom'; state.from = f; state.to = t;
        App.refresh();
      });
      $$('[data-cat]', el).forEach(b => b.addEventListener('click', () => { state.cat = b.getAttribute('data-cat'); App.refresh(); }));
      const print = $('[data-act="print"]', el);
      if (print) print.addEventListener('click', () => {
        const node = $('#reportPrintable', el);
        if (!node) return;
        const title = cat(state.cat).label + ' · ' + currentRange().label;
        UI.printElement(node, title);
      });
    }
  };
})(window);
