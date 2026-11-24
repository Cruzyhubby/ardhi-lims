/* Ardhi LIMS — Dashboard view */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;

  V.dashboard = {
    render() {
      const u = App.user();
      const m = Store.dashboardMetrics();
      const perf = Store.projectPerformance();
      const series = Store.collectionsSeries(8);
      const settings = Store.db.settings;
      const todayISO = Store.iso(Store.today());

      const payments = Store.db.payments.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
      const sales = Store.db.sales.slice().sort((a, b) => (a.saleDate < b.saleDate ? 1 : -1)).slice(0, 5);

      const upcoming = [];
      Store.db.plans.forEach(p => {
        const s = Store.sale(p.saleId);
        if (!s) return;
        p.entries.forEach(e => {
          if (e.paid < e.amount && new Date(e.dueDate) >= Store.today()) {
            upcoming.push({ plan: p, sale: s, entry: e, customer: Store.customer(s.customerId) });
          }
        });
      });
      upcoming.sort((a, b) => (a.entry.dueDate < b.entry.dueDate ? -1 : 1));

      const overdue = Store.db.plans.map(p => ({ plan: p, stats: Store.planStats(p) }))
        .filter(x => x.stats.overdue > 0)
        .sort((a, b) => b.stats.overdueAmount - a.stats.overdueAmount)
        .slice(0, 4);

      const lastMonth = series.data[series.data.length - 1] || 0;
      const prevMonth = series.data[series.data.length - 2] || 0;
      const delta = prevMonth ? Math.round((lastMonth - prevMonth) / prevMonth * 100) : 0;

      const kpis = [
        { label: 'Total plots', icon: 'plots', value: m.totalPlots, sub: Store.db.projects.length + ' active land projects', small: false },
        { label: 'Sold plots', icon: 'check-circle', value: m.sold, sub: Math.round(m.sold / Math.max(1, m.totalPlots) * 100) + '% of portfolio sold', tone: '' },
        { label: 'Available plots', icon: 'land', value: m.available, sub: m.reserved + ' reserved · ' + m.installment + ' on installment', tone: 'grey' },
        { label: 'Total collected', icon: 'payments', value: UI.moneyShort(m.collected), sub: UI.moneyShort(lastMonth) + ' this month', tone: 'accent', small: true },
        { label: 'Customers with balance', icon: 'customers', value: m.withBalance, sub: UI.moneyShort(m.outstanding) + ' outstanding', tone: 'amber', small: false },
        { label: 'Upcoming · 14 days', icon: 'clock', value: m.upcomingCount, sub: UI.moneyShort(m.upcomingAmount) + ' expected', tone: 'blue' }
      ];

      return '<div class="page">' +
        '<div class="welcome">' +
          '<div><h2>' + UI.greeting() + ', ' + UI.esc(u.name.split(' ')[0]) + '.</h2>' +
          '<div class="sub">' + UI.esc(UI.date(todayISO, 'long')) + ' · Here is what is happening across ' + UI.esc(settings.companyName) + '.</div></div>' +
          '<div class="welcome-actions">' +
            '<button class="btn btn-outline" data-act="new-sale">' + Icons.get('plus') + 'Record sale</button>' +
            '<button class="btn btn-primary" data-act="record-payment">' + Icons.get('payments') + 'Record payment</button>' +
          '</div>' +
        '</div>' +

        (m.overdueAmount > 0 ?
        '<div class="overdue-banner">' + Icons.get('alert') +
          '<div class="txt"><strong>' + m.overdueCount + ' overdue installment' + (m.overdueCount === 1 ? '' : 's') + '</strong> totalling <strong>' + UI.money(m.overdueAmount) + '</strong>. Follow-up is needed.</div>' +
          '<button class="btn btn-sm btn-outline" data-go="/installments">Review overdue</button>' +
        '</div>' : '') +

        '<div class="stat-grid">' + kpis.map(k =>
          '<div class="stat-card' + (k.tone === 'accent' ? ' accent' : '') + '">' +
            '<div class="sc-top"><span class="sc-label">' + k.label + '</span><span class="sc-icon ' + (k.tone && k.tone !== 'accent' ? k.tone : '') + '">' + Icons.get(k.icon) + '</span></div>' +
            '<div class="sc-value' + (k.small ? ' small' : '') + '">' + k.value + '</div>' +
            '<div class="sc-sub">' + k.sub + '</div>' +
          '</div>').join('') +
        '</div>' +

        '<div class="grid grid-2-1" style="margin-top:18px">' +
          '<div class="card chart-card">' +
            '<div class="chart-head"><div><h3>Collections trend</h3><div class="sub">Payments received · last 8 months</div></div>' +
              '<div class="right">' + UI.badge('TZS', 'grey', { noDot: true }) + '</div></div>' +
            '<div class="chart-total">' + UI.money(lastMonth) + '<span class="delta">' + (delta >= 0 ? '+' : '') + delta + '% vs last month</span></div>' +
            '<div class="chart" id="collectionsChart"></div>' +
          '</div>' +
          '<div class="card chart-card">' +
            '<div class="chart-head"><div><h3>Portfolio status</h3><div class="sub">All plots by current status</div></div></div>' +
            '<div style="margin-top:10px" id="statusChart"></div>' +
            '<div class="divider"></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:12px"><span class="muted">Portfolio value</span><strong>' + UI.moneyShort(Store.db.plots.reduce((s, p) => s + p.price, 0)) + '</strong></div>' +
          '</div>' +
        '</div>' +

        '<div class="grid grid-2-1" style="margin-top:18px">' +
          '<div class="card">' +
            '<div class="card-head"><div><h3>Project performance</h3><div class="sub">Sales and availability by land project</div></div><div class="right"><button class="btn btn-sm btn-ghost" data-go="/land">View all' + Icons.get('chevron-right') + '</button></div></div>' +
            '<div class="card-body">' +
              '<div class="stack-legend" style="margin-bottom:12px">' +
                '<span class="lg"><i class="sold"></i>Sold</span>' +
                '<span class="lg"><i class="inst"></i>Installment</span>' +
                '<span class="lg"><i class="free"></i>Available</span>' +
                '<span class="lg"><i class="res"></i>Reserved</span>' +
              '</div>' +
              (() => {
                const maxTotal = Math.max.apply(null, perf.map(x => x.total).concat([1]));
                const top = Math.ceil(maxTotal / 4) * 4;
                const ticks = [top, Math.round(top * 0.75), Math.round(top * 0.5), Math.round(top * 0.25), 0];
                const colHeight = v => (v / top * 100).toFixed(2) + '%';
                return '<div class="col-chart" role="img" aria-label="Plots by status for each project">' +
                  '<div class="cc-axis">' + ticks.map(t => '<span>' + t + '</span>').join('') + '</div>' +
                  '<div class="cc-plot">' +
                    '<div class="cc-grid">' + ticks.map(() => '<span></span>').join('') + '</div>' +
                    '<div class="cc-bars">' + perf.map(x =>
                      '<div class="cc-col" title="' + UI.esc(x.project.name + ': ' + x.sold + ' sold, ' + x.inst + ' on installment, ' + x.available + ' available, ' + x.reserved + ' reserved') + '">' +
                        '<div class="cc-stack" style="height:' + colHeight(x.total) + '">' +
                          '<span class="seg sold" style="height:' + (x.sold / Math.max(1, x.total) * 100).toFixed(2) + '%"></span>' +
                          '<span class="seg inst" style="height:' + (x.inst / Math.max(1, x.total) * 100).toFixed(2) + '%"></span>' +
                          '<span class="seg free" style="height:' + (x.available / Math.max(1, x.total) * 100).toFixed(2) + '%"></span>' +
                          '<span class="seg res" style="height:' + (x.reserved / Math.max(1, x.total) * 100).toFixed(2) + '%"></span>' +
                        '</div>' +
                      '</div>').join('') +
                    '</div>' +
                  '</div>' +
                  '<div class="cc-labels">' + perf.map(x =>
                    '<div class="cc-lab"><span class="code">' + UI.esc(x.project.code) + '</span><span class="cc-pct">' + x.pct + '%</span></div>').join('') +
                  '</div>' +
                '</div>';
              })() +
            '</div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-head"><div><h3>Overdue overview</h3><div class="sub">' + m.overdueCount + ' installments · ' + UI.moneyShort(m.overdueAmount) + '</div></div><div class="right">' + UI.badge('Needs follow-up', 'red') + '</div></div>' +
            '<div class="mini-list">' +
              (overdue.length ? overdue.map(o => {
                const s = Store.sale(o.plan.saleId);
                const c = s ? Store.customer(s.customerId) : null;
                return '<div class="mini-item" data-installment="' + o.plan.id + '" data-sale="' + o.plan.saleId + '">' +
                  '<span class="dot red"></span>' +
                  '<div class="mi-main"><div class="mi-title">' + UI.esc(c ? c.name : '—') + '</div><div class="mi-sub">' + o.stats.overdue + ' overdue · ' + UI.esc(s ? s.id : '') + '</div></div>' +
                  '<div class="mi-right"><div class="mi-amount tone-red">' + UI.moneyShort(o.stats.overdueAmount) + '</div><div class="mi-date">oldest past due</div></div>' +
                '</div>';
              }).join('') : '<div class="empty-state" style="padding:30px"><div class="icon-wrap">' + Icons.get('check-circle') + '</div><h4>No overdue payments</h4><p>Every active installment is on schedule.</p></div>') +
            '</div>' +
            '<div class="card-body" style="border-top:1px solid var(--line-soft);padding:12px 18px"><button class="link-btn" data-go="/installments">Open installment register ' + Icons.get('arrow-right') + '</button></div>' +
          '</div>' +
        '</div>' +

        '<div class="grid grid-2-1" style="margin-top:18px">' +
          '<div class="card">' +
            '<div class="card-head"><div><h3>Recent payments</h3><div class="sub">Latest transactions recorded</div></div><div class="right"><button class="btn btn-sm btn-ghost" data-go="/payments">All payments' + Icons.get('chevron-right') + '</button></div></div>' +
            '<div class="table-wrap"><table class="data"><thead><tr><th>Receipt</th><th>Customer</th><th>Method</th><th class="num">Amount</th><th>Date</th></tr></thead><tbody>' +
              payments.map(p => {
                const c = Store.customer(p.customerId);
                return '<tr class="clickable" data-payment="' + p.id + '"><td><span class="t-main mono">' + UI.esc(p.receiptNo) + '</span><div class="t-sub">' + UI.esc(p.saleId) + '</div></td>' +
                  '<td><div class="cell-user">' + UI.avatar(c ? c.name : '—', 'sm') + '<div><div class="nm">' + UI.esc(c ? c.name : '—') + '</div></div></div></td>' +
                  '<td>' + UI.methodChip(p.method) + '</td>' +
                  '<td class="num"><span class="strong">' + UI.money(p.amount) + '</span></td>' +
                  '<td class="muted nowrap">' + UI.date(p.date) + '</td></tr>';
              }).join('') +
            '</tbody></table></div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-head"><div><h3>Upcoming installments</h3><div class="sub">Next payments due</div></div><div class="right"><button class="btn btn-sm btn-ghost" data-go="/installments">View' + Icons.get('chevron-right') + '</button></div></div>' +
            '<div class="mini-list">' +
              (upcoming.length ? upcoming.slice(0, 6).map(x => {
                const d = Store.daysBetween(Store.today(), new Date(x.entry.dueDate + 'T00:00:00'));
                return '<div class="mini-item" data-installment="' + x.plan.id + '">' +
                  '<span class="dot ' + (d <= 1 ? 'amber' : 'green') + '"></span>' +
                  '<div class="mi-main"><div class="mi-title">' + UI.esc(x.customer.name) + '</div><div class="mi-sub">' + UI.esc(x.sale.id) + ' · #' + x.entry.n + ' of ' + x.plan.entries.length + '</div></div>' +
                  '<div class="mi-right"><div class="mi-amount">' + UI.money(x.entry.amount - x.entry.paid) + '</div><div class="mi-date">' + (d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : UI.date(x.entry.dueDate)) + '</div></div>' +
                '</div>';
              }).join('') : '<div class="empty-state" style="padding:30px"><div class="icon-wrap">' + Icons.get('calendar') + '</div><h4>Nothing due next</h4><p>Upcoming installments will appear here.</p></div>') +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="grid grid-2-1" style="margin-top:18px">' +
          '<div class="card">' +
            '<div class="card-head"><div><h3>Recent sales</h3><div class="sub">Latest plot purchase agreements</div></div><div class="right"><button class="btn btn-sm btn-ghost" data-go="/sales">All sales' + Icons.get('chevron-right') + '</button></div></div>' +
            '<div class="table-wrap"><table class="data"><thead><tr><th>Agreement</th><th>Customer</th><th>Project / plot</th><th class="num">Value</th><th>Status</th></tr></thead><tbody>' +
              sales.map(s => {
                const c = Store.customer(s.customerId);
                const plot = Store.plot(s.plotId);
                const prj = Store.project(s.projectId);
                return '<tr class="clickable" data-sale="' + s.id + '"><td><span class="t-main mono">' + UI.esc(s.ref) + '</span><div class="t-sub">' + UI.date(s.saleDate) + '</div></td>' +
                  '<td><div class="cell-user">' + UI.avatar(c ? c.name : '—', 'sm') + '<div class="nm">' + UI.esc(c ? c.name : '—') + '</div></div></td>' +
                  '<td><div class="t-main">' + UI.esc(prj ? prj.code : '') + ' · ' + UI.esc(plot ? plot.plotNo : '') + '</div><div class="t-sub">' + (plot ? plot.size : '') + ' sqm</div></td>' +
                  '<td class="num strong">' + UI.money(s.price) + '</td>' +
                  '<td>' + UI.badge(s.status) + '</td></tr>';
              }).join('') +
            '</tbody></table></div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-head"><div><h3>Activity</h3><div class="sub">Latest staff actions</div></div></div>' +
            '<div class="card-body"><div class="timeline">' +
              Store.db.activity.slice(0, 5).map(a =>
                '<div class="timeline-item"><div class="tl-dot">' + Icons.get('check') + '</div><div class="tl-body"><div class="tl-t">' + UI.esc(a.action) + '</div><div class="tl-s">' + UI.esc(a.user) + ' · ' + UI.relTime(a.date) + '</div></div></div>').join('') +
            '</div></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    },

    mount(el) {
      const m = Store.dashboardMetrics();
      const series = Store.collectionsSeries(8);
      UI.lineChart($('#collectionsChart', el), { labels: series.labels, data: series.data });
      UI.donutChart($('#statusChart', el), {
        size: 156, stroke: 17,
        centerValue: m.totalPlots, centerLabel: 'Total plots',
        segments: [
          { label: 'Sold', value: m.sold, color: '#16A34A' },
          { label: 'Installment', value: m.installment, color: '#2563EB' },
          { label: 'Available', value: m.available, color: '#D6DAD4' },
          { label: 'Reserved', value: m.reserved, color: '#F59E0B' }
        ]
      });

      el.addEventListener('click', (e) => {
        const go = e.target.closest('[data-go]');
        if (go) { App.go(go.getAttribute('data-go')); return; }
        const act = e.target.closest('[data-act]');
        if (act) {
          if (act.getAttribute('data-act') === 'record-payment') {
            if (global.PaymentsView) global.PaymentsView.openRecord();
            else App.go('/payments');
          }
          if (act.getAttribute('data-act') === 'new-sale') {
            if (global.SalesView) global.SalesView.openNewSale();
            else App.go('/sales');
          }
          return;
        }
        const pay = e.target.closest('[data-payment]');
        if (pay) {
          const p = Store.db.payments.find(x => x.id === pay.getAttribute('data-payment'));
          if (p) UI.showReceipt(p);
          return;
        }
        const saleId = e.target.closest('[data-sale]');
        if (saleId) { App.go('/sales', () => global.SalesView && global.SalesView.openSale(saleId.getAttribute('data-sale'))); return; }
        const inst = e.target.closest('[data-installment]');
        if (inst) { App.go('/installments/' + inst.getAttribute('data-installment')); return; }
      });
    }
  };
})(window);
