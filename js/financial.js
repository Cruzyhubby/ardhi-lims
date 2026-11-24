/* Ardhi LIMS — consolidated financial report (revenue, expenditure, receivables) */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;

  const PERIODS = [
    { value: 'month', label: 'This month' },
    { value: 'last', label: 'Last month' },
    { value: 'quarter', label: 'Last 3 months' },
    { value: 'year', label: 'This year' },
    { value: 'all', label: 'All time' }
  ];
  const state = { period: 'quarter', project: 'all' };
  const METHOD_COLORS = { 'M-Pesa': '#16A34A', 'Tigo Pesa': '#2563EB', 'Airtel Money': '#F59E0B', 'Bank Transfer': '#8B5CF6', 'Cash': '#0EA5E9', 'Cheque': '#64748B' };

  function range(key) {
    const t = Store.today();
    const y = t.getFullYear(), m = t.getMonth();
    if (key === 'last') return { from: Store.iso(new Date(y, m - 1, 1)), to: Store.iso(new Date(y, m, 0)), label: 'Last month' };
    if (key === 'year') return { from: y + '-01-01', to: Store.iso(t), label: 'This year' };
    if (key === 'all') return { from: '0000-01-01', to: '9999-12-31', label: 'All time' };
    if (key === 'month') return { from: Store.iso(new Date(y, m, 1)), to: Store.iso(t), label: 'This month' };
    return { from: Store.iso(new Date(y, m - 2, 1)), to: Store.iso(t), label: 'Last 3 months' };
  }
  const inRange = (d, r) => d >= r.from && d <= r.to;
  const inProject = (id) => state.project === 'all' || id === state.project;
  const projectName = (id) => { const p = id ? Store.project(id) : null; return p ? p.name : 'Company-wide'; };
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

  function compute() {
    const r = range(state.period);
    const payments = Store.db.payments.filter(p => inRange(p.date, r) && inProject(p.projectId));
    const expenses = Store.db.expenses.filter(e => inRange(e.date, r) && inProject(e.projectId));
    const sales = Store.db.sales.filter(s => inRange(s.saleDate, r) && inProject(s.projectId));
    const allSales = Store.db.sales.filter(s => inProject(s.projectId));
    const revenue = payments.reduce((s, p) => s + p.amount, 0);
    const spend = expenses.reduce((s, e) => s + e.amount, 0);
    const contracted = sales.reduce((s, x) => s + x.price, 0);
    const outstanding = allSales.reduce((s, x) => s + Store.saleBalance(x.id), 0);
    const overdue = Store.db.plans.filter(pl => {
      const s = Store.sale(pl.saleId);
      return s && inProject(s.projectId);
    }).reduce((s, pl) => s + Store.planStats(pl).overdueAmount, 0);

    const methods = {};
    payments.forEach(p => { methods[p.method] = (methods[p.method] || 0) + p.amount; });
    const methodRows = Object.keys(methods).sort((a, b) => methods[b] - methods[a]).map(m => ({
      method: m, count: payments.filter(p => p.method === m).length, amount: methods[m], share: pct(methods[m], revenue)
    }));

    const categories = {};
    expenses.forEach(e => { categories[e.category] = (categories[e.category] || 0) + e.amount; });
    const categoryRows = Object.keys(categories).sort((a, b) => categories[b] - categories[a]).map(c => ({
      category: c, count: expenses.filter(e => e.category === c).length, amount: categories[c], share: pct(categories[c], spend)
    }));

    const now = Store.today();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = Store.addMonths(now, -i);
      const key = Store.iso(d).slice(0, 7);
      const rev = Store.db.payments.filter(p => p.date.slice(0, 7) === key && inProject(p.projectId)).reduce((s, p) => s + p.amount, 0);
      const exp = Store.db.expenses.filter(e => e.date.slice(0, 7) === key && inProject(e.projectId)).reduce((s, e) => s + e.amount, 0);
      months.push({ key, label: d.toLocaleDateString('en-GB', { month: 'short' }), rev, exp, net: rev - exp });
    }

    let ledger = payments.map(p => {
      const c = Store.customer(p.customerId);
      return { date: p.date, type: 'Revenue', ref: p.receiptNo, desc: (c ? c.name : 'Customer') + ' · ' + p.saleId, method: p.method, inflow: p.amount, outflow: 0 };
    }).concat(expenses.map(e => ({
      date: e.date, type: 'Expenditure', ref: e.voucherNo, desc: e.description + ' · ' + e.payee, method: e.method, inflow: 0, outflow: e.amount
    }))).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.ref < b.ref ? 1 : -1)));

    const projectRows = Store.db.projects.filter(p => inProject(p.id)).map(pr => {
      const prPay = Store.db.payments.filter(p => p.projectId === pr.id && inRange(p.date, r)).reduce((s, p) => s + p.amount, 0);
      const prExp = Store.db.expenses.filter(e => e.projectId === pr.id && inRange(e.date, r)).reduce((s, e) => s + e.amount, 0);
      const prSales = Store.db.sales.filter(s => s.projectId === pr.id);
      return {
        project: pr, contracted: Store.db.sales.filter(s => s.projectId === pr.id && inRange(s.saleDate, r)).reduce((s, x) => s + x.price, 0),
        collected: prPay, expenses: prExp, net: prPay - prExp,
        outstanding: prSales.reduce((s, x) => s + Store.saleBalance(x.id), 0)
      };
    });
    if (state.project === 'all') {
      const unallocated = expenses.filter(e => !e.projectId).reduce((s, e) => s + e.amount, 0);
      if (unallocated) projectRows.push({ project: null, contracted: 0, collected: 0, expenses: unallocated, net: -unallocated, outstanding: 0 });
    }

    return { r, payments, expenses, sales, revenue, spend, contracted, outstanding, overdue, methodRows, categoryRows, months, ledger, projectRows, net: revenue - spend };
  }

  function trendChart(container, months) {
    const max = Math.max.apply(null, months.map(m => Math.max(m.rev, m.exp)).concat([1]));
    container.innerHTML = '<div class="fin-bars">' + months.map(m =>
      '<div class="fin-col"><div class="fin-pair">' +
        '<div class="fin-bar rev" style="height:' + Math.max(2, Math.round((m.rev / max) * 100)) + '%" title="Revenue ' + UI.esc(UI.money(m.rev)) + '"></div>' +
        '<div class="fin-bar exp" style="height:' + Math.max(2, Math.round((m.exp / max) * 100)) + '%" title="Expenditure ' + UI.esc(UI.money(m.exp)) + '"></div>' +
      '</div><div class="fin-lab">' + UI.esc(m.label) + '</div></div>').join('') + '</div>' +
      '<div class="fin-legend"><span><i class="rev"></i>Revenue</span><span><i class="exp"></i>Expenditure</span></div>';
  }

  function methodTable(d) {
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Payment method</th><th class="num">Transactions</th><th class="num">Collected</th><th class="num">Share</th></tr></thead><tbody>' +
      (d.methodRows.length ? d.methodRows.map(m => '<tr><td>' + UI.esc(m.method) + '</td><td class="num">' + m.count + '</td><td class="num">' + UI.money(m.amount) + '</td><td class="num">' + m.share + '%</td></tr>').join('') : '<tr><td colspan="4">' + UI.emptyState('cash', 'No revenue in this period', 'Recorded payments will appear here.') + '</td></tr>') +
      '</tbody><tfoot><tr><td>Total revenue</td><td class="num">' + d.payments.length + '</td><td class="num">' + UI.money(d.revenue) + '</td><td class="num">100%</td></tr></tfoot></table></div>';
  }

  function projectTable(d) {
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Project</th><th class="num">Agreements</th><th class="num">Revenue</th><th class="num">Expenditure</th><th class="num">Net</th><th class="num">Outstanding now</th></tr></thead><tbody>' +
      d.projectRows.map(x => '<tr><td><div class="t-main">' + UI.esc(x.project ? x.project.name : 'Company-wide (unallocated)') + '</div><div class="t-sub">' + UI.esc(x.project ? x.project.district + ', ' + x.project.region : 'Head office expenditure') + '</div></td><td class="num">' + UI.money(x.contracted) + '</td><td class="num">' + UI.money(x.collected) + '</td><td class="num">' + UI.money(x.expenses) + '</td><td class="num" style="color:' + (x.net < 0 ? 'var(--red)' : 'var(--green-700)') + '">' + UI.money(x.net) + '</td><td class="num">' + UI.money(x.outstanding) + '</td></tr>').join('') +
      '</tbody></table></div>';
  }

  function monthlyTable(d) {
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Month</th><th class="num">Revenue</th><th class="num">Expenditure</th><th class="num">Net</th></tr></thead><tbody>' +
      d.months.map(m => '<tr><td>' + UI.esc(m.label) + '</td><td class="num">' + UI.money(m.rev) + '</td><td class="num">' + UI.money(m.exp) + '</td><td class="num" style="color:' + (m.net < 0 ? 'var(--red)' : 'var(--green-700)') + '">' + UI.money(m.net) + '</td></tr>').join('') +
      '</tbody></table></div>';
  }

  function ledgerTable(d, limit) {
    const rows = limit ? d.ledger.slice(0, limit) : d.ledger;
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Description</th><th>Method</th><th class="num">Money in</th><th class="num">Money out</th></tr></thead><tbody>' +
      (rows.length ? rows.map(x => '<tr><td>' + UI.date(x.date) + '</td><td>' + UI.badge(x.type, x.type === 'Revenue' ? 'green' : 'red') + '</td><td class="mono">' + UI.esc(x.ref) + '</td><td>' + UI.esc(x.desc) + '</td><td>' + UI.esc(x.method) + '</td><td class="num">' + (x.inflow ? UI.money(x.inflow) : '—') + '</td><td class="num">' + (x.outflow ? UI.money(x.outflow) : '—') + '</td></tr>').join('') : '<tr><td colspan="7">' + UI.emptyState('cash', 'No money movements', 'Payments and expenditure in this period will appear here.') + '</td></tr>') +
      '</tbody></table></div>';
  }

  function printReport(d) {
    const settings = Store.db.settings;
    const proj = state.project === 'all' ? 'All projects' : Store.project(state.project).name;
    const doc = document.createElement('div');
    doc.innerHTML = '<div class="print-letterhead"><div><div class="nm">' + UI.esc(settings.companyName) + '</div><div class="sub">' + UI.esc(settings.companyAddress) + '</div><div class="sub">' + UI.esc(settings.companyPhone) + ' · ' + UI.esc(settings.companyEmail) + '</div></div>' +
      '<div style="text-align:right"><div class="nm" style="font-size:12px">Consolidated financial report</div><div class="sub">' + UI.esc(d.r.label) + ' · ' + UI.esc(proj) + '</div><div class="sub">Generated ' + UI.date(Store.iso(Store.today())) + '</div></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;font-size:10.5px">' +
        '<div><strong>Revenue collected</strong><br>' + UI.money(d.revenue) + '</div>' +
        '<div><strong>Expenditure</strong><br>' + UI.money(d.spend) + '</div>' +
        '<div><strong>Net position</strong><br>' + UI.money(d.net) + '</div>' +
        '<div><strong>Outstanding receivables</strong><br>' + UI.money(d.outstanding) + '</div>' +
        '<div><strong>Agreements in period</strong><br>' + UI.money(d.contracted) + '</div>' +
        '<div><strong>Overdue installments</strong><br>' + UI.money(d.overdue) + '</div>' +
        '<div><strong>Revenue entries</strong><br>' + d.payments.length + '</div>' +
        '<div><strong>Expenditure entries</strong><br>' + d.expenses.length + '</div>' +
      '</div>' +
      '<h4 style="font-size:11px;margin:12px 0 6px">Revenue by payment method</h4>' + methodTable(d) +
      '<h4 style="font-size:11px;margin:14px 0 6px">Project financial summary</h4>' + projectTable(d) +
      '<h4 style="font-size:11px;margin:14px 0 6px">Last six months</h4>' + monthlyTable(d) +
      '<h4 style="font-size:11px;margin:14px 0 6px">Combined cashbook</h4>' + ledgerTable(d) +
      '<p style="font-size:10px;color:#777;margin-top:12px">Simulated financial report from the Ardhi prototype. Revenue is recorded payments only; this is not a real financial statement.</p>';
    UI.printElement(doc, 'Financial report — ' + d.r.label);
  }

  V.financials = {
    render() {
      const d = compute();
      const period = PERIODS.find(p => p.value === state.period);
      return '<div class="page">' +
        '<div class="page-head-row"><div><h2>Financial report</h2><div class="sub">Revenue, expenditure, receivables and net position in one report. Revenue reflects recorded payments; no invoices are generated.</div></div>' +
          '<div class="page-actions"><button class="btn btn-primary" data-act="print">' + Icons.get('print') + 'Print report</button></div></div>' +
        '<div class="card" style="margin-bottom:16px"><div class="filter-bar" style="margin:0">' +
          '<select class="select" id="finPeriod">' + UI.options(PERIODS, state.period) + '</select>' +
          '<select class="select" id="finProject"><option value="all">All projects</option>' + Store.db.projects.map(p => '<option value="' + p.id + '"' + (state.project === p.id ? ' selected' : '') + '>' + UI.esc(p.name) + '</option>').join('') + '</select>' +
          '<div class="spacer"></div><span class="filter-count">' + UI.esc(period.label) + ' · ' + UI.esc(state.project === 'all' ? 'All projects' : Store.project(state.project).name) + '</span>' +
        '</div></div>' +
        '<div class="mini-stats">' +
          '<div class="mini-stat"><div class="ms-icon green">' + Icons.get('cash') + '</div><div><div class="k">Revenue collected</div><div class="v">' + UI.moneyShort(d.revenue) + '</div><div class="small muted">' + d.payments.length + ' payment(s) in period</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon amber">' + Icons.get('receipt') + '</div><div><div class="k">Expenditure</div><div class="v">' + UI.moneyShort(d.spend) + '</div><div class="small muted">' + d.expenses.length + ' entr' + (d.expenses.length === 1 ? 'y' : 'ies') + ' in period</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon ' + (d.net < 0 ? '' : 'blue') + '">' + Icons.get('reports') + '</div><div><div class="k">Net position</div><div class="v" style="color:' + (d.net < 0 ? 'var(--red)' : 'inherit') + '">' + UI.moneyShort(d.net) + '</div><div class="small muted">' + (d.revenue ? pct(d.net, d.revenue) + '% of revenue' : 'No revenue in period') + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon">' + Icons.get('clock') + '</div><div><div class="k">Outstanding receivables</div><div class="v">' + UI.moneyShort(d.outstanding) + '</div><div class="small muted">' + UI.moneyShort(d.overdue) + ' overdue now</div></div></div>' +
        '</div>' +
        '<div class="mini-stats" style="margin-top:12px">' +
          '<div class="mini-stat"><div class="ms-icon blue">' + Icons.get('sales') + '</div><div><div class="k">Agreements in period</div><div class="v">' + UI.moneyShort(d.contracted) + '</div><div class="small muted">' + d.sales.length + ' sale(s) recorded</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon green">' + Icons.get('target') + '</div><div><div class="k">Expense ratio</div><div class="v">' + (d.revenue ? pct(d.spend, d.revenue) + '%' : '—') + '</div><div class="small muted">Expenditure vs revenue</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon">' + Icons.get('check-circle') + '</div><div><div class="k">Collected this period</div><div class="v">' + UI.moneyShort(d.revenue) + '</div><div class="small muted">Across ' + d.methodRows.length + ' payment method(s)</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon amber">' + Icons.get('layers') + '</div><div><div class="k">Money movements</div><div class="v">' + d.ledger.length + '</div><div class="small muted">Revenue and expenditure entries</div></div></div>' +
        '</div>' +
        '<div class="split-2" style="margin-top:16px">' +
          '<div class="card"><div class="card-head"><div><h3>Revenue vs expenditure</h3><div class="sub">Last six months · project filter applied</div></div></div><div class="card-body" id="finTrend"></div></div>' +
          '<div class="card"><div class="card-head"><div><h3>Revenue by payment method</h3><div class="sub">' + UI.esc(period.label) + '</div></div></div><div class="card-body" id="finMethods"></div></div>' +
        '</div>' +
        '<div class="card" style="margin-top:16px"><div class="card-head"><div><h3>Project financial summary</h3><div class="sub">Agreements, revenue, expenditure and receivables by project</div></div></div>' + projectTable(d) + '</div>' +
        '<div class="split-2" style="margin-top:16px">' +
          '<div class="card"><div class="card-head"><div><h3>Monthly summary</h3><div class="sub">Last six months</div></div></div>' + monthlyTable(d) + '</div>' +
          '<div class="card"><div class="card-head"><div><h3>Expenditure by category</h3><div class="sub">' + UI.esc(period.label) + '</div></div></div><div class="card-body" id="finExpCats"></div></div>' +
        '</div>' +
        '<div class="card" style="margin-top:16px"><div class="card-head"><div><h3>Combined cashbook</h3><div class="sub">Every recorded money movement in the selected period (latest 50 shown)</div></div><div class="right"><span class="chip">' + d.ledger.length + ' entries</span></div></div>' + ledgerTable(d, 50) +
          '<div class="table-foot"><span>Net movement: ' + UI.money(d.net) + '</span><span class="muted small">Simulated records · not a real financial statement.</span></div></div>' +
        '<div class="notice info" style="margin-top:16px">' + Icons.get('info') + '<div><strong>Source of figures.</strong> Revenue = payments recorded in the selected period. Agreements = sale prices for sales dated in the period. Outstanding and overdue are current snapshots. Expenditure is entered by the Accountant only.</div></div>' +
      '</div>';
    },

    mount(el) {
      const d = compute();
      trendChart($('#finTrend', el), d.months);
      UI.donutChart($('#finMethods', el), {
        centerValue: UI.moneyShort(d.revenue), centerLabel: 'collected', format: UI.moneyShort,
        segments: d.methodRows.map(m => ({ label: m.method, value: m.amount, color: METHOD_COLORS[m.method] || '#64748B' }))
      });
      if (!d.methodRows.length) $('#finMethods', el).innerHTML = '<div class="muted small">No revenue in this period.</div>';
      UI.barChart($('#finExpCats', el), {
        items: d.categoryRows.slice(0, 6).map((c, i) => ({ label: c.category, value: c.amount, color: ['#16A34A', '#2563EB', '#F59E0B', '#8B5CF6', '#0EA5E9', '#64748B'][i] })),
        format: UI.moneyShort
      });
      if (!d.categoryRows.length) $('#finExpCats', el).innerHTML = '<div class="muted small">No expenditure in this period.</div>';
      const per = $('#finPeriod', el);
      if (per) per.addEventListener('change', () => { state.period = per.value; App.refresh(); });
      const prj = $('#finProject', el);
      if (prj) prj.addEventListener('change', () => { state.project = prj.value; App.refresh(); });
      const pr = $('[data-act="print"]', el);
      if (pr) pr.addEventListener('click', () => printReport(d));
    }
  };
})(window);
