/* Ardhi LIMS — Payment management and receipts */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;
  const $$ = UI.$$;

  const state = { q: '', method: 'all', project: 'all', period: 'all' };

  const METHODS = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Bank Transfer', 'Cash', 'Cheque'];

  function inPeriod(dateStr) {
    if (state.period === 'all') return true;
    const d = new Date(dateStr + 'T00:00:00');
    const now = Store.today();
    if (state.period === 'today') return dateStr === Store.iso(now);
    if (state.period === '7d') return (now - d) / 86400000 <= 7;
    if (state.period === '30d') return (now - d) / 86400000 <= 30;
    if (state.period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  }

  function paymentRow(p) {
    const c = Store.customer(p.customerId);
    const s = Store.sale(p.saleId);
    const plot = s ? Store.plot(s.plotId) : null;
    return '<tr class="clickable" data-payment="' + p.id + '" data-method="' + UI.esc(p.method) + '" data-project="' + p.projectId + '" data-search="' + UI.esc((p.receiptNo + ' ' + p.saleId + ' ' + p.txnRef + ' ' + (c ? c.name : '') + ' ' + (c ? c.phone : '') + ' ' + p.method + ' ' + p.recordedBy).toLowerCase()) + '">' +
      '<td><span class="t-main mono">' + UI.esc(p.receiptNo) + '</span><div class="t-sub">' + UI.esc(p.id) + '</div></td>' +
      '<td>' + UI.date(p.date) + '</td>' +
      '<td><div class="cell-user">' + UI.avatar(c ? c.name : '—', 'sm') + '<div><div class="nm">' + UI.esc(c ? c.name : '—') + '</div><div class="sub">' + UI.esc(p.saleId) + '</div></div></div></td>' +
      '<td><div class="t-main">' + UI.esc(s ? s.ref : '—') + '</div><div class="t-sub">' + UI.esc(plot ? plot.plotNo : '') + ' · ' + UI.esc(p.type) + '</div></td>' +
      '<td>' + UI.methodChip(p.method) + '</td>' +
      '<td class="mono small">' + UI.esc(p.txnRef) + '</td>' +
      '<td class="num strong">' + UI.money(p.amount) + '</td>' +
      '<td>' + UI.esc(p.recordedBy) + '</td>' +
      '<td><div class="actions"><button class="icon-btn" style="width:30px;height:30px" data-receipt="' + p.id + '" aria-label="View receipt" title="Receipt">' + Icons.get('receipt') + '</button></div></td>' +
    '</tr>';
  }

  function openRecord(preselectSaleId) {
    if (!App.can('paymentWrite')) { UI.toast('Your access profile cannot record payments.', 'warn'); return; }
    const openSales = Store.db.sales.filter(s => Store.saleBalance(s.id) > 0)
      .map(s => ({ s, c: Store.customer(s.customerId) }))
      .sort((a, b) => a.c.name.localeCompare(b.c.name));
    if (!openSales.length) { UI.toast('There are no outstanding balances to record against.', 'warn'); return; }
    const options = openSales.map(x => '<option value="' + x.s.id + '"' + (x.s.id === preselectSaleId ? ' selected' : '') + '>' + UI.esc(x.s.id + ' · ' + x.c.name + ' · bal. ' + UI.numberShort(Store.saleBalance(x.s.id))) + '</option>').join('');
    const selectedId = preselectSaleId || openSales[0].s.id;
    const todayISO = Store.iso(Store.today());

    const m = UI.modal({
      title: 'Record payment',
      subtitle: 'Simulated transaction — no real money is moved',
      size: 'lg',
      body: '<form id="payForm" novalidate>' +
        '<div class="form-grid">' +
          '<div class="field full" data-field="saleId"><label>Customer account <span class="req">*</span></label><select class="select" name="saleId" id="paySale">' + options + '</select><span class="error-msg">Select an account.</span></div>' +
        '</div>' +
        '<div class="balance-box" style="margin-top:14px;display:block" id="payInfo"></div>' +
        '<div class="form-grid" style="margin-top:16px">' +
          '<div class="field" data-field="amount"><label>Payment amount (TZS) <span class="req">*</span></label><input class="input" type="number" name="amount" id="payAmount" min="1" step="1000" placeholder="e.g. 1500000" /><span class="error-msg">Enter an amount within the outstanding balance.</span>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button type="button" class="chip" data-quick="next">Next installment</button><button type="button" class="chip" data-quick="half">Half balance</button><button type="button" class="chip" data-quick="full">Full balance</button></div>' +
          '</div>' +
          '<div class="field" data-field="date"><label>Payment date <span class="req">*</span></label><input class="input" type="date" name="date" value="' + todayISO + '" max="' + todayISO + '" /><span class="error-msg">Select a valid payment date.</span></div>' +
          '<div class="field full"><label>Payment method <span class="req">*</span></label><div class="pay-method-grid">' +
            METHODS.map((meth, i) => '<label class="pay-method ' + (i === 0 ? 'selected' : '') + '"><input type="radio" name="method" value="' + meth + '" ' + (i === 0 ? 'checked' : '') + ' /><span class="icon">' + Icons.get(UI.methodMeta(meth).icon) + '</span>' + meth + '</label>').join('') +
          '</div></div>' +
          '<div class="field full"><label>Transaction reference</label><input class="input" name="txnRef" id="payTxn" placeholder="Auto-generated if left blank" /><span class="hint" id="payTxnHint">Mobile money reference, bank slip or cheque number. Leave blank to auto-generate a demo reference.</span></div>' +
          '<div class="field full"><label>Notes</label><textarea class="textarea" name="notes" placeholder="Optional notes for this payment…" style="min-height:70px"></textarea></div>' +
        '</div>' +
        '<div class="notice info" style="margin-top:16px">' + Icons.get('info') + '<div>Recording this payment will update the customer balance, payment history, installment progress and generate a receipt. This is a frontend simulation only.</div></div>' +
      '</form>',
      footer: '<button class="btn btn-outline" data-x="cancel">Cancel</button><button class="btn btn-primary" type="submit" form="payForm">' + Icons.get('check') + 'Record payment</button>',
      onMount(el, close) {
        const form = $('#payForm', el);
        const saleSel = $('#paySale', el);
        const amountInput = $('#payAmount', el);

        function currentInfo() {
          const s = Store.sale(saleSel.value);
          const c = Store.customer(s.customerId);
          const plot = Store.plot(s.plotId);
          const plan = Store.planBySale(s.id);
          const st = plan ? Store.planStats(plan) : null;
          const balance = Store.saleBalance(s.id);
          $('#payInfo', el).innerHTML = '<div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:10px">' +
            '<div><div class="k">Customer</div><div class="strong">' + UI.esc(c.name) + '</div><div class="small muted">' + UI.esc(c.phone) + '</div></div>' +
            '<div><div class="k">Agreement / plot</div><div class="strong">' + UI.esc(s.id) + '</div><div class="small muted">' + UI.esc(plot.plotNo) + ' · ' + UI.esc(Store.project(s.projectId).name) + '</div></div>' +
            '<div><div class="k">Outstanding balance</div><div class="v">' + UI.money(balance) + '</div><div class="small muted">' + (st && st.next ? 'Next: #' + st.next.n + ' due ' + UI.date(st.next.dueDate) : 'No schedule') + '</div></div>' +
            '</div>';
          return { s, balance, st };
        }

        function refresh() { currentInfo(); }

        saleSel.addEventListener('change', () => { refresh(); amountInput.value = ''; });
        $$('.pay-method', el).forEach(lbl => lbl.addEventListener('click', () => {
          $$('.pay-method', el).forEach(x => x.classList.remove('selected'));
          lbl.classList.add('selected');
          const meth = lbl.querySelector('input').value;
          const hint = meth === 'Cash' ? 'Cash payments still require a receipt reference in this demo.' : meth === 'Cheque' ? 'Enter the cheque number.' : 'Leave blank to auto-generate a demo reference.';
          $('#payTxnHint', el).textContent = hint;
        }));
        $$('[data-quick]', el).forEach(b => b.addEventListener('click', () => {
          const info = currentInfo();
          if (b.getAttribute('data-quick') === 'full') amountInput.value = info.balance;
          if (b.getAttribute('data-quick') === 'half') amountInput.value = Math.round(info.balance / 2 / 1000) * 1000;
          if (b.getAttribute('data-quick') === 'next') amountInput.value = info.st && info.st.next ? (info.st.next.amount - info.st.next.paid) : info.balance;
          amountInput.focus();
        }));
        $('[data-x="cancel"]', el).addEventListener('click', close);
        refresh();

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const info = currentInfo();
          const amount = Number(amountInput.value);
          let ok = UI.validate(form, [
            { name: 'saleId', required: true, msg: 'Select an account.' },
            { name: 'date', required: true, msg: 'Select a payment date.' }
          ]);
          if (!(amount > 0)) { UI.fieldError(amountInput, 'Enter an amount greater than zero.'); ok = false; }
          else if (amount > info.balance + 1) { UI.fieldError(amountInput, 'Payment exceeds the balance of ' + UI.money(info.balance) + '.'); ok = false; }
          if (form.elements.date.value > Store.iso(Store.today())) { UI.fieldError(form.elements.date, 'Payment date cannot be in the future.'); ok = false; }
          if (!ok) return;
          const data = UI.readForm(form);
          data.amount = amount;
          try {
            const payment = Store.recordPayment(data);
            close();
            App.refresh();
            UI.showReceipt(payment);
            UI.toast('Payment recorded. Receipt ' + payment.receiptNo + ' generated.');
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        });
      }
    });
    return m;
  }

  V.payments = {
    render() {
      const all = Store.db.payments.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.receiptNo < b.receiptNo ? 1 : -1)));
      const filtered = all.filter(p => inPeriod(p.date));
      const today = Store.iso(Store.today());
      const month = new Date().getMonth();
      const collected = all.reduce((s, p) => s + p.amount, 0);
      const monthTotal = all.filter(p => new Date(p.date + 'T00:00:00').getMonth() === month).reduce((s, p) => s + p.amount, 0);
      const todayTotal = all.filter(p => p.date === today).reduce((s, p) => s + p.amount, 0);
      const methodTotals = {};
      all.forEach(p => { methodTotals[p.method] = (methodTotals[p.method] || 0) + p.amount; });

      return '<div class="page">' +
        '<div class="page-head-row"><div><h2>Payment management</h2><div class="sub">Record payments, update balances and generate receipts. Supported methods: mobile money, bank transfer, cash and cheque.</div></div>' +
          '<div class="page-actions">' + (App.can('paymentWrite') ? '<button class="btn btn-primary" data-act="record">' + Icons.get('plus') + 'Record payment</button>' : '<span class="chip">' + Icons.get('lock') + 'Read-only access</span>') + '</div></div>' +
        '<div class="mini-stats">' +
          '<div class="mini-stat"><div class="ms-icon green">' + Icons.get('payments') + '</div><div><div class="k">Total collected</div><div class="v">' + UI.moneyShort(collected) + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon blue">' + Icons.get('calendar') + '</div><div><div class="k">This month</div><div class="v">' + UI.moneyShort(monthTotal) + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon amber">' + Icons.get('clock') + '</div><div><div class="k">Today</div><div class="v">' + UI.moneyShort(todayTotal) + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon">' + Icons.get('receipt') + '</div><div><div class="k">Transactions</div><div class="v">' + all.length + '</div></div></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="filter-bar">' +
            '<div class="field-inline" style="width:270px"><span data-x>' + Icons.get('search') + '</span><input class="input search-input" id="paySearch" placeholder="Search receipt, customer, reference…" /></div>' +
            '<select class="select" id="payMethod">' + UI.options([{ value: 'all', label: 'All methods' }].concat(METHODS.map(x => ({ value: x, label: x }))), state.method) + '</select>' +
            '<select class="select" id="payProject"><option value="all">All projects</option>' + Store.db.projects.map(p => '<option value="' + p.id + '">' + UI.esc(p.name) + '</option>').join('') + '</select>' +
            '<select class="select" id="payPeriod">' + UI.options([{ value: 'all', label: 'All time' }, { value: 'today', label: 'Today' }, { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: 'month', label: 'This month' }], state.period) + '</select>' +
            '<div class="spacer"></div><span class="filter-count" id="payCount"></span>' +
          '</div>' +
          '<div class="table-wrap"><table class="data" id="payTable"><thead><tr><th>Receipt</th><th>Date</th><th>Customer</th><th>Agreement / plot</th><th>Method</th><th>Reference</th><th class="num">Amount</th><th>Recorded by</th><th></th></tr></thead><tbody>' +
            filtered.map(paymentRow).join('') + '</tbody></table></div>' +
          '<div class="table-foot"><span id="payFoot"></span><span class="muted small">Simulated transactions · receipts are printable demo documents.</span></div>' +
        '</div>' +
        '<div class="grid grid-2" style="margin-top:18px">' +
          '<div class="card"><div class="card-head"><div><h3>Collections by method</h3><div class="sub">All recorded payments</div></div></div><div class="card-body" id="methodChart"></div></div>' +
          '<div class="card"><div class="card-head"><div><h3>Reconciliation note</h3></div></div><div class="card-body"><div class="notice warn">' + Icons.get('alert') + '<div><strong>Demo environment.</strong> No real financial transactions are processed. Payment references, mobile money confirmations and bank settlements are fictional. Do not use this data for real reconciliation.</div></div>' +
            '<div class="notice" style="margin-top:12px">' + Icons.get('info') + '<div>Approval, correction and reversal workflows are <strong>not defined</strong> in the PRD and are intentionally not implemented.</div></div></div></div>' +
        '</div>' +
      '</div>';
    },

    mount(el) {
      const add = $('[data-act="record"]', el);
      if (add) add.addEventListener('click', () => openRecord());

      const search = $('#paySearch', el);
      const methodSel = $('#payMethod', el);
      const projectSel = $('#payProject', el);
      const periodSel = $('#payPeriod', el);

      function apply() {
        state.q = search.value; state.method = methodSel.value; state.project = projectSel.value; state.period = periodSel.value;
        const rows = $$('#payTable tbody tr', el);
        let visible = 0;
        rows.forEach(r => {
          let show = true;
          if (state.method !== 'all' && r.getAttribute('data-method') !== state.method) show = false;
          if (show && state.project !== 'all' && r.getAttribute('data-project') !== state.project) show = false;
          if (show && state.q && !(r.getAttribute('data-search') || '').includes(state.q.toLowerCase())) show = false;
          r.style.display = show ? '' : 'none';
          if (show) visible++;
        });
        $('#payCount', el).textContent = visible + ' results';
        $('#payFoot', el).textContent = 'Showing ' + visible + ' payment' + (visible === 1 ? '' : 's') + (state.period !== 'all' ? ' in the selected period' : '');
        const empty = $('#payEmpty', el);
        if (!visible && !empty) {
          const tb = $('#payTable tbody', el);
          tb.insertAdjacentHTML('beforeend', '<tr id="payEmpty"><td colspan="9">' + UI.emptyState('receipt', 'No payments match', 'Try a different search or filter.') + '</td></tr>');
        } else if (visible && empty) empty.remove();
      }
      if (search) {
        search.addEventListener('input', UI.debounce(apply, 140));
        methodSel.addEventListener('change', apply);
        projectSel.addEventListener('change', apply);
        periodSel.addEventListener('change', apply);
        apply();
      }

      el.addEventListener('click', (e) => {
        const rc = e.target.closest('[data-receipt]');
        if (rc) {
          e.stopPropagation();
          const p = Store.db.payments.find(x => x.id === rc.getAttribute('data-receipt'));
          if (p) UI.showReceipt(p);
          return;
        }
        const row = e.target.closest('tr[data-payment]');
        if (row) {
          const p = Store.db.payments.find(x => x.id === row.getAttribute('data-payment'));
          if (p) UI.showReceipt(p);
        }
      });

      const methodTotals = {};
      Store.db.payments.forEach(p => { methodTotals[p.method] = (methodTotals[p.method] || 0) + p.amount; });
      const methodSegs = METHODS.map((mth, i) => ({ label: mth, value: methodTotals[mth] || 0, color: ['#16A34A', '#2563EB', '#DC2626', '#6B7280', '#F59E0B', '#7C3AED'][i] })).filter(s => s.value > 0);
      UI.donutChart($('#methodChart', el), {
        centerValue: UI.moneyShort(methodSegs.reduce((s, x) => s + x.value, 0)),
        centerLabel: 'collected',
        format: UI.moneyShort,
        segments: methodSegs
      });
    },

    openRecord
  };

  global.PaymentsView = { openRecord };
})(window);
