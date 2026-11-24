/* Ardhi LIMS — Installment management */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;
  const $$ = UI.$$;

  const state = { tab: 'all', q: '', type: 'all', freq: 'all' };

  function planRows() {
    return Store.db.plans.map(p => {
      const s = Store.sale(p.saleId);
      const c = s ? Store.customer(s.customerId) : null;
      const plot = s ? Store.plot(s.plotId) : null;
      const prj = s ? Store.project(s.projectId) : null;
      return { plan: p, sale: s, customer: c, plot, project: prj, stats: Store.planStats(p), status: Store.planStatus(p) };
    });
  }

  function rowHTML(r) {
    const st = r.stats;
    return '<tr class="clickable" data-plan="' + r.plan.id + '" data-status="' + r.status.key + '" data-type="' + r.plan.type + '" data-freq="' + r.plan.frequency + '" data-search="' + UI.esc((r.plan.id + ' ' + (r.customer ? r.customer.name : '') + ' ' + (r.plot ? r.plot.plotNo : '') + ' ' + (r.project ? r.project.name : '') + ' ' + r.plan.frequency + ' ' + r.plan.type).toLowerCase()) + '">' +
      '<td><span class="t-main mono">' + r.plan.id + '</span><div class="t-sub">' + UI.esc(r.sale ? r.sale.id : '') + '</div></td>' +
      '<td><div class="cell-user">' + UI.avatar(r.customer ? r.customer.name : '—', 'sm') + '<div><div class="nm">' + UI.esc(r.customer ? r.customer.name : '—') + '</div><div class="sub">' + UI.esc(r.customer ? r.customer.phone : '') + '</div></div></div></td>' +
      '<td><div class="t-main">' + UI.esc(r.plot ? r.plot.plotNo : '—') + '</div><div class="t-sub">' + UI.esc(r.project ? r.project.code : '') + ' · ' + UI.esc(r.project ? r.project.name : '') + '</div></td>' +
      '<td><span class="badge ' + (r.plan.type === 'Flexible' ? 'blue' : 'grey') + ' no-dot">' + r.plan.type + '</span><div class="t-sub">' + r.plan.frequency + ' · ' + r.plan.entries.length + ' ×</div></td>' +
      '<td style="min-width:160px"><div class="ratio-cell">' + UI.donut(st.pct, st.overdue ? 'amber' : '', 32, false) + '<span class="ratio-meta">' + st.paid + ' / ' + st.entries + ' paid<span class="ratio-pct">' + st.pct + '%</span></span></div></td>' +
      '<td class="num"><span class="strong">' + UI.moneyShort(st.balance) + '</span>' + (st.overdueAmount ? '<div class="t-sub tone-red">' + UI.moneyShort(st.overdueAmount) + ' overdue</div>' : '') + '</td>' +
      '<td>' + (st.completed ? '<span class="muted">—</span>' : (st.next ? UI.date(st.next.dueDate) : '—')) + '</td>' +
      '<td>' + UI.badge(r.status.label) + '</td>' +
      '<td><div class="actions"><button class="icon-btn" style="width:30px;height:30px" data-open-plan="' + r.plan.id + '" aria-label="View plan">' + Icons.get('chevron-right') + '</button></div></td>' +
    '</tr>';
  }

  function listHTML() {
    const rows = planRows();
    const counts = {
      all: rows.length,
      ontrack: rows.filter(r => r.status.key === 'ontrack').length,
      overdue: rows.filter(r => r.status.key === 'overdue').length,
      completed: rows.filter(r => r.status.key === 'completed').length
    };
    const overdueAmount = rows.reduce((s, r) => s + r.stats.overdueAmount, 0);
    const outstanding = rows.reduce((s, r) => s + r.stats.balance, 0);
    const scheduled = rows.reduce((s, r) => s + r.stats.scheduled, 0);
    return '<div class="page">' +
      '<div class="page-head-row"><div><h2>Installment management</h2><div class="sub">Fixed and flexible plans with weekly or monthly schedules. Balances update automatically as payments are recorded.</div></div>' +
        '<div class="page-actions"><button class="btn btn-outline" data-go="/payments">' + Icons.get('payments') + 'Payment register</button>' +
        (App.can('paymentWrite') ? '<button class="btn btn-primary" data-go="/payments" data-record="1">' + Icons.get('plus') + 'Record payment</button>' : '') + '</div></div>' +
      '<div class="mini-stats">' +
        '<div class="mini-stat"><div class="ms-icon blue">' + Icons.get('installments') + '</div><div><div class="k">Active plans</div><div class="v">' + (counts.all - counts.completed) + '</div></div></div>' +
        '<div class="mini-stat"><div class="ms-icon red">' + Icons.get('alert') + '</div><div><div class="k">Overdue amount</div><div class="v">' + UI.moneyShort(overdueAmount) + '</div></div></div>' +
        '<div class="mini-stat"><div class="ms-icon green">' + Icons.get('check-circle') + '</div><div><div class="k">Completed plans</div><div class="v">' + counts.completed + '</div></div></div>' +
        '<div class="mini-stat"><div class="ms-icon amber">' + Icons.get('receipt') + '</div><div><div class="k">Outstanding balance</div><div class="v">' + UI.moneyShort(outstanding) + '</div></div></div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="tabs">' +
          [['all', 'All plans'], ['ontrack', 'On track'], ['overdue', 'Overdue'], ['completed', 'Completed']].map(t =>
            '<button class="tab ' + (state.tab === t[0] ? 'active' : '') + '" data-tab="' + t[0] + '">' + t[1] + ' <span class="count">' + counts[t[0]] + '</span></button>').join('') +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="field-inline" style="width:260px"><span data-x>' + Icons.get('search') + '</span><input class="input search-input" id="planSearch" placeholder="Search customer, plan, plot…" value="' + UI.esc(state.q) + '" /></div>' +
          '<select class="select" id="planType">' + UI.options([{ value: 'all', label: 'All plan types' }, { value: 'Fixed', label: 'Fixed plans' }, { value: 'Flexible', label: 'Flexible plans' }], state.type) + '</select>' +
          '<select class="select" id="planFreq">' + UI.options([{ value: 'all', label: 'All frequencies' }, { value: 'Weekly', label: 'Weekly' }, { value: 'Monthly', label: 'Monthly' }], state.freq) + '</select>' +
          '<div class="spacer"></div><span class="filter-count" id="planCount"></span>' +
        '</div>' +
        '<div class="table-wrap"><table class="data" id="planTable"><thead><tr><th>Plan</th><th>Customer</th><th>Project / plot</th><th>Plan</th><th>Progress</th><th class="num">Balance</th><th>Next due</th><th>Status</th><th></th></tr></thead><tbody>' +
          rows.map(rowHTML).join('') + '</tbody></table></div>' +
        '<div class="table-foot"><span id="planFoot"></span><span class="muted small">Total scheduled: ' + UI.money(scheduled) + ' · weekly and monthly frequencies confirmed in the PRD.</span></div>' +
      '</div>' +
    '</div>';
  }

  function detailHTML(planId) {
    const p = Store.plan(planId);
    if (!p) return '<div class="card"><div class="card-body">' + UI.emptyState('alert', 'Installment plan not found', 'The requested plan does not exist.', '<button class="btn btn-primary" style="margin-top:14px" data-go="/installments">Back to installments</button>') + '</div></div>';
    const s = Store.sale(p.saleId);
    const c = Store.customer(p.customerId);
    const plot = s ? Store.plot(s.plotId) : null;
    const prj = s ? Store.project(s.projectId) : null;
    const st = Store.planStats(p);
    const status = Store.planStatus(p);
    const payments = Store.paymentsForSale(p.saleId).sort((a, b) => (a.date < b.date ? 1 : -1));

    const schedule = p.entries.map(e => {
      const stateKey = Store.entryState(e);
      const overdue = stateKey === 'overdue';
      const isNext = st.next && st.next.n === e.n;
      const remaining = Math.max(0, e.amount - (e.paid || 0));
      return '<tr class="' + (overdue ? 'row-overdue' : isNext ? 'row-next' : '') + '">' +
        '<td class="mono">#' + e.n + '</td>' +
        '<td>' + UI.date(e.dueDate) + (overdue ? ' <span class="badge red no-dot" style="height:19px;font-size:10px">late</span>' : '') + '</td>' +
        '<td class="num">' + UI.money(e.amount) + '</td>' +
        '<td class="num">' + (e.paid ? UI.money(e.paid) : '—') + '</td>' +
        '<td class="num">' + (remaining ? UI.money(remaining) : '<span class="muted">—</span>') + '</td>' +
        '<td><span class="schedule-status ' + stateKey + '">' + (stateKey === 'paid' ? Icons.get('check-circle') : stateKey === 'overdue' ? Icons.get('alert') : stateKey === 'partial' ? Icons.get('clock') : Icons.get('clock')) + (stateKey === 'paid' ? 'Paid' : stateKey === 'overdue' ? 'Overdue' : stateKey === 'partial' ? 'Partial' : 'Pending') + '</span></td>' +
      '</tr>';
    }).join('');

    return '<div class="page">' +
      '<button class="back-link" data-go="/installments">' + Icons.get('arrow-left') + 'All installment plans</button>' +
      '<div class="detail-head">' +
        UI.avatar(c ? c.name : '—', 'lg') +
        '<div class="who"><h2>' + UI.esc(c ? c.name : '—') + ' ' + UI.badge(status.label) + ' <span class="chip no-dot" style="font-size:11px">' + p.type + ' plan</span></h2>' +
          '<div class="sub">' + p.id + ' · ' + UI.esc(s ? s.id : '') + ' · ' + UI.esc(prj ? prj.name : '') + ' · Plot ' + UI.esc(plot ? plot.plotNo : '') + '</div>' +
          '<div class="detail-meta">' +
            '<div class="dm"><div class="k">Frequency</div><div class="v">' + p.frequency + '</div></div>' +
            '<div class="dm"><div class="k">Term</div><div class="v">' + p.termMonths + ' months</div></div>' +
            '<div class="dm"><div class="k">Installments</div><div class="v">' + st.paid + ' / ' + st.entries + ' paid</div></div>' +
            '<div class="dm"><div class="k">Started</div><div class="v">' + UI.date(p.startDate) + '</div></div>' +
            '<div class="dm"><div class="k">Overdue</div><div class="v" style="color:' + (st.overdue ? 'var(--red)' : 'inherit') + '">' + (st.overdue ? st.overdue + ' · ' + UI.moneyShort(st.overdueAmount) : 'None') + '</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn btn-outline" data-act="print-statement">' + Icons.get('print') + 'Statement</button>' +
          '<button class="btn btn-outline" data-act="customer">' + Icons.get('user') + 'Customer</button>' +
          (st.balance > 0 && App.can('paymentWrite') ? '<button class="btn btn-primary" data-act="pay">' + Icons.get('payments') + 'Record payment</button>' : '') +
        '</div>' +
      '</div>' +

      '<div class="plan-hero">' +
        UI.ring(st.pct, 150, 12, st.pct + '%', 'paid') +
        '<div class="info">' +
          '<div><h3>Payment progress</h3><div class="sub">' + (st.completed ? 'This installment account is fully paid and marked completed.' : (st.next ? 'Next installment #' + st.next.n + ' due ' + UI.date(st.next.dueDate) + '.' : 'No upcoming installment.')) + '</div></div>' +
          '<div class="plan-amounts">' +
            '<div class="pa"><div class="k">Purchase price</div><div class="v">' + UI.money(s ? s.price : 0) + '</div></div>' +
            '<div class="pa"><div class="k">Initial deposit</div><div class="v">' + UI.money(s ? s.deposit : 0) + '</div></div>' +
            '<div class="pa"><div class="k">Total paid</div><div class="v" style="color:var(--green-600)">' + UI.money(s ? Store.salePaid(s.id) : 0) + '</div></div>' +
            '<div class="pa"><div class="k">Outstanding balance</div><div class="v" style="color:' + (st.balance ? 'var(--amber)' : 'var(--green-600)') + '">' + UI.money(st.balance) + '</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="grid grid-2-1">' +
        '<div class="card">' +
          '<div class="card-head"><div><h3>Payment schedule</h3><div class="sub">' + p.entries.length + ' ' + p.frequency.toLowerCase() + ' installments · ' + UI.esc(p.type) + ' plan</div></div>' +
            '<div class="right">' + UI.badge(st.overdue ? st.overdue + ' overdue' : 'On schedule', st.overdue ? 'red' : 'green') + '</div></div>' +
          '<div class="table-wrap" style="max-height:520px;overflow:auto"><table class="data"><thead><tr><th>#</th><th>Due date</th><th class="num">Amount</th><th class="num">Paid</th><th class="num">Remaining</th><th>Status</th></tr></thead><tbody>' + schedule + '</tbody></table></div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:18px">' +
          '<div class="card"><div class="card-head"><div><h3>Account summary</h3></div></div><div class="card-body"><dl class="kv">' +
            '<dt>Plan ID</dt><dd class="mono">' + p.id + '</dd>' +
            '<dt>Sale record</dt><dd class="mono">' + UI.esc(s ? s.id : '—') + '</dd>' +
            '<dt>Agreement</dt><dd>' + UI.esc(s ? s.ref : '—') + '</dd>' +
            '<dt>Customer</dt><dd>' + UI.esc(c ? c.name : '—') + '</dd>' +
            '<dt>Plot</dt><dd>' + UI.esc(plot ? plot.plotNo : '—') + ' · ' + (plot ? plot.size : '') + ' sqm</dd>' +
            '<dt>Scheduled total</dt><dd>' + UI.money(st.scheduled) + '</dd>' +
            '<dt>Installments paid</dt><dd>' + st.paid + ' of ' + st.entries + '</dd>' +
            '<dt>Pending</dt><dd>' + st.pending + '</dd>' +
            '<dt>Overdue</dt><dd>' + (st.overdue ? '<span class="tone-red strong">' + st.overdue + '</span>' : '0') + '</dd>' +
            '<dt>Completion</dt><dd>' + (st.completed ? UI.badge('Completed') : '<span class="muted">Ongoing</span>') + '</dd>' +
          '</dl></div></div>' +
          '<div class="card"><div class="card-head"><div><h3>Payment history</h3><div class="sub">Latest records on this account</div></div></div>' +
            '<div class="mini-list">' +
              (payments.length ? payments.slice(0, 6).map(pay => '<div class="mini-item" data-receipt="' + pay.id + '"><span class="dot green"></span><div class="mi-main"><div class="mi-title">' + UI.esc(pay.receiptNo) + '</div><div class="mi-sub">' + pay.method + ' · ' + UI.date(pay.date) + '</div></div><div class="mi-right"><div class="mi-amount">' + UI.money(pay.amount) + '</div></div></div>').join('')
                : '<div class="empty-state" style="padding:26px"><h4>No payments yet</h4><p>Payments recorded against this account will appear here.</p></div>') +
            '</div>' +
            (payments.length ? '<div class="card-body" style="border-top:1px solid var(--line-soft);padding:10px 18px"><button class="link-btn" data-go="/payments">Open payment register ' + Icons.get('arrow-right') + '</button></div>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function printStatement(planId) {
    const p = Store.plan(planId);
    const s = Store.sale(p.saleId);
    const c = Store.customer(p.customerId);
    const plot = Store.plot(s.plotId);
    const prj = Store.project(s.projectId);
    const st = Store.planStats(p);
    const settings = Store.db.settings;
    const rows = p.entries.map(e => {
      const key = Store.entryState(e);
      return '<tr><td>#' + e.n + '</td><td>' + UI.date(e.dueDate) + '</td><td class="num">' + UI.numberShort(e.amount) + '</td><td class="num">' + (e.paid ? UI.numberShort(e.paid) : '—') + '</td><td>' + (key === 'paid' ? 'Paid' : key === 'overdue' ? 'Overdue' : key === 'partial' ? 'Partial' : 'Pending') + '</td></tr>';
    }).join('');
    const html = '<div style="padding:6px 4px">' +
      '<div class="print-letterhead"><div><div class="nm">' + UI.esc(settings.companyName) + '</div><div class="sub">' + UI.esc(settings.companyAddress) + '</div><div class="sub">' + UI.esc(settings.companyPhone) + ' · ' + UI.esc(settings.companyEmail) + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:13px;font-weight:700">INSTALLMENT STATEMENT</div><div style="font-size:10px;color:#555">' + p.id + ' · ' + UI.date(Store.iso(Store.today())) + '</div></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:14px;font-size:11px">' +
        '<div><strong>Customer</strong><br>' + UI.esc(c.name) + '<br>' + UI.esc(c.phone) + '<br>' + UI.esc(c.address) + '</div>' +
        '<div><strong>Property</strong><br>' + UI.esc(prj.name) + '<br>Plot ' + UI.esc(plot.plotNo) + ' · ' + plot.size + ' sqm<br>Agreement ' + UI.esc(s.ref) + '</div>' +
      '</div>' +
      '<table class="report-table-print" style="margin-bottom:12px"><tbody>' +
        '<tr><td>Purchase price</td><td class="num">' + UI.money(s.price) + '</td><td>Deposit</td><td class="num">' + UI.money(s.deposit) + '</td></tr>' +
        '<tr><td>Total paid</td><td class="num">' + UI.money(Store.salePaid(s.id)) + '</td><td>Outstanding balance</td><td class="num">' + UI.money(st.balance) + '</td></tr>' +
        '<tr><td>Plan</td><td>' + p.type + ' · ' + p.frequency + ' · ' + p.entries.length + ' installments</td><td>Overdue installments</td><td>' + st.overdue + '</td></tr>' +
      '</tbody></table>' +
      '<table class="report-table-print"><thead><tr><th>#</th><th>Due date</th><th class="num">Amount</th><th class="num">Paid</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div style="margin-top:14px;font-size:9px;color:#666">Generated from the Ardhi LIMS prototype with fictional data. Not a financial document.</div>' +
    '</div>';
    const holder = document.createElement('div');
    holder.className = 'print-doc';
    holder.innerHTML = html;
    UI.printElement(holder, 'Installment statement ' + p.id);
  }

  V.installments = {
    titleFor(param) {
      if (param) {
        const p = Store.plan(param);
        if (p) { const c = Store.customer(p.customerId); return ['Installment · ' + (c ? c.name : p.id), 'Finance']; }
      }
      return ['Installment Management', 'Finance'];
    },

    render(param) {
      return param ? detailHTML(param) : listHTML();
    },

    mount(el, param) {
      if (param) {
        el.addEventListener('click', (e) => {
          const go = e.target.closest('[data-go]');
          if (go) { App.go(go.getAttribute('data-go')); return; }
          const act = e.target.closest('[data-act]');
          if (act) {
            const a = act.getAttribute('data-act');
            if (a === 'print-statement') printStatement(param);
            if (a === 'customer') { const p = Store.plan(param); V.customers.openDetail(p.customerId); }
            if (a === 'pay') { const p = Store.plan(param); if (global.PaymentsView) global.PaymentsView.openRecord(p.saleId); }
            return;
          }
          const rc = e.target.closest('[data-receipt]');
          if (rc) {
            const p = Store.db.payments.find(x => x.id === rc.getAttribute('data-receipt'));
            if (p) UI.showReceipt(p);
          }
        });
        return;
      }

      $$('[data-tab]', el).forEach(b => b.addEventListener('click', () => { state.tab = b.getAttribute('data-tab'); App.refresh(); }));
      const search = $('#planSearch', el);
      const typeSel = $('#planType', el);
      const freqSel = $('#planFreq', el);
      if (search) {
        const apply = () => {
          state.q = search.value; state.type = typeSel.value; state.freq = freqSel.value;
          const rows = $$('#planTable tbody tr', el);
          let visible = 0;
          rows.forEach(r => {
            let show = state.tab === 'all' || r.getAttribute('data-status') === state.tab;
            if (show && state.type !== 'all' && r.getAttribute('data-type') !== state.type) show = false;
            if (show && state.freq !== 'all' && r.getAttribute('data-freq') !== state.freq) show = false;
            if (show && state.q && !(r.getAttribute('data-search') || '').includes(state.q.toLowerCase())) show = false;
            r.style.display = show ? '' : 'none';
            if (show) visible++;
          });
          $('#planCount', el).textContent = visible + ' of ' + rows.length;
          $('#planFoot', el).textContent = 'Showing ' + visible + ' installment plan' + (visible === 1 ? '' : 's');
        };
        search.addEventListener('input', UI.debounce(apply, 140));
        typeSel.addEventListener('change', apply);
        freqSel.addEventListener('change', apply);
        apply();
      }
      el.addEventListener('click', (e) => {
        const go = e.target.closest('[data-go]');
        if (go) {
          if (go.getAttribute('data-record')) { e.preventDefault(); if (global.PaymentsView) global.PaymentsView.openRecord(); return; }
          App.go(go.getAttribute('data-go')); return;
        }
        const open = e.target.closest('[data-open-plan]');
        if (open) { e.stopPropagation(); App.go('/installments/' + open.getAttribute('data-open-plan')); return; }
        const row = e.target.closest('tr[data-plan]');
        if (row) App.go('/installments/' + row.getAttribute('data-plan'));
      });
    }
  };
})(window);
