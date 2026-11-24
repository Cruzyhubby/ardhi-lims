/* Ardhi LIMS — expenditure register and report */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;
  const $$ = UI.$$;

  const CATEGORIES = [
    'Land survey & titling', 'Utilities', 'Transport & fuel', 'Office supplies',
    'Rent & facilities', 'Marketing & outreach', 'Professional services',
    'Repairs & maintenance', 'Statutory & regulatory fees', 'Other operating costs'
  ];
  const METHODS = ['Bank Transfer', 'M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Cash', 'Cheque'];
  const PERIODS = [
    { value: 'month', label: 'This month' },
    { value: 'last', label: 'Last month' },
    { value: 'quarter', label: 'Last 3 months' },
    { value: 'year', label: 'This year' },
    { value: 'all', label: 'All time' }
  ];
  const COLORS = ['#16A34A', '#2563EB', '#F59E0B', '#8B5CF6', '#0EA5E9', '#64748B', '#DC2626', '#14B8A6', '#A3A3A3', '#84CC16'];

  const state = { period: 'quarter', category: 'all', project: 'all' };

  function range(key) {
    const t = Store.today();
    const y = t.getFullYear(), m = t.getMonth();
    if (key === 'last') {
      return { from: Store.iso(new Date(y, m - 1, 1)), to: Store.iso(new Date(y, m, 0)), label: 'last month' };
    }
    if (key === 'year') return { from: y + '-01-01', to: Store.iso(t), label: 'this year' };
    if (key === 'all') return { from: '0000-01-01', to: '9999-12-31', label: 'all recorded time' };
    if (key === 'month') return { from: Store.iso(new Date(y, m, 1)), to: Store.iso(t), label: 'this month' };
    return { from: Store.iso(new Date(y, m - 2, 1)), to: Store.iso(t), label: 'the last 3 months' };
  }

  function inRange(e, r) { return e.date >= r.from && e.date <= r.to; }

  function baseRows() {
    const r = range(state.period);
    return Store.db.expenses.filter(e => inRange(e, r) &&
      (state.category === 'all' || e.category === state.category) &&
      (state.project === 'all' || e.projectId === state.project));
  }

  function projectName(id) {
    const p = id ? Store.project(id) : null;
    return p ? p.name : 'Company-wide';
  }

  function rowHTML(e) {
    const search = UI.esc((e.voucherNo + ' ' + e.category + ' ' + e.description + ' ' + e.payee + ' ' + e.reference + ' ' + projectName(e.projectId) + ' ' + e.recordedBy).toLowerCase());
    return '<tr class="clickable" data-expense-row="' + e.id + '" data-amount="' + e.amount + '" data-cat="' + UI.esc(e.category) + '" data-search="' + search + '">' +
      '<td>' + UI.date(e.date) + '</td>' +
      '<td class="mono">' + UI.esc(e.voucherNo) + '</td>' +
      '<td>' + UI.esc(e.category) + '</td>' +
      '<td><div class="t-main">' + UI.esc(e.description) + '</div><div class="t-sub">' + UI.esc(e.payee) + '</div></td>' +
      '<td>' + UI.esc(projectName(e.projectId)) + '</td>' +
      '<td>' + UI.esc(e.method) + '</td>' +
      '<td class="num">' + UI.money(e.amount) + '</td>' +
      '<td><button class="btn btn-sm btn-ghost" data-expense="' + e.id + '">View</button></td>' +
    '</tr>';
  }

  function tableHTML(rows) {
    return '<div class="table-wrap"><table class="data" id="expTable"><thead><tr>' +
      '<th>Date</th><th>Voucher</th><th>Category</th><th>Description / payee</th><th>Project</th><th>Method</th><th class="num">Amount</th><th></th>' +
    '</tr></thead><tbody id="expBody">' +
      (rows.length ? rows.map(rowHTML).join('') : '<tr id="expEmpty"><td colspan="8">' + UI.emptyState('cash', 'No expenditure entries match', 'Try another period, category or project.') + '</td></tr>') +
    '</tbody></table></div>';
  }

  function summaryStats(rows) {
    const total = rows.reduce((s, e) => s + e.amount, 0);
    const t = Store.today();
    const monthKey = Store.iso(t).slice(0, 7);
    const thisMonth = Store.db.expenses.filter(e => e.date.slice(0, 7) === monthKey);
    const byCat = {};
    rows.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    const top = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a])[0];
    return { total, thisMonth: thisMonth.reduce((s, e) => s + e.amount, 0), thisMonthCount: thisMonth.length, top, topAmount: top ? byCat[top] : 0 };
  }

  function charts(rows) {
    const byCat = {};
    rows.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    const cats = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]).slice(0, 6);
    UI.barChart($('#expCatChart'), {
      items: cats.map((c, i) => ({ label: c, value: byCat[c], color: COLORS[i % COLORS.length] })),
      format: UI.moneyShort
    });
    if (!cats.length) $('#expCatChart').innerHTML = '<div class="muted small">No entries in the selected period.</div>';

    const now = Store.today();
    const items = [];
    for (let i = 5; i >= 0; i--) {
      const d = Store.addMonths(now, -i);
      const key = Store.iso(d).slice(0, 7);
      const value = Store.db.expenses.filter(e => e.date.slice(0, 7) === key).reduce((s, e) => s + e.amount, 0);
      items.push({ label: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }), value, color: '#16A34A' });
    }
    UI.barChart($('#expTrendChart'), { items, format: UI.moneyShort });
  }

  function periodLabel() {
    const p = PERIODS.find(x => x.value === state.period);
    return p ? p.label : 'Selected period';
  }

  function expenseModal(id) {
    const e = Store.expense(id);
    if (!e) return;
    UI.modal({
      title: e.voucherNo,
      subtitle: e.category + ' · ' + UI.date(e.date),
      size: 'md',
      body: '<div class="kv-cards">' +
          '<div class="item"><div class="k">Payee</div><div class="v" style="font-size:13px">' + UI.esc(e.payee) + '</div></div>' +
          '<div class="item"><div class="k">Amount</div><div class="v" style="font-size:13px">' + UI.money(e.amount) + '</div></div>' +
          '<div class="item"><div class="k">Payment method</div><div class="v" style="font-size:13px">' + UI.esc(e.method) + '</div></div>' +
          '<div class="item"><div class="k">Project</div><div class="v" style="font-size:13px">' + UI.esc(projectName(e.projectId)) + '</div></div>' +
          '<div class="item"><div class="k">Reference</div><div class="v" style="font-size:13px">' + UI.esc(e.reference || '—') + '</div></div>' +
          '<div class="item"><div class="k">Recorded by</div><div class="v" style="font-size:13px">' + UI.esc(e.recordedBy) + '</div></div>' +
        '</div>' +
        '<div style="margin-top:14px"><div class="k" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;margin-bottom:5px">Description</div><div class="msg-preview">' + UI.esc(e.description) + '</div></div>' +
        '<div class="notice warn" style="margin-top:14px">' + Icons.get('alert') + '<div><strong>Simulated record.</strong> Expenditure entries cannot be edited or reversed in this prototype, and no approval workflow is defined.</div></div>',
      footer: '<button class="btn btn-primary" data-x="close">Close</button>',
      onMount(el, close) { $('[data-x="close"]', el).addEventListener('click', close); }
    });
  }

  function openRecord() {
    if (!App.can('expenseWrite')) { UI.toast('Only the Accountant can record expenditure.', 'warn'); return; }
    const todayISO = Store.iso(Store.today());
    UI.modal({
      title: 'Record expenditure',
      subtitle: 'Accountant entry · simulated record — no real payment is made',
      size: 'lg',
      body: '<form id="expForm" novalidate>' +
        '<div class="form-grid">' +
          '<div class="field" data-field="date"><label>Date <span class="req">*</span></label><input class="input" type="date" name="date" max="' + todayISO + '" value="' + todayISO + '" /><span class="error-msg">Select the expenditure date.</span></div>' +
          '<div class="field" data-field="category"><label>Category <span class="req">*</span></label><select class="select" name="category">' + UI.options(CATEGORIES.map(c => ({ value: c, label: c }))) + '</select><span class="error-msg">Select a category.</span></div>' +
          '<div class="field" data-field="amount"><label>Amount (TZS) <span class="req">*</span></label><input class="input" type="number" name="amount" min="1" step="1000" placeholder="e.g. 450000" /><span class="error-msg">Enter an amount greater than zero.</span></div>' +
          '<div class="field" data-field="method"><label>Payment method <span class="req">*</span></label><select class="select" name="method">' + UI.options(METHODS.map(m => ({ value: m, label: m }))) + '</select></div>' +
          '<div class="field" data-field="payee"><label>Payee <span class="req">*</span></label><input class="input" name="payee" placeholder="Supplier, vendor or institution" /><span class="error-msg">Enter the payee.</span></div>' +
          '<div class="field" data-field="projectId"><label>Project allocation</label><select class="select" name="projectId"><option value="">Company-wide</option>' + Store.db.projects.map(p => '<option value="' + p.id + '">' + UI.esc(p.name) + '</option>').join('') + '</select><span class="hint">Optional. Use for costs that belong to a specific land project.</span></div>' +
          '<div class="field full" data-field="description"><label>Description <span class="req">*</span></label><textarea class="textarea" name="description" placeholder="What was the expenditure for?" style="min-height:84px"></textarea><span class="error-msg">Describe the expenditure.</span></div>' +
          '<div class="field full" data-field="reference"><label>Reference / invoice number</label><input class="input" name="reference" placeholder="Optional supplier invoice or voucher reference" /></div>' +
        '</div>' +
        '<div class="notice warn" style="margin-top:16px">' + Icons.get('alert') + '<div><strong>Entry restricted to the Accountant.</strong> Owner and Manager have read-only oversight; Cashier has no expenditure access. No approval, correction or reversal workflow is simulated.</div></div>' +
      '</form>',
      footer: '<button class="btn btn-outline" data-x="cancel">Cancel</button><button class="btn btn-primary" type="submit" form="expForm">' + Icons.get('check') + 'Record expenditure</button>',
      onMount(el, close) {
        const form = $('#expForm', el);
        $('[data-x="cancel"]', el).addEventListener('click', close);
        form.addEventListener('submit', (ev) => {
          ev.preventDefault();
          const ok = UI.validate(form, [
            { name: 'date', required: true, msg: 'Select the expenditure date.' },
            { name: 'category', required: true, msg: 'Select a category.' },
            { name: 'payee', required: true, msg: 'Enter the payee.' },
            { name: 'description', required: true, msg: 'Describe the expenditure.' }
          ]);
          const amount = Number(form.elements.amount.value);
          if (!(amount > 0)) { UI.fieldError(form.elements.amount, 'Enter an amount greater than zero.'); return; }
          if (form.elements.date.value > Store.iso(Store.today())) { UI.fieldError(form.elements.date, 'The date cannot be in the future.'); return; }
          if (!ok) return;
          const data = UI.readForm(form);
          data.amount = amount;
          const e = Store.addExpense(data);
          close();
          App.refresh();
          UI.toast('Expenditure ' + e.voucherNo + ' recorded.');
        });
      }
    });
  }

  function visibleExpenses() {
    const ids = $$('[data-expense-row]').filter(r => r.style.display !== 'none').map(r => r.getAttribute('data-expense-row'));
    return ids.map(id => Store.expense(id)).filter(Boolean);
  }

  function printReport() {
    const rows = visibleExpenses();
    if (!rows.length) { UI.toast('There are no expenditure entries to print.', 'warn'); return; }
    const total = rows.reduce((s, e) => s + e.amount, 0);
    const settings = Store.db.settings;
    const proj = state.project === 'all' ? 'All projects' : Store.project(state.project).name;
    const cat = state.category === 'all' ? 'All categories' : state.category;
    const doc = document.createElement('div');
    doc.innerHTML = '<div class="print-letterhead"><div><div class="nm">' + UI.esc(settings.companyName) + '</div><div class="sub">' + UI.esc(settings.companyAddress) + '</div><div class="sub">' + UI.esc(settings.companyPhone) + ' · ' + UI.esc(settings.companyEmail) + '</div></div>' +
      '<div style="text-align:right"><div class="nm" style="font-size:12px">Expenditure report</div><div class="sub">' + UI.esc(periodLabel()) + ' · ' + UI.esc(proj) + '</div><div class="sub">Generated ' + UI.date(Store.iso(Store.today())) + '</div></div></div>' +
      '<div style="display:flex;gap:24px;margin-bottom:14px;font-size:11px"><div><strong>Category:</strong> ' + UI.esc(cat) + '</div><div><strong>Entries:</strong> ' + rows.length + '</div><div><strong>Total expenditure:</strong> ' + UI.money(total) + '</div></div>' +
      '<table class="report-table-print"><thead><tr><th>Date</th><th>Voucher</th><th>Category</th><th>Description / payee</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead><tbody>' +
        rows.map(e => '<tr><td>' + UI.date(e.date) + '</td><td>' + UI.esc(e.voucherNo) + '</td><td>' + UI.esc(e.category) + '</td><td>' + UI.esc(e.description) + '<div style="color:#777">' + UI.esc(e.payee) + '</div></td><td>' + UI.esc(e.method) + '</td><td style="text-align:right">' + UI.money(e.amount) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td colspan="5"><strong>Total</strong></td><td style="text-align:right"><strong>' + UI.money(total) + '</strong></td></tr></tfoot></table>' +
      '<p style="font-size:10px;color:#777;margin-top:12px">Simulated expenditure register from the Ardhi prototype. This is not a real financial statement and no approval or reversal workflow is represented.</p>';
    UI.printElement(doc, 'Expenditure report — ' + periodLabel());
  }

  V.expenditures = {
    render() {
      const rows = baseRows().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.voucherNo < b.voucherNo ? 1 : -1)));
      const st = summaryStats(rows);
      const canWrite = App.can('expenseWrite');
      const r = range(state.period);
      return '<div class="page">' +
        '<div class="page-head-row"><div><h2>Expenditure</h2><div class="sub">Company spending register with category, project and period reporting. Entry is restricted to the Accountant; Owner and Manager have read-only oversight.</div></div>' +
          '<div class="page-actions">' +
            '<button class="btn btn-outline" data-act="print">' + Icons.get('print') + 'Print report</button>' +
            (canWrite ? '<button class="btn btn-primary" data-act="record">' + Icons.get('plus') + 'Record expenditure</button>' : '<span class="chip">' + Icons.get('eye') + 'Read-only oversight</span>') +
          '</div></div>' +
        '<div class="mini-stats">' +
          '<div class="mini-stat"><div class="ms-icon green">' + Icons.get('cash') + '</div><div><div class="k">Total expenditure</div><div class="v">' + UI.moneyShort(st.total) + '</div><div class="small muted">' + rows.length + ' entries · ' + UI.esc(periodLabel().toLowerCase()) + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon blue">' + Icons.get('calendar') + '</div><div><div class="k">This month</div><div class="v">' + UI.moneyShort(st.thisMonth) + '</div><div class="small muted">' + st.thisMonthCount + ' entries recorded</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon amber">' + Icons.get('reports') + '</div><div><div class="k">Largest category</div><div class="v">' + UI.moneyShort(st.topAmount) + '</div><div class="small muted">' + UI.esc(st.top || 'No entries') + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon">' + Icons.get('receipt') + '</div><div><div class="k">Register entries</div><div class="v">' + rows.length + '</div><div class="small muted">' + UI.esc(r.label) + '</div></div></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="filter-bar">' +
            '<div class="field-inline" style="width:280px"><span data-x>' + Icons.get('search') + '</span><input class="input search-input" id="expSearch" placeholder="Search voucher, payee, description…" /></div>' +
            '<select class="select" id="expCategory">' + UI.options([{ value: 'all', label: 'All categories' }].concat(CATEGORIES.map(c => ({ value: c, label: c }))), state.category) + '</select>' +
            '<select class="select" id="expProject"><option value="all">All projects</option>' + Store.db.projects.map(p => '<option value="' + p.id + '"' + (state.project === p.id ? ' selected' : '') + '>' + UI.esc(p.name) + '</option>').join('') + '</select>' +
            '<select class="select" id="expPeriod">' + UI.options(PERIODS, state.period) + '</select>' +
            '<div class="spacer"></div><span class="filter-count" id="expCount">' + rows.length + ' of ' + rows.length + '</span>' +
          '</div>' +
          tableHTML(rows) +
          '<div class="table-foot"><span id="expFoot">Total: ' + UI.money(st.total) + '</span><span class="muted small">Simulated expenditure records · no real money is moved.</span></div>' +
        '</div>' +
        '<div class="split-2" style="margin-top:16px">' +
          '<div class="card"><div class="card-head"><div><h3>Spending by category</h3><div class="sub">' + UI.esc(periodLabel()) + '</div></div></div><div class="card-body" id="expCatChart"></div></div>' +
          '<div class="card"><div class="card-head"><div><h3>Six-month trend</h3><div class="sub">All recorded expenditure</div></div></div><div class="card-body" id="expTrendChart"></div></div>' +
        '</div>' +
        '<div class="notice info" style="margin-top:16px">' + Icons.get('info') + '<div><strong>Role separation.</strong> Accountant records expenditure; Owner and Manager can view the register and print reports; Cashier has no expenditure access. Approval, correction and reversal workflows are not defined in this prototype.</div></div>' +
      '</div>';
    },

    mount(el) {
      charts(baseRows());
      const search = $('#expSearch', el);
      const count = $('#expCount', el);
      const foot = $('#expFoot', el);
      const rows = $$('[data-expense-row]', el);
      const totalAll = rows.reduce((s, r) => s + Number(r.getAttribute('data-amount')), 0);

      const applySearch = () => {
        const q = (search.value || '').trim().toLowerCase();
        let shown = 0, sum = 0;
        rows.forEach(r => {
          const visible = !q || (r.getAttribute('data-search') || '').includes(q);
          r.style.display = visible ? '' : 'none';
          if (visible) { shown += 1; sum += Number(r.getAttribute('data-amount')); }
        });
        if (count) count.textContent = shown + ' of ' + rows.length;
        if (foot) foot.textContent = q ? 'Filtered total: ' + UI.money(sum) + ' · ' + shown + ' entries' : 'Total: ' + UI.money(totalAll);
      };

      if (search) search.addEventListener('input', UI.debounce(applySearch, 120));
      const catSel = $('#expCategory', el);
      if (catSel) catSel.addEventListener('change', () => { state.category = catSel.value; App.refresh(); });
      const prjSel = $('#expProject', el);
      if (prjSel) prjSel.addEventListener('change', () => { state.project = prjSel.value; App.refresh(); });
      const perSel = $('#expPeriod', el);
      if (perSel) perSel.addEventListener('change', () => { state.period = perSel.value; App.refresh(); });

      const rec = $('[data-act="record"]', el);
      if (rec) rec.addEventListener('click', openRecord);
      const pr = $('[data-act="print"]', el);
      if (pr) pr.addEventListener('click', printReport);

      el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-expense]');
        if (btn) { e.stopPropagation(); expenseModal(btn.getAttribute('data-expense')); return; }
        const row = e.target.closest('[data-expense-row]');
        if (row) expenseModal(row.getAttribute('data-expense-row'));
      });
    }
  };

  global.ExpenditureView = { openRecord };
})(window);
