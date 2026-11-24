/* Ardhi LIMS — Sales management */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;
  const $$ = UI.$$;

  const state = { tab: 'all', q: '', project: 'all' };
  const AGENTS = ['Juma Kalinga', 'Agnes Temba', 'Kelvin Mwaipopo', 'Baraka Mwaki'];
  const roundTo = (n, s) => Math.round(n / s) * s;

  function saleRow(s) {
    const c = Store.customer(s.customerId);
    const plot = Store.plot(s.plotId);
    const prj = Store.project(s.projectId);
    const paid = Store.salePaid(s.id);
    const balance = Store.saleBalance(s.id);
    const pct = s.price ? Math.round(paid / s.price * 100) : 0;
    return '<tr class="clickable" data-sale="' + s.id + '" data-status="' + s.status + '" data-project="' + s.projectId + '" data-search="' + UI.esc((s.id + ' ' + s.ref + ' ' + (c ? c.name : '') + ' ' + (prj ? prj.name : '') + ' ' + (plot ? plot.plotNo : '') + ' ' + s.agent).toLowerCase()) + '">' +
      '<td><span class="t-main mono">' + UI.esc(s.ref) + '</span><div class="t-sub">' + UI.esc(s.id) + ' · ' + UI.date(s.saleDate) + '</div></td>' +
      '<td><div class="cell-user">' + UI.avatar(c ? c.name : '—', 'sm') + '<div><div class="nm">' + UI.esc(c ? c.name : '—') + '</div><div class="sub">' + UI.esc(c ? c.phone : '') + '</div></div></div></td>' +
      '<td><div class="t-main">' + UI.esc(plot ? plot.plotNo : '—') + '</div><div class="t-sub">' + UI.esc(prj ? prj.name : '') + '</div></td>' +
      '<td class="num strong">' + UI.money(s.price) + '</td>' +
      '<td style="min-width:150px"><div class="ratio-cell">' + UI.donut(pct, '', 32, false) + '<span class="ratio-meta">' + UI.moneyShort(paid) + ' paid<span class="ratio-pct">' + pct + '%</span></span></div></td>' +
      '<td class="num">' + (balance > 0 ? '<span class="tone-amber strong">' + UI.moneyShort(balance) + '</span>' : '<span class="badge green no-dot">Settled</span>') + '</td>' +
      '<td>' + UI.esc(s.agent) + '</td>' +
      '<td>' + UI.badge(s.status) + '</td>' +
      '<td><div class="actions"><button class="icon-btn" style="width:30px;height:30px" data-view-sale="' + s.id + '" aria-label="View sale">' + Icons.get('eye') + '</button></div></td>' +
    '</tr>';
  }

  /* ---------------- new sale ---------------- */
  function openNewSale() {
    if (!App.can('saleWrite')) { UI.toast('Your access profile cannot record sales.', 'warn'); return; }
    const customers = Store.db.customers.slice().sort((a, b) => a.name.localeCompare(b.name));
    const projects = Store.db.projects;
    const todayISO = Store.iso(Store.today());
    const m = UI.modal({
      title: 'Record new sale',
      subtitle: 'Link the customer, plot, purchase agreement and installment arrangement',
      size: 'xl',
      body: '<form id="saleForm" novalidate>' +
        '<div class="form-section"><div class="form-section-title">' + Icons.get('user') + 'Customer</div>' +
          '<div class="form-grid">' +
            '<div class="field full" data-field="customerId"><label>Customer <span class="req">*</span></label><select class="select" name="customerId">' + UI.options(customers.map(c => ({ value: c.id, label: c.name + ' · ' + c.phone })), '') + '</select><span class="error-msg">Select the customer for this sale.</span><span class="hint">Customer not registered yet? <button type="button" class="btn-link" data-act="go-customers">Register a customer first</button>.</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="form-section"><div class="form-section-title">' + Icons.get('land') + 'Land purchase</div>' +
          '<div class="form-grid">' +
            '<div class="field" data-field="projectId"><label>Project <span class="req">*</span></label><select class="select" name="projectId" id="saleProject">' + UI.options(projects.map(p => ({ value: p.id, label: p.name })), projects[0] ? projects[0].id : '') + '</select><span class="error-msg">Select a project.</span></div>' +
            '<div class="field" data-field="plotId"><label>Available plot <span class="req">*</span></label><select class="select" name="plotId" id="salePlot"></select><span class="error-msg">Select an available plot.</span></div>' +
            '<div class="field full" id="plotInfo" style="display:none"><div class="balance-box"><div style="flex:1"><div class="k">Plot details</div><div class="small strong" id="plotInfoText">—</div></div></div></div>' +
            '<div class="field" data-field="price"><label>Agreed selling price (TZS) <span class="req">*</span></label><input class="input" type="number" name="price" id="salePrice" min="0" step="50000" /><span class="error-msg">Enter a valid selling price.</span></div>' +
            '<div class="field" data-field="deposit"><label>Initial deposit (TZS) <span class="req">*</span></label><input class="input" type="number" name="deposit" id="saleDeposit" min="0" step="50000" /><span class="error-msg">Deposit must be between 0 and the selling price.</span></div>' +
            '<div class="field"><label>Deposit payment method</label><select class="select" name="depositMethod">' + UI.options(['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Bank Transfer', 'Cash', 'Cheque'], 'Bank Transfer') + '</select></div>' +
            '<div class="field" data-field="saleDate"><label>Purchase date <span class="req">*</span></label><input class="input" type="date" name="saleDate" value="' + todayISO + '" /><span class="error-msg">Select the purchase date.</span></div>' +
            '<div class="field" data-field="agent"><label>Sales agent <span class="req">*</span></label><select class="select" name="agent">' + UI.options(AGENTS.concat([App.user().name]).filter((v, i, a) => a.indexOf(v) === i).map(a => ({ value: a, label: a })), AGENTS[0]) + '</select><span class="error-msg">Select the sales agent.</span></div>' +
            '<div class="field" data-field="contractRef"><label>Agreement / contract reference</label><input class="input" name="contractRef" placeholder="Auto-generated if left blank" /><span class="error-msg">Check the contract reference.</span></div>' +
            '<div class="field full"><label>Purchase agreement document</label><div class="upload-drop" id="contractDrop" style="padding:14px">' + Icons.get('upload') + '<div class="t">Attach signed agreement (PDF)</div><div class="s">Optional · filename is recorded in the demo</div></div><input type="file" id="contractFile" accept=".pdf,image/*" class="hidden" /><div class="hint" id="contractName" style="margin-top:6px"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="form-section"><div class="form-section-title">' + Icons.get('installments') + 'Installment arrangement</div>' +
          '<div id="planWrap">' +
            '<div class="form-grid">' +
              '<div class="field full"><label>Plan type</label><div class="radio-row" style="grid-template-columns:1fr 1fr;display:grid">' +
                '<label class="radio-card selected"><input type="radio" name="planType" value="Fixed" checked /><span><span class="t">Fixed plan</span><span class="s">6, 12, 18 or 24 months</span></span></label>' +
                '<label class="radio-card"><input type="radio" name="planType" value="Flexible" /><span><span class="t">Flexible plan</span><span class="s">Individually agreed schedule</span></span></label>' +
              '</div></div>' +
              '<div class="field full" id="termField"><label>Company plan term</label><div class="btn-group" id="termGroup">' + [6, 12, 18, 24].map(t => '<button type="button" data-term="' + t + '" ' + (t === 12 ? 'class="on"' : '') + '>' + t + ' months</button>').join('') + '</div><input type="hidden" name="term" value="12" /></div>' +
              '<div class="field" id="countField" style="display:none"><label>Number of installments <span class="req">*</span></label><input class="input" type="number" name="count" min="2" max="120" value="10" /><span class="error-msg">Enter between 2 and 120 installments.</span></div>' +
              '<div class="field"><label>Payment frequency</label><select class="select" name="frequency" id="freqSelect">' + UI.options([{ value: 'Monthly', label: 'Monthly' }, { value: 'Weekly', label: 'Weekly' }], 'Monthly') + '</select></div>' +
            '</div>' +
            '<div class="balance-box" style="margin-top:14px;display:block" id="planSummary"></div>' +
          '</div>' +
        '</div>' +
        '<div class="form-section"><div class="form-section-title">' + Icons.get('file') + 'Notes</div>' +
          '<textarea class="textarea" name="notes" placeholder="Optional notes for this sale…"></textarea>' +
        '</div>' +
      '</form>',
      footer: '<button class="btn btn-outline" data-x="cancel">Cancel</button><button class="btn btn-primary" type="submit" form="saleForm">' + Icons.get('check') + 'Record sale</button>',
      onMount(el, close) {
        const form = $('#saleForm', el);
        const projectSel = $('#saleProject', el);
        const plotSel = $('#salePlot', el);
        const priceInput = $('#salePrice', el);
        const depositInput = $('#saleDeposit', el);
        const summary = $('#planSummary', el);
        const planWrap = $('#planWrap', el);
        let docName = '';

        function plotOptions() {
          const pid = projectSel.value;
          const plots = Store.db.plots.filter(p => p.projectId === pid && p.status === 'Available');
          plotSel.innerHTML = plots.length ? plots.map(p => '<option value="' + p.id + '" data-price="' + p.price + '" data-size="' + p.size + '" data-use="' + UI.esc(p.use) + '" data-loc="' + p.locationClass + '">' + UI.esc(p.plotNo) + ' · ' + p.size + ' sqm · ' + UI.money(p.price) + '</option>').join('') : '<option value="">No available plots in this project</option>';
          onPlotChange();
        }

        function onPlotChange() {
          const opt = plotSel.options[plotSel.selectedIndex];
          const price = opt ? Number(opt.getAttribute('data-price')) : 0;
          const info = $('#plotInfo', el);
          if (!plotSel.value) { info.style.display = 'none'; priceInput.value = ''; updateSummary(); return; }
          info.style.display = '';
          $('#plotInfoText', el).textContent = opt.getAttribute('data-use') + ' · ' + opt.getAttribute('data-size') + ' sqm · ' + opt.getAttribute('data-loc') + ' classification · ' + UI.money(price);
          priceInput.value = price;
          depositInput.value = roundTo(price * 0.3, 100000);
          updateSummary();
        }

        function planType() { return form.elements.planType.value; }
        function termValue() { return Number(form.elements.term.value); }
        function countValue() {
          if (planType() === 'Fixed') {
            const months = termValue();
            return form.elements.frequency.value === 'Weekly' ? Math.round(months * 4.33) : months;
          }
          return Math.max(1, Number(form.elements.count.value) || 0);
        }

        function updateSummary() {
          const price = Number(priceInput.value) || 0;
          const deposit = Number(depositInput.value) || 0;
          const balance = Math.max(0, price - deposit);
          if (!price || deposit >= price) {
            planWrap.style.opacity = '0.55';
            planWrap.style.pointerEvents = 'none';
            summary.innerHTML = '<div class="k">Plan summary</div><div class="small" style="margin-top:4px">Deposit covers the full price — no installment schedule will be created and the plot will be marked <strong>Sold</strong>.</div>';
            return;
          }
          planWrap.style.opacity = '';
          planWrap.style.pointerEvents = '';
          const count = countValue();
          const freq = form.elements.frequency.value;
          const per = count ? Math.floor(balance / count / 1000) * 1000 : 0;
          const first = Store.iso(freq === 'Weekly' ? Store.addDays(new Date(form.elements.saleDate.value + 'T00:00:00'), 7) : Store.addMonths(new Date(form.elements.saleDate.value + 'T00:00:00'), 1));
          const last = Store.iso(freq === 'Weekly' ? Store.addDays(new Date(form.elements.saleDate.value + 'T00:00:00'), count * 7) : Store.addMonths(new Date(form.elements.saleDate.value + 'T00:00:00'), count));
          summary.innerHTML = '<div class="k">Plan summary</div>' +
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:8px">' +
              '<div><div class="small muted">Balance financed</div><div class="strong">' + UI.money(balance) + '</div></div>' +
              '<div><div class="small muted">Installments</div><div class="strong">' + count + ' · ' + freq.toLowerCase() + '</div></div>' +
              '<div><div class="small muted">Approx. per installment</div><div class="strong">' + UI.money(per) + '</div></div>' +
              '<div><div class="small muted">First due</div><div class="strong">' + UI.date(first) + '</div></div>' +
            '</div>' +
            '<div class="small muted" style="margin-top:8px">Final installment adjusts the rounding difference. Estimated completion: ' + UI.date(last) + '.</div>';
        }

        projectSel.addEventListener('change', plotOptions);
        plotSel.addEventListener('change', onPlotChange);
        priceInput.addEventListener('input', updateSummary);
        depositInput.addEventListener('input', updateSummary);
        form.elements.frequency.addEventListener('change', updateSummary);
        form.elements.count.addEventListener('input', updateSummary);
        form.elements.saleDate.addEventListener('change', updateSummary);

        $$('input[name="planType"]', el).forEach(r => r.addEventListener('change', () => {
          $$('.radio-card', el).forEach(rc => rc.classList.toggle('selected', rc.querySelector('input').checked));
          $('#termField', el).style.display = planType() === 'Fixed' ? '' : 'none';
          $('#countField', el).style.display = planType() === 'Flexible' ? '' : 'none';
          updateSummary();
        }));
        $$('#termGroup button', el).forEach(b => b.addEventListener('click', () => {
          $$('#termGroup button', el).forEach(x => x.classList.remove('on'));
          b.classList.add('on');
          form.elements.term.value = b.getAttribute('data-term');
          updateSummary();
        }));

        const drop = $('#contractDrop', el);
        const fileInput = $('#contractFile', el);
        drop.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
          const f = fileInput.files[0];
          if (!f) return;
          docName = f.name;
          $('#contractName', el).innerHTML = Icons.get('check-circle') + ' ' + UI.esc(f.name) + ' <span class="muted">(' + (f.size / 1024).toFixed(0) + ' KB) — filename recorded</span>';
        });

        const goto = $('[data-act="go-customers"]', el);
        if (goto) goto.addEventListener('click', () => { close(); App.go('/customers'); });

        $('[data-x="cancel"]', el).addEventListener('click', close);

        plotOptions();
        updateSummary();

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const price = Number(priceInput.value);
          const deposit = Number(depositInput.value);
          let ok = UI.validate(form, [
            { name: 'customerId', required: true, msg: 'Select a customer.' },
            { name: 'plotId', required: true, msg: 'Select an available plot.' },
            { name: 'saleDate', required: true, msg: 'Select a purchase date.' }
          ]);
          if (!plotSel.value) { UI.fieldError(plotSel, 'Select an available plot.'); ok = false; }
          if (!(price > 0)) { UI.fieldError(priceInput, 'Enter a valid selling price.'); ok = false; }
          if (!(deposit >= 0) || deposit > price) { UI.fieldError(depositInput, 'Deposit must be between 0 and the selling price.'); ok = false; }
          const planCfg = (deposit < price) ? { type: planType(), frequency: form.elements.frequency.value, count: countValue() } : null;
          if (planCfg && !(planCfg.count >= 2 && planCfg.count <= 120)) {
            if (planType() === 'Flexible') UI.fieldError(form.elements.count, 'Enter between 2 and 120 installments.');
            ok = false;
          }
          if (!ok) return;

          const data = UI.readForm(form);
          data.price = price;
          data.deposit = deposit;
          data.plan = planCfg;
          data.docName = docName;
          try {
            const res = Store.recordSale(data);
            close();
            App.refresh();
            UI.toast('Sale ' + res.sale.id + ' recorded for plot ' + Store.plot(res.sale.plotId).plotNo + '. Deposit receipt generated.');
            saleModal(res.sale);
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        });
      }
    });
    return m;
  }

  /* ---------------- sale detail ---------------- */
  function saleModal(s) {
    if (!s) return;
    const c = Store.customer(s.customerId);
    const plot = Store.plot(s.plotId);
    const prj = Store.project(s.projectId);
    const plan = Store.planBySale(s.id);
    const paid = Store.salePaid(s.id);
    const balance = Store.saleBalance(s.id);
    const pct = s.price ? Math.round(paid / s.price * 100) : 0;
    const payments = Store.paymentsForSale(s.id).sort((a, b) => (a.date < b.date ? 1 : -1));
    const st = plan ? Store.planStats(plan) : null;

    const m = UI.modal({
      title: s.ref,
      subtitle: s.id + ' · purchase agreement · ' + UI.date(s.saleDate),
      size: 'xl',
      body: '<div style="display:grid;gap:18px">' +
        '<div class="kv-cards">' +
          '<div class="item"><div class="k">Selling price</div><div class="v">' + UI.money(s.price) + '</div></div>' +
          '<div class="item"><div class="k">Paid to date</div><div class="v">' + UI.money(paid) + '</div></div>' +
          '<div class="item"><div class="k">Outstanding</div><div class="v" style="color:' + (balance > 0 ? 'var(--amber)' : 'var(--green-600)') + '">' + UI.money(balance) + '</div></div>' +
          '<div class="item"><div class="k">Status</div><div class="v">' + UI.badge(s.status) + '</div></div>' +
        '</div>' +
        '<div class="compo"><div class="compo-head"><span>Payment progress</span><strong>' + pct + '% paid</strong></div>' +
          '<div class="status-chart">' +
          UI.partsDonut([
            { value: paid, color: 'var(--green)' },
            { value: Math.max(0, s.price - paid), color: '#D6DAD4' }
          ], 104, pct + '%', 'paid', 'Paid ' + UI.money(paid) + ', outstanding ' + UI.money(Math.max(0, s.price - paid))) +
          '<div class="status-legend">' +
            '<div class="sl-row"><span class="lg-inline"><i class="paid"></i>Paid to date</span><strong>' + UI.money(paid) + '</strong></div>' +
            '<div class="sl-row"><span class="lg-inline"><i class="out"></i>Outstanding</span><strong style="color:' + (balance > 0 ? 'var(--amber)' : 'inherit') + '">' + UI.money(Math.max(0, s.price - paid)) + '</strong></div>' +
          '</div></div>' +
        '</div>' +
        '<div class="split-2" style="gap:22px">' +
          '<div><div class="panel-title">Customer</div><dl class="kv">' +
            '<dt>Name</dt><dd>' + UI.esc(c ? c.name : '—') + '</dd><dt>Phone</dt><dd>' + UI.esc(c ? c.phone : '—') + '</dd><dt>NIDA</dt><dd class="mono">' + UI.esc(c ? c.nida : '—') + '</dd><dt>Email</dt><dd>' + UI.esc(c ? c.email : '—') + '</dd>' +
          '</dl></div>' +
          '<div><div class="panel-title">Property</div><dl class="kv">' +
            '<dt>Project</dt><dd>' + UI.esc(prj ? prj.name : '—') + '</dd><dt>Plot</dt><dd>' + UI.esc(plot ? plot.plotNo : '—') + ' · ' + (plot ? plot.size : '') + ' sqm</dd><dt>Intended use</dt><dd>' + UI.esc(plot ? plot.use : '—') + '</dd><dt>Sales agent</dt><dd>' + UI.esc(s.agent) + '</dd>' +
          '</dl></div>' +
        '</div>' +
        '<div class="split-2" style="gap:22px">' +
          '<div><div class="panel-title">Agreement & documents</div><dl class="kv">' +
            '<dt>Contract ref.</dt><dd class="mono">' + UI.esc(s.ref) + '</dd>' +
            '<dt>Deposit</dt><dd>' + UI.money(s.deposit) + '</dd>' +
            '<dt>Document</dt><dd>' + (s.document ? UI.esc(s.document.name) + ' <span class="muted small">(' + UI.esc(s.document.size) + ')</span>' : '—') + '</dd>' +
            '<dt>Purchase date</dt><dd>' + UI.date(s.saleDate) + '</dd>' +
          '</dl><button class="btn btn-outline btn-sm" style="margin-top:12px" data-x="download">' + Icons.get('download') + 'Download agreement (demo)</button></div>' +
          '<div><div class="panel-title">Installment plan</div>' +
            (plan ? '<dl class="kv">' +
              '<dt>Plan</dt><dd>' + UI.esc(plan.type) + ' · ' + plan.termMonths + ' months</dd>' +
              '<dt>Frequency</dt><dd>' + plan.frequency + '</dd>' +
              '<dt>Installments</dt><dd>' + plan.entries.length + ' (' + st.paid + ' paid · ' + (st.overdue ? st.overdue + ' overdue' : 'none overdue') + ')</dd>' +
              '<dt>Next due</dt><dd>' + (st.next ? UI.date(st.next.dueDate) + ' · ' + UI.money(st.next.amount - st.next.paid) : 'All settled') + '</dd>' +
            '</dl><button class="btn btn-outline btn-sm" style="margin-top:12px" data-x="plan">' + Icons.get('installments') + 'Open installment details</button>'
            : '<div class="notice">' + Icons.get('info') + '<div>No installment plan. The sale is fully paid by the initial deposit.</div></div>') +
          '</div>' +
        '</div>' +
        '<div><div class="panel-title" style="margin-bottom:8px">Payments on this agreement</div>' +
          '<div class="table-wrap" style="border:1px solid var(--line);border-radius:12px;max-height:220px;overflow:auto"><table class="data"><thead><tr><th>Receipt</th><th>Date</th><th>Type</th><th>Method</th><th class="num">Amount</th><th></th></tr></thead><tbody>' +
            payments.map(p => '<tr><td class="mono">' + UI.esc(p.receiptNo) + '</td><td>' + UI.date(p.date) + '</td><td>' + UI.esc(p.type) + '</td><td>' + UI.methodChip(p.method) + '</td><td class="num strong">' + UI.money(p.amount) + '</td><td><button class="btn btn-sm btn-ghost" data-receipt="' + p.id + '">Receipt</button></td></tr>').join('') +
          '</tbody></table></div>' +
        '</div>' +
        '<div class="notice">' + Icons.get('info') + '<div>This is a demonstration environment. Payments, receipts and documents are simulated and no real financial transaction is processed.</div></div>' +
      '</div>',
      footer: '<button class="btn btn-outline" data-x="close">Close</button>' +
        (balance > 0 && App.can('paymentWrite') ? '<button class="btn btn-primary" data-x="pay">' + Icons.get('payments') + 'Record payment</button>' : '')
    });
    $('[data-x="close"]', m.el).addEventListener('click', m.close);
    const payBtn = $('[data-x="pay"]', m.el);
    if (payBtn) payBtn.addEventListener('click', () => { m.close(); if (global.PaymentsView) global.PaymentsView.openRecord(s.id); else App.go('/payments'); });
    const planBtn = $('[data-x="plan"]', m.el);
    if (planBtn) planBtn.addEventListener('click', () => { m.close(); App.go('/installments/' + plan.id); });
    const dl = $('[data-x="download"]', m.el);
    if (dl) dl.addEventListener('click', () => downloadAgreement(s));
    $$('[data-receipt]', m.el).forEach(b => b.addEventListener('click', () => {
      const p = Store.db.payments.find(x => x.id === b.getAttribute('data-receipt'));
      if (p) UI.showReceipt(p);
    }));
  }

  function downloadAgreement(s) {
    const c = Store.customer(s.customerId);
    const plot = Store.plot(s.plotId);
    const prj = Store.project(s.projectId);
    const settings = Store.db.settings;
    const text = [
      settings.companyName.toUpperCase(),
      settings.companyAddress,
      '',
      'PLOT PURCHASE AGREEMENT (DEMO DOCUMENT)',
      'Agreement reference: ' + s.ref,
      'Sale record: ' + s.id,
      '',
      'CUSTOMER',
      'Name: ' + (c ? c.name : ''),
      'Phone: ' + (c ? c.phone : ''),
      'NIDA / Passport: ' + (c ? c.nida : ''),
      'Address: ' + (c ? c.address : ''),
      '',
      'PROPERTY',
      'Project: ' + (prj ? prj.name : ''),
      'Plot number: ' + (plot ? plot.plotNo : ''),
      'Plot size: ' + (plot ? plot.size : '') + ' sqm',
      'Intended use: ' + (plot ? plot.use : ''),
      '',
      'COMMERCIAL TERMS',
      'Agreed selling price: ' + UI.money(s.price),
      'Initial deposit: ' + UI.money(s.deposit),
      'Purchase date: ' + UI.date(s.saleDate),
      'Sales agent: ' + s.agent,
      '',
      'This is a fictional demonstration document generated by the Ardhi LIMS prototype.',
      'It is not a legally binding agreement.'
    ].join('\n');
    UI.download('Agreement_' + s.ref + '.txt', text);
    UI.toast('Demo purchase agreement generated.');
  }

  V.sales = {
    render() {
      const sales = Store.db.sales.slice().sort((a, b) => (a.saleDate < b.saleDate ? 1 : -1));
      const ongoing = sales.filter(s => s.status === 'Ongoing');
      const completed = sales.filter(s => s.status === 'Completed');
      const totalValue = sales.reduce((s, x) => s + x.price, 0);
      const filtered = state.tab === 'ongoing' ? ongoing : state.tab === 'completed' ? completed : sales;
      return '<div class="page">' +
        '<div class="page-head-row"><div><h2>Sales management</h2><div class="sub">Record plot purchases and connect customers, agreements and installment plans.</div></div>' +
          '<div class="page-actions">' + (App.can('saleWrite') ? '<button class="btn btn-primary" data-act="new-sale">' + Icons.get('plus') + 'Record new sale</button>' : '<span class="chip">' + Icons.get('lock') + 'Read-only access</span>') + '</div></div>' +
        '<div class="mini-stats">' +
          '<div class="mini-stat"><div class="ms-icon green">' + Icons.get('sales') + '</div><div><div class="k">Sales value</div><div class="v">' + UI.moneyShort(totalValue) + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon blue">' + Icons.get('clock') + '</div><div><div class="k">Ongoing sales</div><div class="v">' + ongoing.length + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon">' + Icons.get('check-circle') + '</div><div><div class="k">Completed sales</div><div class="v">' + completed.length + '</div></div></div>' +
          '<div class="mini-stat"><div class="ms-icon amber">' + Icons.get('receipt') + '</div><div><div class="k">Total agreements</div><div class="v">' + sales.length + '</div></div></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="tabs"><button class="tab ' + (state.tab === 'all' ? 'active' : '') + '" data-tab="all">All sales <span class="count">' + sales.length + '</span></button>' +
            '<button class="tab ' + (state.tab === 'ongoing' ? 'active' : '') + '" data-tab="ongoing">Ongoing <span class="count">' + ongoing.length + '</span></button>' +
            '<button class="tab ' + (state.tab === 'completed' ? 'active' : '') + '" data-tab="completed">Completed <span class="count">' + completed.length + '</span></button></div>' +
          '<div class="filter-bar">' +
            '<div class="field-inline" style="width:280px"><span data-x>' + Icons.get('search') + '</span><input class="input search-input" id="saleSearch" placeholder="Search agreement, customer, plot…" value="' + UI.esc(state.q) + '" /></div>' +
            '<select class="select" id="saleProject"><option value="all">All projects</option>' + Store.db.projects.map(p => '<option value="' + p.id + '">' + UI.esc(p.name) + '</option>').join('') + '</select>' +
            '<div class="spacer"></div><span class="filter-count" id="saleCount"></span>' +
          '</div>' +
          '<div class="table-wrap"><table class="data" id="saleTable"><thead><tr><th>Agreement</th><th>Customer</th><th>Project / plot</th><th class="num">Selling price</th><th>Paid</th><th class="num">Balance</th><th>Agent</th><th>Status</th><th></th></tr></thead><tbody>' +
            filtered.map(saleRow).join('') + '</tbody></table></div>' +
          '<div class="table-foot"><span id="saleFoot"></span><span class="muted small">Ongoing and completed sales are derived from the linked installment account.</span></div>' +
        '</div>' +
      '</div>';
    },

    mount(el) {
      $$('[data-tab]', el).forEach(b => b.addEventListener('click', () => { state.tab = b.getAttribute('data-tab'); App.refresh(); }));
      const add = $('[data-act="new-sale"]', el);
      if (add) add.addEventListener('click', openNewSale);

      const search = $('#saleSearch', el);
      const projectSel = $('#saleProject', el);
      if (search) {
        const apply = () => {
          state.q = search.value;
          state.project = projectSel.value;
          const rows = $$('#saleTable tbody tr', el);
          let visible = 0;
          rows.forEach(r => {
            let show = true;
            if (state.project !== 'all' && r.getAttribute('data-project') !== state.project) show = false;
            if (show && state.q && !(r.getAttribute('data-search') || '').includes(state.q.toLowerCase())) show = false;
            r.style.display = show ? '' : 'none';
            if (show) visible++;
          });
          $('#saleCount', el).textContent = visible + ' of ' + rows.length;
          $('#saleFoot', el).textContent = 'Showing ' + visible + ' of ' + rows.length + ' sales';
        };
        search.addEventListener('input', UI.debounce(apply, 140));
        projectSel.addEventListener('change', apply);
        apply();
      }

      el.addEventListener('click', (e) => {
        const v = e.target.closest('[data-view-sale]');
        if (v) { e.stopPropagation(); saleModal(Store.sale(v.getAttribute('data-view-sale'))); return; }
        const row = e.target.closest('tr[data-sale]');
        if (row) saleModal(Store.sale(row.getAttribute('data-sale')));
      });
    },

    openSale(id) {
      const s = Store.sale(id);
      if (s) saleModal(s);
    },
    openNewSale
  };

  global.SalesView = V.sales;
})(window);
