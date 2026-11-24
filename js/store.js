/* Ardhi LIMS — client-side store, simulated business operations and persistence */
(function (global) {
  'use strict';

  const DB_KEY = 'ardhi_lims_db';
  const SESSION_KEY = 'ardhi_lims_session';
  const PORTAL_KEY = 'ardhi_lims_portal_customer';
  const DEMO_PASSWORD = 'demo1234';

  let db = null;
  let storageAvailable = true;

  /* ---------- date helpers ---------- */
  const pad = (n, l) => String(n).padStart(l, '0');
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function today() { return startOfDay(new Date()); }
  function iso(d) { const x = new Date(d); return x.getFullYear() + '-' + pad(x.getMonth() + 1, 2) + '-' + pad(x.getDate(), 2); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) { const x = new Date(d); const day = x.getDate(); x.setMonth(x.getMonth() + n); if (x.getDate() !== day) x.setDate(0); return x; }
  function parseDate(s) { return new Date(s + 'T00:00:00'); }
  function daysBetween(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / 86400000); }

  /* ---------- persistence ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === global.SampleData.SEED_VERSION) { db = parsed; return; }
      }
    } catch (e) { storageAvailable = false; }
    db = global.SampleData.build();
    save();
  }

  function save() {
    if (!storageAvailable) return;
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch (e) { storageAvailable = false; }
  }

  function reset() {
    db = global.SampleData.build();
    save();
  }

  /* ---------- ids ---------- */
  function nextSeq(list, prefix, len) {
    let max = 0;
    list.forEach(item => {
      const m = String(item.id || '').match(/(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return prefix + '-' + pad(max + 1, len);
  }

  /* ---------- lookups ---------- */
  const project = (id) => db.projects.find(p => p.id === id);
  const plot = (id) => db.plots.find(p => p.id === id);
  const customer = (id) => db.customers.find(c => c.id === id);
  const sale = (id) => db.sales.find(s => s.id === id);
  const plan = (id) => db.plans.find(p => p.id === id);
  const planBySale = (saleId) => db.plans.find(p => p.saleId === saleId);
  const user = (id) => db.users.find(u => u.id === id);
  const paymentsForSale = (saleId) => db.payments.filter(p => p.saleId === saleId);
  const salesForCustomer = (customerId) => db.sales.filter(s => s.customerId === customerId);
  const plotsForProject = (projectId) => db.plots.filter(p => p.projectId === projectId);
  const notificationsForSale = (saleId) => db.notifications.filter(n => n.saleId === saleId);

  /* ---------- financial helpers ---------- */
  function salePaid(saleId) {
    return db.payments.filter(p => p.saleId === saleId).reduce((sum, p) => sum + p.amount, 0);
  }
  function saleBalance(saleId) {
    const s = sale(saleId);
    if (!s) return 0;
    return Math.max(0, s.price - salePaid(saleId));
  }
  function entryState(entry) {
    if (entry.paid >= entry.amount) return 'paid';
    if (parseDate(entry.dueDate) < today()) return 'overdue';
    if (entry.paid > 0) return 'partial';
    return 'pending';
  }
  function planStats(p) {
    const entries = p.entries || [];
    let paid = 0, overdue = 0, overdueAmount = 0, pending = 0, paidAmount = 0, scheduled = 0, next = null;
    entries.forEach(e => {
      scheduled += e.amount;
      paidAmount += Math.min(e.paid || 0, e.amount);
      const st = entryState(e);
      if (st === 'paid') paid += 1;
      else {
        if (st === 'overdue') { overdue += 1; overdueAmount += e.amount - (e.paid || 0); }
        else pending += 1;
        if (!next) next = e;
      }
    });
    const s = sale(p.saleId);
    const balance = s ? saleBalance(s.id) : 0;
    const pct = s && s.price ? Math.min(100, Math.round((s.price - balance) / s.price * 100)) : 0;
    return {
      entries: entries.length, paid, overdue, pending, overdueAmount, scheduled, paidAmount,
      balance, next, pct,
      completed: s ? balance <= 1 : false
    };
  }
  function planStatus(p) {
    const st = planStats(p);
    if (st.completed) return { key: 'completed', label: 'Completed', cls: 'green' };
    if (st.overdue > 0) return { key: 'overdue', label: 'Overdue', cls: 'red' };
    return { key: 'ontrack', label: 'On track', cls: 'blue' };
  }

  /* ---------- notifications & activity ---------- */
  function pushNotification(n) {
    db.notifications.unshift(Object.assign({
      id: nextSeq(db.notifications, 'NTF', 3),
      date: new Date().toISOString(),
      status: 'Unread',
      audience: 'customer'
    }, n));
    save();
  }
  function unreadInternalCount() {
    return db.notifications.filter(n => n.audience === 'internal' && n.status === 'Unread').length;
  }
  function notification(id) { return db.notifications.find(n => n.id === id); }
  function markNotificationRead(id) { const n = notification(id); if (n) { n.status = 'Read'; save(); } }
  function markAllInternalRead() {
    db.notifications.forEach(n => { if (n.audience === 'internal') n.status = 'Read'; });
    save();
  }
  function addActivity(userName, action, moduleName) {
    db.activity.unshift({ id: nextSeq(db.activity, 'ACT', 4), user: userName, action, module: moduleName, date: new Date().toISOString() });
    save();
  }

  /* ---------- customers ---------- */
  function addCustomer(data) {
    const id = nextSeq(db.customers, 'CUS', 3);
    const cust = {
      id, name: data.name.trim(), phone: data.phone.trim(), email: (data.email || '').trim(),
      address: (data.address || '').trim(), nida: (data.nida || '').trim(),
      kinName: (data.kinName || '').trim(), kinPhone: (data.kinPhone || '').trim(), kinRelation: data.kinRelation || '—',
      registeredAt: iso(today()), portal: true, status: 'Active'
    };
    db.customers.push(cust);
    pushNotification({
      audience: 'customer', kind: 'welcome', channel: 'SMS', title: 'Customer portal account created',
      message: 'Welcome ' + cust.name.split(' ')[0] + '. Your view-only customer portal account has been created automatically. Use your customer number ' + id + ' to sign in.',
      customerId: id, status: 'Sent'
    });
    addActivity(currentUser() ? currentUser().name : 'System', 'Registered customer ' + cust.name + ' (' + id + ')', 'Customers');
    save();
    return cust;
  }
  function updateCustomer(id, data) {
    const c = customer(id);
    if (!c) return null;
    ['name', 'phone', 'email', 'address', 'nida', 'kinName', 'kinPhone', 'kinRelation'].forEach(k => {
      if (data[k] !== undefined) c[k] = typeof data[k] === 'string' ? data[k].trim() : data[k];
    });
    addActivity(currentUser() ? currentUser().name : 'System', 'Updated customer details for ' + c.name, 'Customers');
    save();
    return c;
  }

  /* ---------- projects & plots ---------- */
  function addProject(data) {
    const id = nextSeq(db.projects, 'PRJ', 3);
    const p = {
      id, code: (data.code || '').toUpperCase().trim() || 'NEW', name: data.name.trim(),
      district: (data.district || '').trim(), region: (data.region || '').trim(),
      locationClass: data.locationClass || 'Urban',
      description: (data.description || '').trim(),
      createdAt: iso(today()),
      map: null
    };
    db.projects.push(p);
    addActivity(currentUser() ? currentUser().name : 'System', 'Created land project ' + p.name, 'Land Management');
    save();
    return p;
  }
  function updateProject(id, data) {
    const p = project(id);
    if (!p) return null;
    ['code', 'name', 'district', 'region', 'locationClass', 'description'].forEach(k => {
      if (data[k] !== undefined) p[k] = typeof data[k] === 'string' ? data[k].trim() : data[k];
    });
    addActivity(currentUser() ? currentUser().name : 'System', 'Updated project ' + p.name, 'Land Management');
    save();
    return p;
  }
  function setProjectMap(projectId, fileMeta) {
    const p = project(projectId);
    if (!p) return;
    p.map = Object.assign({ uploadedAt: iso(today()), uploadedBy: currentUser() ? currentUser().name : 'System', type: 'Physical map scan', note: 'Stored copy of the company physical map. Digitisation not confirmed.' }, fileMeta);
    addActivity(currentUser() ? currentUser().name : 'System', 'Attached physical map file to ' + p.name, 'Land Management');
    save();
  }
  function addPlot(data) {
    const id = nextSeq(db.plots, 'PLOT', 3);
    const p = {
      id, plotNo: data.plotNo.trim(), projectId: data.projectId,
      size: Number(data.size), price: Number(data.price),
      use: data.use, locationClass: data.locationClass,
      status: data.status || 'Available', saleId: null, createdAt: iso(today()), notes: (data.notes || '').trim()
    };
    db.plots.push(p);
    addActivity(currentUser() ? currentUser().name : 'System', 'Registered plot ' + p.plotNo, 'Land Management');
    save();
    return p;
  }
  function updatePlot(id, data) {
    const p = plot(id);
    if (!p) return null;
    ['plotNo', 'projectId', 'use', 'locationClass', 'status', 'notes'].forEach(k => { if (data[k] !== undefined) p[k] = data[k]; });
    if (data.size !== undefined) p.size = Number(data.size);
    if (data.price !== undefined) p.price = Number(data.price);
    addActivity(currentUser() ? currentUser().name : 'System', 'Updated plot ' + p.plotNo, 'Land Management');
    save();
    return p;
  }

  /* ---------- sales & plans ---------- */
  function buildSchedule(total, count, startDate, frequency) {
    const entries = [];
    const base = Math.floor(total / count / 1000) * 1000;
    let left = total;
    for (let n = 1; n <= count; n++) {
      let amt = n === count ? left : base;
      if (n === count && amt <= 0) amt = 0;
      left -= amt;
      entries.push({
        n, dueDate: iso(frequency === 'Weekly' ? addDays(parseDate(startDate), n * 7) : addMonths(parseDate(startDate), n)),
        amount: amt, paid: 0, paidDate: null
      });
    }
    return entries;
  }

  function recordSale(data) {
    const plotRec = plot(data.plotId);
    if (!plotRec || plotRec.status !== 'Available') throw new Error('Selected plot is no longer available.');
    const price = Number(data.price);
    const deposit = Number(data.deposit);
    if (!(price > 0)) throw new Error('Selling price must be greater than zero.');
    if (deposit < 0 || deposit > price) throw new Error('Deposit must be between zero and the selling price.');

    const saleId = 'SALE-' + new Date().getFullYear() + '-' + pad(db.sales.length + 1, 3);
    const contractRef = (data.contractRef || '').trim() || ('AGR-' + new Date().getFullYear() + '-' + pad(db.sales.length + 21, 3));

    const newSale = {
      id: saleId, ref: contractRef, customerId: data.customerId, projectId: data.projectId,
      plotId: data.plotId, price, deposit, saleDate: data.date || iso(today()),
      agent: data.agent, status: deposit >= price ? 'Completed' : 'Ongoing',
      planId: null,
      document: { name: data.docName || ('Sale_Agreement_' + saleId + '.pdf'), size: data.docSize || 'Draft', type: 'Purchase agreement' },
      notes: (data.notes || '').trim()
    };
    db.sales.push(newSale);

    /* deposit payment */
    const receiptSeq = db.payments.length + 1;
    const year = new Date().getFullYear();
    db.payments.push({
      id: 'PAY-' + year + '-' + pad(receiptSeq, 4),
      receiptNo: (db.settings.receiptPrefix || 'RCP') + '-' + year + '-' + pad(receiptSeq, 4),
      saleId, customerId: data.customerId, projectId: data.projectId,
      amount: deposit, date: newSale.saleDate,
      method: data.depositMethod || 'Bank Transfer',
      txnRef: data.depositRef || ('BT-' + pad(Math.floor(Math.random() * 900000 + 100000), 6)),
      type: 'Deposit', recordedBy: currentUser() ? currentUser().name : 'System',
      allocations: [], notes: 'Initial deposit at sale registration.'
    });

    let planRec = null;
    if (deposit < price && data.plan) {
      const count = Math.max(1, Number(data.plan.count));
      const frequency = data.plan.frequency === 'Weekly' ? 'Weekly' : 'Monthly';
      planRec = {
        id: nextSeq(db.plans, 'INS', 3),
        saleId, customerId: data.customerId,
        type: data.plan.type === 'Flexible' ? 'Flexible' : 'Fixed',
        termMonths: frequency === 'Weekly' ? Math.max(1, Math.round(count / 4.33)) : count,
        frequency, startDate: newSale.saleDate,
        entries: buildSchedule(price - deposit, count, newSale.saleDate, frequency),
        createdAt: iso(today())
      };
      db.plans.push(planRec);
      newSale.planId = planRec.id;
    }

    plotRec.status = deposit >= price ? 'Sold' : 'Installment';
    plotRec.saleId = saleId;

    pushNotification({
      audience: 'customer', kind: 'receipt', channel: 'SMS',
      title: 'Deposit receipt issued',
      message: 'Payment of TZS ' + deposit.toLocaleString('en-US') + ' for ' + saleId + ' has been recorded. Your customer portal has been updated.',
      customerId: data.customerId, saleId, amount: deposit
    });
    addActivity(currentUser() ? currentUser().name : 'System', 'Registered sale ' + saleId + ' — plot ' + plotRec.plotNo, 'Sales');
    save();
    return { sale: newSale, plan: planRec };
  }

  function recordPayment(data) {
    const s = sale(data.saleId);
    if (!s) throw new Error('Sale not found.');
    const amount = Number(data.amount);
    const balance = saleBalance(s.id);
    if (!(amount > 0)) throw new Error('Payment amount must be greater than zero.');
    if (amount > balance + 1) throw new Error('Payment exceeds the outstanding balance of TZS ' + balance.toLocaleString('en-US') + '.');

    const year = new Date().getFullYear();
    const seq = db.payments.length + 1;
    const payment = {
      id: 'PAY-' + year + '-' + pad(seq, 4),
      receiptNo: (db.settings.receiptPrefix || 'RCP') + '-' + year + '-' + pad(seq, 4),
      saleId: s.id, customerId: s.customerId, projectId: s.projectId,
      amount, date: data.date || iso(today()),
      method: data.method, txnRef: (data.txnRef || '').trim() || autoTxnRef(data.method),
      type: 'Installment', recordedBy: currentUser() ? currentUser().name : 'System',
      allocations: [], notes: (data.notes || '').trim()
    };

    /* allocate oldest unpaid installments first */
    const planRec = planBySale(s.id);
    if (planRec) {
      let remaining = amount;
      planRec.entries.forEach(e => {
        if (remaining <= 0) return;
        const due = e.amount - (e.paid || 0);
        if (due <= 0) return;
        const alloc = Math.min(due, remaining);
        e.paid = (e.paid || 0) + alloc;
        if (e.paid >= e.amount) e.paidDate = payment.date;
        remaining -= alloc;
        payment.allocations.push({ planId: planRec.id, n: e.n, amount: alloc });
      });
    }

    db.payments.push(payment);
    const newBalance = saleBalance(s.id);
    if (newBalance <= 1) {
      s.status = 'Completed';
      const p = plot(s.plotId); if (p) p.status = 'Sold';
    }

    pushNotification({
      audience: 'customer', kind: 'confirmation', channel: 'SMS',
      title: 'Payment received — receipt ' + payment.receiptNo,
      message: 'We have received TZS ' + amount.toLocaleString('en-US') + ' for ' + s.id + '. Outstanding balance: TZS ' + newBalance.toLocaleString('en-US') + '.',
      customerId: s.customerId, saleId: s.id, amount, receiptNo: payment.receiptNo
    });
    if (newBalance <= 1) {
      pushNotification({
        audience: 'customer', kind: 'confirmation', channel: 'Email',
        title: 'Installment account completed',
        message: 'Congratulations. The installment account for ' + s.id + ' has been fully paid and the plot is now marked as sold.',
        customerId: s.customerId, saleId: s.id, amount: 0
      });
    }
    addActivity(payment.recordedBy, 'Recorded payment ' + payment.receiptNo + ' — TZS ' + amount.toLocaleString('en-US'), 'Payments');
    save();
    return payment;
  }

  function autoTxnRef(method) {
    const codes = { 'M-Pesa': 'MP', 'Tigo Pesa': 'TP', 'Airtel Money': 'AM', 'Bank Transfer': 'BT', 'Cash': 'CSH', 'Cheque': 'CHQ' };
    return (codes[method] || 'TXN') + '-' + pad(Math.floor(Math.random() * 900000 + 100000), 6);
  }

  function sendReminder(notificationType, saleId) {
    const s = sale(saleId);
    if (!s) return null;
    const cust = customer(s.customerId);
    const p = planBySale(saleId);
    const st = p ? planStats(p) : null;
    let title = 'Payment reminder';
    let message = 'Please contact our office regarding your installment account ' + s.id + '.';
    if (notificationType === 'overdue' && st && st.overdue) {
      title = 'Overdue payment reminder';
      message = 'Your account ' + s.id + ' has an overdue balance of TZS ' + st.overdueAmount.toLocaleString('en-US') + '. Kindly settle or contact our office.';
    } else if (st && st.next) {
      title = 'Upcoming installment reminder';
      message = 'Your next installment on ' + s.id + ' of TZS ' + (st.next.amount - (st.next.paid || 0)).toLocaleString('en-US') + ' is due on ' + st.next.dueDate + '.';
    }
    const n = {
      id: nextSeq(db.notifications, 'NTF', 3), audience: 'customer', kind: notificationType,
      channel: 'SMS', title, message, customerId: s.customerId, saleId: s.id,
      amount: st && st.next ? st.next.amount - (st.next.paid || 0) : 0,
      date: new Date().toISOString(), status: 'Sent', sentByName: cust ? cust.name : ''
    };
    db.notifications.unshift(n);
    addActivity(currentUser() ? currentUser().name : 'System', 'Sent ' + title.toLowerCase() + ' to ' + cust.name, 'Notifications');
    save();
    return n;
  }

  /* ---------- plot size requests ---------- */
  function submitRequest(data) {
    const s = sale(data.saleId);
    const p = s ? plot(s.plotId) : null;
    const req = {
      id: nextSeq(db.requests, 'REQ', 3),
      customerId: data.customerId, saleId: data.saleId,
      currentSize: p ? p.size : 0, requestedSize: Number(data.requestedSize),
      note: (data.note || '').trim(), submittedAt: iso(today()), status: 'Pending review', response: ''
    };
    db.requests.push(req);
    addActivity('Customer portal', 'Plot size expansion request submitted for ' + (p ? p.plotNo : 'plot'), 'Customers');
    save();
    return req;
  }

  /* ---------- users ---------- */
  function addUser(data) {
    const u = {
      id: nextSeq(db.users, 'USR', 3), name: data.name.trim(), email: data.email.trim(),
      phone: (data.phone || '').trim(), role: data.role, status: data.status || 'Active',
      lastActive: 'Never', createdAt: iso(today()), access: data.access || 'Assigned access'
    };
    db.users.push(u);
    addActivity(currentUser() ? currentUser().name : 'System', 'Created user account for ' + u.name + ' (' + u.role + ')', 'User Management');
    save();
    return u;
  }
  function updateUser(id, data) {
    const u = user(id);
    if (!u) return null;
    const roleChanged = data.role && data.role !== u.role;
    ['name', 'email', 'phone', 'role', 'status', 'access'].forEach(k => { if (data[k] !== undefined) u[k] = data[k]; });
    if (roleChanged) {
      addActivity(currentUser() ? currentUser().name : 'System', 'Changed role for ' + u.name + ' to ' + u.role, 'User Management');
    } else {
      addActivity(currentUser() ? currentUser().name : 'System', 'Updated user account for ' + u.name, 'User Management');
    }
    save();
    return u;
  }

  /* ---------- session ---------- */
  function currentUser() {
    let id = null;
    try { id = localStorage.getItem(SESSION_KEY); } catch (e) {}
    return id ? user(id) : null;
  }
  function signIn(userId) {
    try { localStorage.setItem(SESSION_KEY, userId); } catch (e) {}
  }
  function signOut() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }
  function currentCustomer() {
    let id = null;
    try { id = localStorage.getItem(PORTAL_KEY); } catch (e) {}
    return id ? customer(id) : null;
  }
  function portalSignIn(customerId) {
    try { localStorage.setItem(PORTAL_KEY, customerId); } catch (e) {}
  }
  function portalSignOut() {
    try { localStorage.removeItem(PORTAL_KEY); } catch (e) {}
  }

  /* ---------- settings ---------- */
  function updateSettings(patch) {
    Object.assign(db.settings, patch);
    addActivity(currentUser() ? currentUser().name : 'System', 'Updated system settings', 'Settings');
    save();
  }

  /* ---------- dashboard aggregates ---------- */
  function dashboardMetrics() {
    const totalPlots = db.plots.length;
    const sold = db.plots.filter(p => p.status === 'Sold').length;
    const available = db.plots.filter(p => p.status === 'Available').length;
    const reserved = db.plots.filter(p => p.status === 'Reserved').length;
    const installment = db.plots.filter(p => p.status === 'Installment').length;
    const collected = db.payments.reduce((s, p) => s + p.amount, 0);
    const salesValue = db.sales.reduce((s, x) => s + x.price, 0);
    const withBalance = new Set(db.sales.filter(s => saleBalance(s.id) > 0).map(s => s.customerId)).size;
    let upcomingAmount = 0, upcomingCount = 0;
    db.plans.forEach(p => {
      const st = planStats(p);
      if (st.completed) return;
      p.entries.forEach(e => {
        const d = daysBetween(today(), parseDate(e.dueDate));
        if (e.paid < e.amount && d >= 0 && d <= 14) { upcomingCount += 1; upcomingAmount += e.amount - e.paid; }
      });
    });
    let overdueAmount = 0, overdueCount = 0;
    db.plans.forEach(p => {
      const st = planStats(p);
      overdueCount += st.overdue;
      overdueAmount += st.overdueAmount;
    });
    return {
      totalPlots, sold, available, reserved, installment, collected, salesValue,
      outstanding: db.sales.reduce((s, x) => s + saleBalance(x.id), 0),
      withBalance, upcomingAmount, upcomingCount, overdueAmount, overdueCount,
      customers: db.customers.length, activeSales: db.sales.filter(s => s.status === 'Ongoing').length
    };
  }

  function collectionsSeries(months) {
    const labels = [];
    const data = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = addMonths(now, -i);
      const label = d.toLocaleDateString('en-GB', { month: 'short' });
      labels.push(label);
      const sum = db.payments.filter(p => {
        const pd = parseDate(p.date);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).reduce((s, p) => s + p.amount, 0);
      data.push(sum);
    }
    return { labels, data };
  }

  function projectPerformance() {
    return db.projects.map(pr => {
      const plots = plotsForProject(pr.id);
      const sold = plots.filter(p => p.status === 'Sold').length;
      const inst = plots.filter(p => p.status === 'Installment').length;
      const available = plots.filter(p => p.status === 'Available').length;
      const reserved = plots.filter(p => p.status === 'Reserved').length;
      const sales = db.sales.filter(s => s.projectId === pr.id);
      const value = sales.reduce((s, x) => s + x.price, 0);
      const collected = db.payments.filter(p => p.projectId === pr.id).reduce((s, p) => s + p.amount, 0);
      return { project: pr, total: plots.length, sold, inst, available, reserved, sales: sales.length, value, collected, pct: plots.length ? Math.round((sold + inst) / plots.length * 100) : 0 };
    });
  }

  function rowForCustomer(c) {
    const sales = salesForCustomer(c.id);
    const totalPaid = sales.reduce((s, x) => s + salePaid(x.id), 0);
    const balance = sales.reduce((s, x) => s + saleBalance(x.id), 0);
    return { customer: c, sales, totalPaid, balance, plots: sales.map(s => plot(s.plotId)).filter(Boolean) };
  }

  /* ---------- expose ---------- */
  global.Store = {
    get db() { return db; },
    get storageAvailable() { return storageAvailable; },
    DEMO_PASSWORD,
    init: load, save, reset,
    today, iso, addDays, addMonths, parseDate, daysBetween,
    project, plot, customer, sale, plan, planBySale, user,
    paymentsForSale, salesForCustomer, plotsForProject, notificationsForSale,
    salePaid, saleBalance, entryState, planStats, planStatus,
    pushNotification, unreadInternalCount, notification, markNotificationRead, markAllInternalRead, addActivity,
    addCustomer, updateCustomer,
    addProject, updateProject, setProjectMap, addPlot, updatePlot,
    recordSale, recordPayment, sendReminder, submitRequest,
    addUser, updateUser, updateSettings,
    currentUser, signIn, signOut, currentCustomer, portalSignIn, portalSignOut,
    dashboardMetrics, collectionsSeries, projectPerformance, rowForCustomer
  };
})(window);
