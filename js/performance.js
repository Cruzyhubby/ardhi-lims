/* Ardhi LIMS — personal performance report for the signed-in account */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;

  const PERIODS = [
    { value: 'month', label: 'This month' },
    { value: 'quarter', label: 'Last 3 months' },
    { value: 'year', label: 'This year' },
    { value: 'all', label: 'All time' }
  ];
  const state = { period: 'month' };
  const METHOD_COLORS = { 'M-Pesa': '#16A34A', 'Tigo Pesa': '#2563EB', 'Airtel Money': '#F59E0B', 'Bank Transfer': '#8B5CF6', 'Cash': '#0EA5E9', 'Cheque': '#64748B' };
  const ROLE_SCOPE = {
    Owner: {
      duties: ['Oversee all records', 'Record payments and sales', 'Manage users and settings', 'View all reports'],
      limits: ['Expenditure entry is read-only', 'Approval, correction and reversal workflows are not simulated']
    },
    Manager: {
      duties: ['Land, customer and sales records', 'Record payments and sales', 'Operational reports', 'Staff supervision'],
      limits: ['Expenditure entry is read-only', 'No user privilege changes', 'Land and customer reports are Owner-only']
    },
    Accountant: {
      duties: ['Record payments', 'Record expenditure', 'View financial report', 'Notifications & reminders'],
      limits: ['No land, customer or sales entry', 'No user management or settings changes', 'Full role permissions pending PRD confirmation']
    },
    Cashier: {
      duties: ['Record payments', 'Register customers and sales', 'View installments', 'Notifications & reminders'],
      limits: ['No expenditure access', 'No land records', 'No reports, user management or settings', 'Full role permissions pending PRD confirmation']
    }
  };
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

  function accountScope(me) {
    const s = ROLE_SCOPE[me.role] || { duties: [], limits: ['Role scope is not defined in this prototype.'] };
    return '<div class="card perf-scope-card"><div class="card-body perf-scope">' +
      '<div><div class="perf-scope-lbl">This account can</div><div class="perf-chips">' + s.duties.map(x => '<span class="chip">' + UI.esc(x) + '</span>').join('') + '</div></div>' +
      '<div><div class="perf-scope-lbl">Not available to this account</div><ul class="perf-limits">' + s.limits.map(x => '<li>' + UI.esc(x) + '</li>').join('') + '</ul></div>' +
    '</div></div>';
  }

  function range() {
    const t = Store.today();
    const y = t.getFullYear(), m = t.getMonth();
    if (state.period === 'quarter') return { from: Store.iso(new Date(y, m - 2, 1)), to: Store.iso(t), label: 'Last 3 months' };
    if (state.period === 'year') return { from: y + '-01-01', to: Store.iso(t), label: 'This year' };
    if (state.period === 'all') return { from: '0000-01-01', to: '9999-12-31', label: 'All time' };
    return { from: Store.iso(new Date(y, m, 1)), to: Store.iso(t), label: 'This month' };
  }
  const inRange = (d, r) => String(d || '').slice(0, 10) >= r.from && String(d || '').slice(0, 10) <= r.to;

  function compute() {
    const me = Store.currentUser();
    const r = range();
    const payments = Store.db.payments.filter(p => p.recordedBy === me.name && inRange(p.date, r))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const sales = Store.db.sales.filter(s => s.agent === me.name && inRange(s.saleDate, r))
      .sort((a, b) => (a.saleDate < b.saleDate ? 1 : a.saleDate > b.saleDate ? -1 : 0));
    const expenses = Store.db.expenses.filter(e => e.recordedBy === me.name && inRange(e.date, r))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const activity = Store.db.activity.filter(a => a.user === me.name && inRange(a.date, r));
    const teamPayments = Store.db.payments.filter(p => inRange(p.date, r));

    const revenue = payments.reduce((s, p) => s + p.amount, 0);
    const deposits = payments.filter(p => p.type === 'Deposit').reduce((s, p) => s + p.amount, 0);
    const installments = revenue - deposits;
    const salesValue = sales.reduce((s, x) => s + x.price, 0);
    const spend = expenses.reduce((s, e) => s + e.amount, 0);
    const teamRevenue = teamPayments.reduce((s, p) => s + p.amount, 0);
    const customersServed = new Set(payments.map(p => p.customerId)).size;
    const acceptedCards = new Set(payments.map(p => p.method)).size;

    const methods = {};
    payments.forEach(p => { methods[p.method] = (methods[p.method] || 0) + p.amount; });
    const methodRows = Object.keys(methods).sort((a, b) => methods[b] - methods[a])
      .map(m => ({ method: m, count: payments.filter(p => p.method === m).length, amount: methods[m] }));

    const now = Store.today();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = Store.addMonths(now, -i);
      const key = Store.iso(d).slice(0, 7);
      const val = Store.db.payments.filter(p => p.recordedBy === me.name && p.date.slice(0, 7) === key).reduce((s, p) => s + p.amount, 0);
      months.push({ key, label: d.toLocaleDateString('en-GB', { month: 'short' }), value: val });
    }

    return {
      me, r, payments, sales, expenses, activity, months, methodRows,
      revenue, deposits, installments, salesValue, spend, teamRevenue, customersServed, acceptedCards,
      avgReceipt: payments.length ? revenue / payments.length : 0
    };
  }

  function collectionsTable(d, limit) {
    const rows = limit ? d.payments.slice(0, limit) : d.payments;
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Receipt</th><th>Customer</th><th>Sale</th><th>Method</th><th>Type</th><th class="num">Amount</th></tr></thead><tbody>' +
      (rows.length ? rows.map(p => {
        const c = Store.customer(p.customerId);
        return '<tr><td>' + UI.date(p.date) + '</td><td class="mono">' + UI.esc(p.receiptNo) + '</td><td>' + UI.esc(c ? c.name : '—') + '</td><td class="mono">' + UI.esc(p.saleId) + '</td><td>' + UI.methodChip(p.method) + '</td><td>' + UI.badge(p.type, p.type === 'Deposit' ? 'blue' : 'green') + '</td><td class="num">' + UI.money(p.amount) + '</td></tr>';
      }).join('') : '<tr><td colspan="7">' + UI.emptyState('cash', 'No payments recorded', 'Payments you record in this period will appear here.') + '</td></tr>') +
      '</tbody></table></div>';
  }

  function salesTable(d) {
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Agreement</th><th>Customer / plot</th><th>Date</th><th class="num">Value</th><th>Status</th></tr></thead><tbody>' +
      (d.sales.length ? d.sales.map(s => {
        const c = Store.customer(s.customerId), pr = Store.project(s.projectId), pl = Store.plot(s.plotId);
        return '<tr><td class="mono">' + UI.esc(s.ref) + '</td><td><div class="t-main">' + UI.esc(c ? c.name : '—') + '</div><div class="t-sub">' + UI.esc(pr ? pr.name : '') + ' · ' + UI.esc(pl ? pl.plotNo : '') + '</div></td><td>' + UI.date(s.saleDate) + '</td><td class="num">' + UI.money(s.price) + '</td><td>' + UI.badge(s.status) + '</td></tr>';
      }).join('') : '<tr><td colspan="5">' + UI.emptyState('sales', 'No sales attributed to you', 'Agreements registered under your name in this period will appear here.') + '</td></tr>') +
      '</tbody></table></div>';
  }

  function expenseTable(d) {
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Voucher</th><th>Category / payee</th><th class="num">Amount</th></tr></thead><tbody>' +
      (d.expenses.length ? d.expenses.map(e => '<tr><td>' + UI.date(e.date) + '</td><td class="mono">' + UI.esc(e.voucherNo) + '</td><td><div class="t-main">' + UI.esc(e.category) + '</div><div class="t-sub">' + UI.esc(e.payee) + '</div></td><td class="num">' + UI.money(e.amount) + '</td></tr>').join('') : '<tr><td colspan="4">' + UI.emptyState('receipt', 'No expenditure entered', 'Expenditure you record in this period will appear here.') + '</td></tr>') +
      '</tbody></table></div>';
  }

  function activityBlock(d, limit) {
    const rows = limit ? d.activity.slice(0, limit) : d.activity;
    return rows.length ? '<div class="timeline">' + rows.map(a =>
      '<div class="timeline-item"><div class="tl-dot">' + Icons.get('check') + '</div><div class="tl-body"><div class="tl-t">' + UI.esc(a.action) + '</div><div class="tl-s">' + UI.esc(a.module) + ' · ' + UI.relTime(a.date) + '</div></div></div>').join('') + '</div>'
      : UI.emptyState('clock', 'No activity logged', 'Actions attributed to your account in this period will appear here.');
  }

  function printReport(d) {
    const s = Store.db.settings;
    const canSell = App.can('saleWrite');
    const canExpense = App.can('expenseWrite');
    const scope = ROLE_SCOPE[d.me.role] || { duties: [], limits: [] };
    const roleMetric = canSell
      ? '<div><strong>Sales registered</strong><br>' + UI.money(d.salesValue) + '</div>'
      : canExpense
        ? '<div><strong>Expenditure entered</strong><br>' + UI.money(d.spend) + '</div>'
        : '';
    const doc = document.createElement('div');
    doc.innerHTML = '<div class="print-letterhead"><div><div class="nm">' + UI.esc(s.companyName) + '</div><div class="sub">' + UI.esc(s.companyAddress) + '</div><div class="sub">' + UI.esc(s.companyPhone) + ' · ' + UI.esc(s.companyEmail) + '</div></div>' +
      '<div style="text-align:right"><div class="nm" style="font-size:12px">My performance</div><div class="sub">' + UI.esc(d.me.name) + ' · ' + UI.esc(d.me.role) + '</div><div class="sub">' + UI.esc(d.r.label) + ' · generated ' + UI.date(Store.iso(Store.today())) + '</div></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;font-size:10.5px">' +
        '<div><strong>Collected by me</strong><br>' + UI.money(d.revenue) + '</div>' +
        '<div><strong>Receipts issued</strong><br>' + d.payments.length + '</div>' +
        roleMetric +
        '<div><strong>Customers served</strong><br>' + d.customersServed + '</div>' +
        '<div><strong>Average receipt</strong><br>' + UI.money(d.avgReceipt) + '</div>' +
        '<div><strong>Deposits / installments</strong><br>' + UI.money(d.deposits) + ' / ' + UI.money(d.installments) + '</div>' +
        '<div><strong>Share of team collections</strong><br>' + pct(d.revenue, d.teamRevenue) + '%</div>' +
        '<div><strong>Activities logged</strong><br>' + d.activity.length + '</div>' +
      '</div>' +
      '<p style="font-size:10px;color:#555;margin-bottom:12px"><strong>Account scope:</strong> ' + UI.esc(scope.duties.join(', ')) + '<br><strong>Limitations:</strong> ' + UI.esc(scope.limits.join('; ')) + '.</p>' +
      '<h4 style="font-size:11px;margin:12px 0 6px">Payments recorded</h4>' + collectionsTable(d) +
      (canSell ? '<h4 style="font-size:11px;margin:14px 0 6px">Sales registered</h4>' + salesTable(d) : '') +
      (canExpense ? '<h4 style="font-size:11px;margin:14px 0 6px">Expenditure entered</h4>' + expenseTable(d) : '') +
      '<h4 style="font-size:11px;margin:14px 0 6px">Activity log</h4>' + (d.activity.map(a => '<div style="font-size:10.5px;padding:3px 0;border-bottom:1px solid #eee">' + UI.esc(UI.dateTime(a.date)) + ' · ' + UI.esc(a.module) + ' — ' + UI.esc(a.action) + '</div>').join('') || '<div style="font-size:10.5px">No activity in this period.</div>') +
      '<p style="font-size:10px;color:#777;margin-top:12px">Personal activity summary from the Ardhi prototype. Only records attributed to this account are included. No appraisal score, target, commission or ranking is calculated.</p>';
    UI.printElement(doc, 'My performance — ' + d.me.name);
  }

  V.performance = {
    render() {
      const d = compute();
      const canSell = App.can('saleWrite');
      const canExpense = App.can('expenseWrite');
      const period = PERIODS.find(p => p.value === state.period) || PERIODS[0];
      const roleStat = canSell
        ? '<div class="mini-stat"><div class="ms-icon">' + Icons.get('sales') + '</div><div><div class="k">Sales registered</div><div class="v">' + UI.moneyShort(d.salesValue) + '</div><div class="small muted">' + d.sales.length + ' agreement(s) under your name</div></div></div>'
        : canExpense
          ? '<div class="mini-stat"><div class="ms-icon amber">' + Icons.get('target') + '</div><div><div class="k">Expenditure entered</div><div class="v">' + UI.moneyShort(d.spend) + '</div><div class="small muted">' + d.expenses.length + ' voucher(s) under your account</div></div></div>'
          : '';
      const stats =
        '<div class="mini-stat"><div class="ms-icon green">' + Icons.get('cash') + '</div><div><div class="k">Collected by me</div><div class="v">' + UI.moneyShort(d.revenue) + '</div><div class="small muted">' + d.payments.length + ' receipt(s) issued</div></div></div>' +
        '<div class="mini-stat"><div class="ms-icon blue">' + Icons.get('receipt') + '</div><div><div class="k">Receipts issued</div><div class="v">' + d.payments.length + '</div><div class="small muted">Across ' + d.acceptedCards + ' payment method(s)</div></div></div>' +
        roleStat +
        '<div class="mini-stat"><div class="ms-icon blue">' + Icons.get('customers') + '</div><div><div class="k">Customers served</div><div class="v">' + d.customersServed + '</div><div class="small muted">Customers in your receipts</div></div></div>' +
        '<div class="mini-stat"><div class="ms-icon green">' + Icons.get('installments') + '</div><div><div class="k">Average receipt</div><div class="v">' + (d.payments.length ? UI.moneyShort(d.avgReceipt) : '—') + '</div><div class="small muted">Per receipt you recorded</div></div></div>' +
        '<div class="mini-stat"><div class="ms-icon">' + Icons.get('layers') + '</div><div><div class="k">Deposits vs installments</div><div class="v">' + UI.moneyShort(d.deposits) + '</div><div class="small muted">Installments ' + UI.moneyShort(d.installments) + '</div></div></div>' +
        '<div class="mini-stat"><div class="ms-icon">' + Icons.get('reports') + '</div><div><div class="k">Team collections share</div><div class="v">' + pct(d.revenue, d.teamRevenue) + '%</div><div class="small muted">Your share of ' + UI.moneyShort(d.teamRevenue) + '</div></div></div>' +
        '<div class="mini-stat"><div class="ms-icon amber">' + Icons.get('clock') + '</div><div><div class="k">Activities logged</div><div class="v">' + d.activity.length + '</div><div class="small muted">Actions attributed to you</div></div></div>';
      const salesCard = '<div class="card"><div class="card-head"><div><h3>Sales I registered</h3><div class="sub">Agreements attributed to your name</div></div></div>' + salesTable(d) + '</div>';
      const expenseCard = '<div class="card"><div class="card-head"><div><h3>Expenditure I entered</h3><div class="sub">Vouchers recorded under your account</div></div></div>' + expenseTable(d) + '</div>';
      const roleTables = (canSell && canExpense)
        ? '<div class="split-2" style="margin-top:16px">' + salesCard + expenseCard + '</div>'
        : canSell
          ? '<div class="card" style="margin-top:16px">' + salesCard + '</div>'
          : canExpense
            ? '<div class="card" style="margin-top:16px">' + expenseCard + '</div>'
            : '';
      return '<div class="page">' +
        '<div class="page-head-row"><div><h2>My performance</h2><div class="sub">Personal report for ' + UI.esc(d.me.name) + ' · ' + UI.esc(d.me.role) + '. Only records attributed to this account are included, and only the sections allowed for this role are shown.</div></div>' +
          '<div class="page-actions"><button class="btn btn-primary" data-act="print">' + Icons.get('print') + 'Print my report</button></div></div>' +
        '<div class="card" style="margin-bottom:16px"><div class="card-body" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
          UI.avatar(d.me.name) +
          '<div style="flex:1;min-width:180px"><div style="font-weight:650;font-size:15px">' + UI.esc(d.me.name) + '</div><div class="muted small">' + UI.esc(d.me.role) + ' · ' + UI.esc(d.me.email) + '</div></div>' +
          '<span class="chip">Personal account report</span>' +
          '<select class="select" id="perfPeriod">' + UI.options(PERIODS, state.period) + '</select>' +
          '<span class="chip">' + UI.esc(period.label) + '</span>' +
        '</div></div>' +
        accountScope(d.me) +
        '<div class="mini-stats" style="margin-top:16px">' + stats + '</div>' +
        '<div class="split-2" style="margin-top:16px">' +
          '<div class="card"><div class="card-head"><div><h3>My collections</h3><div class="sub">Last six months · recorded by you</div></div></div><div class="card-body" id="perfTrend"></div></div>' +
          '<div class="card"><div class="card-head"><div><h3>My payment methods</h3><div class="sub">' + UI.esc(period.label) + '</div></div></div><div class="card-body" id="perfMethods"></div></div>' +
        '</div>' +
        '<div class="card" style="margin-top:16px"><div class="card-head"><div><h3>Payments I recorded</h3><div class="sub">Latest 10 receipts in the selected period</div></div><div class="right"><span class="chip">' + d.payments.length + ' total</span></div></div>' + collectionsTable(d, 10) + '</div>' +
        roleTables +
        '<div class="card" style="margin-top:16px"><div class="card-head"><div><h3>My activity log</h3><div class="sub">Latest actions attributed to your account</div></div><div class="right"><span class="chip">' + d.activity.length + ' in period</span></div></div><div class="card-body">' + activityBlock(d, 12) + '</div></div>' +
        '<div class="notice info" style="margin-top:16px">' + Icons.get('info') + '<div><strong>Personal report.</strong> Figures come only from payment, sale, expenditure and activity records attributed to <strong>' + UI.esc(d.me.name) + '</strong>, and sections outside this account\'s role are hidden. No appraisal score, commission, target or ranking is applied.</div></div>' +
      '</div>';
    },

    mount(el) {
      const d = compute();
      UI.lineChart($('#perfTrend', el), {
        labels: d.months.map(m => m.label), data: d.months.map(m => m.value), height: 220,
        format: UI.moneyShort
      });
      if (!d.methodRows.length) {
        $('#perfMethods', el).innerHTML = UI.emptyState('cash', 'No payments in this period', 'Record a payment or choose a wider period.');
      } else {
        UI.donutChart($('#perfMethods', el), {
          centerValue: UI.moneyShort(d.revenue), centerLabel: 'collected', format: UI.moneyShort,
          segments: d.methodRows.map(m => ({ label: m.method, value: m.amount, color: METHOD_COLORS[m.method] || '#64748B' }))
        });
      }
      const sel = $('#perfPeriod', el);
      if (sel) sel.addEventListener('change', () => { state.period = sel.value; App.refresh(); });
      const pr = $('[data-act="print"]', el);
      if (pr) pr.addEventListener('click', () => printReport(d));
    }
  };
})(window);
