/* Ardhi LIMS — deterministic fictional sample data (Tanzania) */
(function (global) {
  'use strict';

  const SEED_VERSION = 10;

  /* ---------- helpers ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20261124);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  const pad = (n, len) => String(n).padStart(len, '0');
  const roundTo = (n, step) => Math.round(n / step) * step;

  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function iso(d) { const x = new Date(d); return x.getFullYear() + '-' + pad(x.getMonth() + 1, 2) + '-' + pad(x.getDate(), 2); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) { const x = new Date(d); const day = x.getDate(); x.setMonth(x.getMonth() + n); if (x.getDate() !== day) x.setDate(0); return x; }
  function isoAt(d, hour, min) {
    const x = new Date(d); x.setHours(hour || 9, min || 15, 0, 0); return x.toISOString();
  }

  const TODAY = startOfDay(new Date());

  /* ---------- reference names ---------- */
  const CUSTOMER_NAMES = [
    'Neema Joseph Mushi', 'Baraka John Mwakyusa', 'Fatuma Ally Kibona', 'Hassan Omari Mwinyi',
    'Grace Emmanuel Lyimo', 'Salim Abdallah Msuya', 'Zawadi Peter Massawe', 'David Michael Shirima',
    'Halima Rajabu Ngassa', 'Emmanuel Charles Mbilinyi', 'Asha Hamisi Mkwawa', 'Frank Godfrey Mushi',
    'Rehema Samwel Kessy', 'Ibrahim Musa Mtenga', 'Joyce William Temu', 'Said Bakari Chande',
    'Lulu Rashid Mwinyi', 'Peter Anthony Mwenda', 'Mariam Selemani Kileo', 'Godfrey Elias Swai',
    'Saida Juma Mmari', 'Daniel Erasto Nyoni'
  ];
  const STREETS = [
    'Msasani, Kinondoni', 'Mikocheni B, Kinondoni', 'Tabata Relini, Ilala', 'Mbagala Rangi Tatu, Temeke',
    'Njiro Block C, Arusha', 'Kijichi, Mbagala', 'Ilemela, Mwanza', 'Nzuguni, Dodoma',
    'Kigamboni, Dar es Salaam', 'Bagamoyo Road, Pwani', 'Sinza Kware, Ubungo', 'Chang\'ombe, Kinondoni'
  ];
  const AGENTS = ['Juma Kalinga', 'Agnes Temba', 'Kelvin Mwaipopo', 'Baraka Mwaki', 'Juma Kalinga'];

  const PROJECT_SEEDS = [
    { code: 'KG', name: 'Kigamboni Green Estate', district: 'Kigamboni', region: 'Dar es Salaam', loc: 'Urban', count: 12, base: 52000, sizes: [400, 500, 600, 800], start: 1 },
    { code: 'BG', name: 'Bagamoyo Coastline Plots', district: 'Bagamoyo', region: 'Pwani', loc: 'Rural', count: 10, base: 26000, sizes: [600, 800, 1000, 1200], start: 1 },
    { code: 'DG', name: 'Dodoma Capital Gardens', district: 'Nzuguni', region: 'Dodoma', loc: 'Urban', count: 10, base: 39000, sizes: [400, 500, 600, 800], start: 1 },
    { code: 'AK', name: 'Arusha Kilimanjaro View', district: 'Njiro', region: 'Arusha', loc: 'Urban', count: 8, base: 43000, sizes: [500, 600, 800], start: 1 },
    { code: 'MW', name: 'Mwanza Lakeview Estate', district: 'Ilemela', region: 'Mwanza', loc: 'Urban', count: 8, base: 36000, sizes: [400, 500, 600, 1000], start: 1 }
  ];

  const MAP_FILES = {
    KG: { name: 'Kigamboni_Green_Estate_survey_scan.pdf', size: '3.4 MB', uploadedAt: '2026-09-12', pages: 2 },
    BG: { name: 'Bagamoyo_Coastline_physical_map.jpg', size: '5.1 MB', uploadedAt: '2026-08-27', pages: 1 },
    DG: { name: 'Dodoma_Capital_Gardens_layout_scan.pdf', size: '2.8 MB', uploadedAt: '2026-10-03', pages: 3 },
    AK: { name: 'Arusha_Kilimanjaro_View_map_scan.pdf', size: '4.2 MB', uploadedAt: '2026-07-19', pages: 2 },
    MW: { name: 'Mwanza_Lakeview_survey_scan.jpg', size: '3.9 MB', uploadedAt: '2026-10-21', pages: 1 }
  };

  const USE_ROTATION = ['Residential', 'Residential', 'Residential', 'Commercial', 'Residential', 'Industrial', 'Residential', 'Institutional'];
  const USE_PRICE_MULT = { Residential: 1, Commercial: 1.38, Industrial: 1.18, 'Institutional': 0.94 };

  /* ---------- builders ---------- */
  function buildProjects() {
    return PROJECT_SEEDS.map((p, i) => {
      const id = 'PRJ-' + pad(i + 1, 3);
      return {
        id, code: p.code, name: p.name,
        district: p.district, region: p.region,
        locationClass: p.loc,
        description: 'Surveyed plots at ' + p.district + ', ' + p.region + '. Served by gravel access roads and marked boundaries; utilities connection planned per plot.',
        createdAt: iso(addMonths(TODAY, -between(8, 20))),
        map: Object.assign({}, MAP_FILES[p.code], { type: 'Physical map scan', uploadedBy: 'Juma Kalinga', note: 'Scanned copy of the company physical map. Digital plot mapping has not been confirmed.' })
      };
    });
  }

  function buildPlots(projects) {
    const plots = [];
    let seq = 0;
    PROJECT_SEEDS.forEach((seed, pi) => {
      const project = projects[pi];
      for (let k = 0; k < seed.count; k++) {
        seq += 1;
        const size = seed.sizes[k % seed.sizes.length];
        const use = USE_ROTATION[(k + pi) % USE_ROTATION.length];
        const price = roundTo(size * seed.base * USE_PRICE_MULT[use], 100000);
        plots.push({
          id: 'PLOT-' + pad(seq, 3),
          plotNo: seed.code + '-' + pad(k + 1, 2),
          projectId: project.id,
          size,
          price,
          use,
          locationClass: seed.loc === 'Rural' ? (k % 3 === 0 ? 'Rural' : 'Rural') : (k % 5 === 0 ? 'Rural' : 'Urban'),
          status: 'Available',
          saleId: null,
          createdAt: project.createdAt,
          notes: ''
        });
      }
    });
    return plots;
  }

  function buildCustomers() {
    return CUSTOMER_NAMES.map((name, i) => {
      const first = name.split(' ');
      const phone = '+255 7' + pick(['4', '5', '6']) + between(2, 8) + ' ' + pad(between(100, 999), 3) + ' ' + pad(between(100, 999), 3);
      return {
        id: 'CUS-' + pad(i + 1, 3),
        name,
        phone,
        email: first[0].toLowerCase() + '.' + first[first.length - 1].toLowerCase() + '@example.co.tz',
        address: pick(STREETS) + ', Tanzania',
        nida: pad(between(1965, 2000), 4) + pad(between(10000, 99999), 5) + '-' + pad(between(10000, 99999), 5) + '-' + pad(between(10, 99), 2),
        kinName: pick(['Ally Mwinyi', 'Judith Kessy', 'Hamisi Juma', 'Esther Mushi', 'Rashid Mwenda', 'Catherine Lyimo', 'Omari Said']),
        kinPhone: '+255 7' + between(2, 8) + ' ' + pad(between(100, 999), 3) + ' ' + pad(between(100, 999), 3),
        kinRelation: pick(['Spouse', 'Sibling', 'Parent', 'Child', 'Guardian']),
        registeredAt: iso(addDays(TODAY, -between(10, 420))),
        portal: true,
        status: 'Active'
      };
    });
  }

  const PAY_STYLES = [
    { method: 'M-Pesa', code: 'MP' }, { method: 'Tigo Pesa', code: 'TP' }, { method: 'Airtel Money', code: 'AM' },
    { method: 'Bank Transfer', code: 'BT' }, { method: 'Cash', code: 'CSH' }, { method: 'Cheque', code: 'CHQ' }
  ];

  function buildSales(projects, plots, customers) {
    const sales = [];
    const payments = [];
    const plans = [];
    let paySeq = 0;
    const usedCustomers = new Set();
    const cursor = {};
    projects.forEach(p => cursor[p.id] = 0);

    const patterns = ['completed', 'overdue', 'on-track', 'late', 'on-track', 'new', 'overdue', 'completed', 'on-track', 'overdue', 'on-track', 'new', 'late', 'overdue', 'on-track', 'on-track', 'overdue', 'on-track'];

    patterns.forEach((pattern, i) => {
      const project = projects[i % projects.length];
      const projectPlots = plots.filter(p => p.projectId === project.id);
      const plot = projectPlots[cursor[project.id]++ % projectPlots.length];
      if (!plot || plot.status !== 'Available') return;

      let cust = customers[i];
      if (usedCustomers.has(cust.id)) cust = customers[(i + 7) % customers.length];
      usedCustomers.add(cust.id);

      const saleId = 'SALE-2026-' + pad(sales.length + 1, 3);
      const daysAgo = pattern === 'completed' ? between(300, 400) : pattern === 'new' ? between(6, 20) : between(45, 280);
      const saleDate = startOfDay(addDays(TODAY, -daysAgo));
      const depositRate = pattern === 'completed' ? 0.4 : pick([0.25, 0.3, 0.35, 0.4]);
      const deposit = roundTo(plot.price * depositRate, 100000);
      const price = plot.price;

      let planType = (i % 4 === 0) ? 'Flexible' : 'Fixed';
      let termMonths = planType === 'Fixed' ? pick([6, 12, 18, 24]) : pick([9, 10, 14, 16]);
      if (pattern === 'completed') { planType = 'Fixed'; termMonths = 6; }
      const frequency = (termMonths <= 6 && rnd() > 0.45) || (pattern === 'completed') ? 'Weekly' : 'Monthly';

      const plan = {
        id: 'INS-' + pad(plans.length + 1, 3),
        saleId,
        customerId: cust.id,
        type: planType,
        termMonths,
        frequency,
        startDate: iso(saleDate),
        entries: [],
        createdAt: iso(saleDate)
      };

      const count = frequency === 'Weekly' ? Math.round(termMonths * 4.33) : termMonths;
      const balance = price - deposit;
      const baseAmt = Math.floor(balance / count / 1000) * 1000;
      let left = balance;
      for (let n = 1; n <= count; n++) {
        const amt = n === count ? left : baseAmt;
        left -= amt;
        const due = frequency === 'Weekly' ? addDays(saleDate, n * 7) : addMonths(saleDate, n);
        plan.entries.push({ n, dueDate: iso(due), amount: amt, paid: 0, paidDate: null });
      }

      const sale = {
        id: saleId,
        ref: 'AGR-2026-' + pad(sales.length + 21, 3),
        customerId: cust.id,
        projectId: project.id,
        plotId: plot.id,
        price,
        deposit,
        saleDate: iso(saleDate),
        agent: pick(AGENTS),
        status: 'Ongoing',
        planId: plan.id,
        document: { name: 'Sale_Agreement_' + saleId + '.pdf', size: between(180, 460) + ' KB', type: 'Purchase agreement' },
        notes: ''
      };

      /* deposit payment */
      const depMethod = pick(PAY_STYLES);
      paySeq += 1;
      payments.push({
        id: 'PAY-2026-' + pad(paySeq, 4),
        receiptNo: 'RCP-2026-' + pad(paySeq, 4),
        saleId, customerId: cust.id, projectId: project.id,
        amount: deposit,
        date: iso(saleDate),
        method: depMethod.method,
        txnRef: depMethod.code + '-' + pad(between(100000, 999999), 6),
        type: 'Deposit',
        recordedBy: sale.agent,
        allocations: [],
        notes: 'Initial deposit at sale registration.'
      });

      /* simulate schedule payments */
      const dueEntries = plan.entries.filter(e => new Date(e.dueDate) <= TODAY);
      let paidTarget = dueEntries.length;
      if (pattern === 'new') paidTarget = 0;
      if (pattern === 'overdue') paidTarget = Math.max(0, dueEntries.length - 2);
      if (pattern === 'completed') paidTarget = plan.entries.length;

      for (let k = 0; k < paidTarget; k++) {
        const entry = plan.entries[k];
        let payDate = addDays(new Date(entry.dueDate), between(0, pattern === 'late' ? 9 : 3));
        if (payDate > TODAY) payDate = addDays(TODAY, -1);
        const partial = (pattern === 'on-track' && i === 2 && k === paidTarget - 1) ? 0.62 : 1;
        const amount = roundTo(entry.amount * partial, 1000);
        entry.paid = amount;
        entry.paidDate = iso(payDate);
        const style = pick(PAY_STYLES);
        paySeq += 1;
        payments.push({
          id: 'PAY-2026-' + pad(paySeq, 4),
          receiptNo: 'RCP-2026-' + pad(paySeq, 4),
          saleId, customerId: cust.id, projectId: project.id,
          amount,
          date: iso(payDate),
          method: style.method,
          txnRef: style.code + '-' + pad(between(100000, 999999), 6),
          type: 'Installment',
          recordedBy: pick(['Neema Lyimo', 'Baraka Mwaki', 'Juma Kalinga']),
          allocations: [{ planId: plan.id, n: entry.n, amount }],
          notes: partial < 1 ? 'Partial installment payment.' : ''
        });
      }

      sale._paid = deposit + plan.entries.reduce((s, e) => s + e.paid, 0);
      sale.status = sale._paid >= price ? 'Completed' : 'Ongoing';
      plans.push(plan);
      sales.push(sale);

      plot.status = sale.status === 'Completed' ? 'Sold' : 'Installment';
      plot.saleId = saleId;
      cust.registeredAt = cust.registeredAt > iso(saleDate) ? cust.registeredAt : iso(saleDate);
    });

    /* reserve a few plots */
    plots.filter(p => p.status === 'Available').slice(0, 4).forEach(p => { p.status = 'Reserved'; });

    sales.forEach(s => { delete s._paid; });
    payments.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return { sales, payments, plans };
  }

  function buildNotifications(sales, plans, payments, customers) {
    const notes = [];
    let seq = 0;
    const custOf = (id) => customers.find(c => c.id === id);

    plans.forEach(plan => {
      const sale = sales.find(s => s.id === plan.saleId);
      if (!sale) return;
      const cust = custOf(plan.customerId);
      const plot = global.__plots ? null : null;
      const upcoming = plan.entries.find(e => !e.paid || e.paid < e.amount);
      const overdue = plan.entries.filter(e => (!e.paid || e.paid < e.amount) && new Date(e.dueDate) < TODAY);

      if (overdue.length) {
        const first = overdue[0];
        seq += 1;
        notes.push({
          id: 'NTF-' + pad(seq, 3), audience: 'internal', kind: 'overdue', channel: 'Internal',
          title: 'Overdue installment — ' + cust.name,
          message: cust.name + ' (' + cust.phone + ') has ' + overdue.length + ' overdue installment' + (overdue.length > 1 ? 's' : '') + ' on ' + sale.ref + ', oldest due ' + first.dueDate + '.',
          customerId: cust.id, saleId: sale.id, planId: plan.id, amount: overdue.reduce((s, e) => s + (e.amount - e.paid), 0),
          date: isoAt(addDays(TODAY, -between(0, 3)), 8, 30), status: 'Unread', reason: 'Pending clarification'
        });
        seq += 1;
        notes.push({
          id: 'NTF-' + pad(seq, 3), audience: 'customer', kind: 'overdue', channel: pick(['SMS', 'WhatsApp']),
          title: 'Payment overdue',
          message: 'Dear ' + cust.name.split(' ')[0] + ', your installment on ' + sale.id + ' was due on ' + first.dueDate + '. Please contact our office to arrange payment.',
          customerId: cust.id, saleId: sale.id, planId: plan.id, amount: first.amount - first.paid,
          date: isoAt(addDays(TODAY, -between(1, 4)), 10, 5), status: 'Sent'
        });
      }

      if (upcoming) {
        const due = new Date(upcoming.dueDate);
        const diff = Math.round((due - TODAY) / 86400000);
        if (diff >= 0 && diff <= 7) {
          seq += 1;
          notes.push({
            id: 'NTF-' + pad(seq, 3), audience: 'customer', kind: diff === 0 ? 'due-today' : 'reminder', channel: pick(['SMS', 'WhatsApp', 'Email']),
            title: diff === 0 ? 'Installment due today' : 'Upcoming installment reminder',
            message: 'Dear ' + cust.name.split(' ')[0] + ', installment #' + upcoming.n + ' of ' + plan.entries.length + ' (' + sale.id + ') is due on ' + upcoming.dueDate + '.',
            customerId: cust.id, saleId: sale.id, planId: plan.id, amount: upcoming.amount - (upcoming.paid || 0),
            date: isoAt(addDays(TODAY, -diff > 0 ? 0 : 0), 7, 45), status: diff === 0 ? 'Sent' : 'Scheduled'
          });
        }
      }
    });

    payments.slice(-12).forEach(p => {
      const cust = custOf(p.customerId);
      seq += 1;
      notes.push({
        id: 'NTF-' + pad(seq, 3), audience: 'customer', kind: p.type === 'Deposit' ? 'receipt' : 'confirmation', channel: pick(['SMS', 'Email']),
        title: p.type === 'Deposit' ? 'Deposit receipt issued' : 'Payment received',
        message: 'Payment of TZS ' + p.amount.toLocaleString('en-US') + ' for ' + p.saleId + ' has been recorded. Receipt ' + p.receiptNo + '.',
        customerId: p.customerId, saleId: p.saleId, amount: p.amount, receiptNo: p.receiptNo,
        date: isoAt(addDays(new Date(p.date), 0), 14, 20), status: 'Sent'
      });
    });

    notes.forEach(n => { if (n.audience === 'internal' && rnd() > 0.5) n.status = 'Read'; });
    notes.sort((a, b) => (a.date < b.date ? 1 : -1));
    return notes;
  }

  function buildUsers() {
    return [
      { id: 'USR-001', name: 'Salma Mwinyi', role: 'Owner', email: 'salma@ardhi.co.tz', phone: '+255 754 100 220', status: 'Active', lastActive: 'Just now', createdAt: '2025-11-02', access: 'Full system access' },
      { id: 'USR-002', name: 'Juma Kalinga', role: 'Manager', email: 'juma@ardhi.co.tz', phone: '+255 715 320 118', status: 'Active', lastActive: '12 minutes ago', createdAt: '2025-11-20', access: 'Operations & operational reports' },
      { id: 'USR-003', name: 'Neema Lyimo', role: 'Accountant', email: 'neema@ardhi.co.tz', phone: '+255 762 441 907', status: 'Active', lastActive: '1 hour ago', createdAt: '2026-01-14', access: 'Assigned access (pending specification)' },
      { id: 'USR-004', name: 'Baraka Mwaki', role: 'Cashier', email: 'baraka@ardhi.co.tz', phone: '+255 786 552 310', status: 'Active', lastActive: '3 hours ago', createdAt: '2026-02-08', access: 'Assigned access (pending specification)' },
      { id: 'USR-005', name: 'Kelvin Mwaipopo', role: 'Cashier', email: 'kelvin@ardhi.co.tz', phone: '+255 673 209 844', status: 'Suspended', lastActive: '18 days ago', createdAt: '2026-03-19', access: 'Assigned access (pending specification)' }
    ];
  }

  function buildActivity(sales, payments, users) {
    const acts = [];
    let seq = 0;
    const add = (user, action, module, date) => {
      seq += 1;
      acts.push({ id: 'ACT-' + pad(seq, 4), user, action, module, date: isoAt(date, between(8, 17), between(0, 59)) });
    };
    sales.slice(-6).forEach(s => add(s.agent, 'Registered sale ' + s.id + ' (' + s.ref + ')', 'Sales', new Date(s.saleDate)));
    payments.slice(-10).forEach(p => add(p.recordedBy, 'Recorded payment ' + p.receiptNo + ' — TZS ' + p.amount.toLocaleString('en-US'), 'Payments', new Date(p.date)));
    add('Salma Mwinyi', 'Updated privilege: Manager operational report scope confirmed', 'User Management', addDays(TODAY, -23));
    add('Juma Kalinga', 'Uploaded physical map scan for Dodoma Capital Gardens', 'Land Management', addDays(TODAY, -19));
    add('Neema Lyimo', 'Generated outstanding balances report (Monthly)', 'Reports', addDays(TODAY, -6));
    add('Salma Mwinyi', 'Updated reminder lead time to 7 days', 'Settings', addDays(TODAY, -11));
    add('Baraka Mwaki', 'Registered new customer for Kigamboni Green Estate', 'Customers', addDays(TODAY, -2));
    acts.sort((a, b) => (a.date < b.date ? 1 : -1));
    return acts;
  }

  function buildRequests(customers, sales) {
    const s1 = sales[4], s2 = sales[9];
    return [
      {
        id: 'REQ-001', customerId: s1 ? s1.customerId : customers[4].id, saleId: s1 ? s1.id : sales[0].id,
        currentSize: 600, requestedSize: 200, note: 'I would like to add 200 sqm to extend the plot towards the access road, for a larger family home and small garden.',
        submittedAt: iso(addDays(TODAY, -4)), status: 'Pending review',
        response: ''
      },
      {
        id: 'REQ-002', customerId: s2 ? s2.customerId : customers[9].id, saleId: s2 ? s2.id : sales[1].id,
        currentSize: 500, requestedSize: 100, note: 'Requesting an additional 100 sqm for a parking area.',
        submittedAt: iso(addDays(TODAY, -21)), status: 'Recorded',
        response: 'Request recorded. Approval authority and checks are pending confirmation.'
      }
    ];
  }

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthLabel = (d) => MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear();

  const EXPENSE_KINDS = [
    { category: 'Salaries & wages', payees: ['Ardhi staff payroll'], monthlyDay: 28, refPrefix: 'PAY', desc: (d) => 'Monthly staff salaries and wages — ' + monthLabel(d) + ' (9 employees)', min: 6500000, max: 7600000, step: 50000, method: 'Bank Transfer' },
    { category: 'Payroll statutory contributions', payees: ['TRA · NSSF · WCF'], monthlyDay: 5, refPrefix: 'STAT', desc: (d) => 'PAYE, NSSF, WCF, SDL and NHIF remittance — ' + monthLabel(new Date(d.getFullYear(), d.getMonth() - 1, 1)), min: 1450000, max: 1750000, step: 25000, method: 'Bank Transfer' },
    { category: 'Rent & facilities', payees: ['Mzizima Properties Ltd'], monthlyDay: 1, refPrefix: 'RENT', desc: (d) => 'Monthly office rent and service charge — ' + monthLabel(d), min: 2400000, max: 2400000, step: 50000, method: 'Bank Transfer' },
    { category: 'Utilities', payees: ['TANESCO', 'DAWASA'], monthlyDay: 12, refPrefix: 'UTIL', desc: 'Electricity and water — head office', min: 380000, max: 680000, step: 10000, method: 'Bank Transfer' },
    { category: 'Telecom & internet', payees: ['Vodacom Tanzania', 'TTCL'], monthlyDay: 6, refPrefix: 'TEL', desc: 'Office internet and mobile airtime', min: 180000, max: 320000, step: 10000, method: 'M-Pesa' },
    { category: 'Security services', payees: ['SGA Security Tanzania', 'Ultimate Security'], monthlyDay: 3, refPrefix: 'SEC', desc: 'Office and plot security services', min: 480000, max: 720000, step: 10000, method: 'Bank Transfer' },
    { category: 'Cleaning & sanitation', payees: ['Safi Bora Cleaning Services'], monthlyDay: 15, refPrefix: 'CLN', desc: 'Office cleaning and sanitation services', min: 90000, max: 160000, step: 10000, method: 'Cash' },
    { category: 'Land survey & titling', payees: ['Geosurvey Tanzania Ltd', 'Rasco Surveys Ltd', 'Mwananchi Land Surveyors'], count: 4, project: true, desc: 'Survey, beaconing and title documentation', min: 1400000, max: 4600000, step: 50000, method: 'Bank Transfer' },
    { category: 'Office supplies', payees: ['Office Mart Dar', 'Stationery World Ltd'], count: 3, desc: 'Office stationery and consumables', min: 120000, max: 380000, step: 10000, method: 'Cash' },
    { category: 'Transport & fuel', payees: ['Puma Energy Tanzania', 'Oryx Energies'], count: 5, desc: 'Field transport and fuel', min: 160000, max: 480000, step: 10000, method: 'M-Pesa' },
    { category: 'Travel & accommodation', payees: ['Air Tanzania', 'New Africa Hotel'], count: 2, desc: 'Upcountry site visit travel and accommodation', min: 280000, max: 850000, step: 50000, method: 'Bank Transfer' },
    { category: 'Insurance', payees: ['Jubilee Insurance', 'NIC Tanzania'], count: 2, desc: 'Office, vehicle and plot insurance cover', min: 420000, max: 950000, step: 50000, method: 'Bank Transfer' },
    { category: 'Statutory & regulatory fees', payees: ['Kinondoni Municipal Council', 'Temeke Municipal Council', 'Ministry of Lands — land rent'], count: 3, project: true, desc: 'Municipal permits, land rent and regulatory fees', min: 320000, max: 1300000, step: 50000, method: 'Bank Transfer' },
    { category: 'Professional services', payees: ['Kagoda Advocates', 'Mbeya Audit Partners'], count: 3, desc: 'Legal, audit and consultancy services', min: 500000, max: 1800000, step: 100000, method: 'Bank Transfer' },
    { category: 'Marketing & outreach', payees: ['Coastal Media Group', 'Tanzania Print House', 'Radio One Tanzania'], count: 3, project: true, desc: 'Plot sales outreach and printed materials', min: 300000, max: 1100000, step: 50000, method: 'Bank Transfer' },
    { category: 'Repairs & maintenance', payees: ['Fundi Juma Services', 'Techfix Tanzania'], count: 3, desc: 'Generator, vehicle and office repairs', min: 140000, max: 850000, step: 10000, method: 'Cash' },
    { category: 'Equipment & tools', payees: ['Cotech Tanzania', 'Global Technologies Ltd'], count: 2, desc: 'Survey equipment and office equipment', min: 600000, max: 2400000, step: 100000, method: 'Bank Transfer' },
    { category: 'Training & development', payees: ['Institute of Land Administration', 'CBE Training Centre'], count: 2, desc: 'Staff training and professional development', min: 300000, max: 750000, step: 50000, method: 'Bank Transfer' },
    { category: 'Bank charges', payees: ['CRDB Bank', 'NMB Bank'], count: 2, desc: 'Bank charges and transaction fees', min: 35000, max: 120000, step: 5000, method: 'Bank Transfer' },
    { category: 'Courier & postage', payees: ['DHL Tanzania', 'FedEx Tanzania'], count: 3, desc: 'Courier and document delivery', min: 45000, max: 180000, step: 5000, method: 'Cash' }
  ];

  function buildExpenses(projects) {
    const expenses = [];

    const push = (kind, date, project) => {
      const prj = project || null;
      const desc = typeof kind.desc === 'function' ? kind.desc(date) : kind.desc;
      expenses.push({
        category: kind.category,
        date: iso(date),
        description: desc + (prj ? ' — ' + prj.code : ''),
        payee: pick(kind.payees),
        amount: roundTo(between(kind.min, kind.max), kind.step),
        method: kind.method,
        projectId: prj ? prj.id : null,
        recordedBy: 'Neema Lyimo',
        createdAt: isoAt(date, 10, 20)
      });
      return expenses[expenses.length - 1];
    };

    EXPENSE_KINDS.filter(k => k.monthlyDay).forEach(kind => {
      for (let back = 5; back >= 0; back--) {
        const date = new Date(TODAY.getFullYear(), TODAY.getMonth() - back, kind.monthlyDay);
        if (date > TODAY) continue;
        const e = push(kind, date, kind.project ? pick(projects) : null);
        e.reference = kind.refPrefix + '-' + date.getFullYear() + '-' + pad(date.getMonth() + 1, 2);
      }
    });

    let invSeq = 118;
    EXPENSE_KINDS.filter(k => k.count).forEach(kind => {
      for (let n = 0; n < kind.count; n++) {
        const date = addDays(TODAY, -between(3, 168));
        const e = push(kind, date, kind.project ? pick(projects) : null);
        e.reference = 'INV-' + date.getFullYear() + '-' + pad(invSeq++, 3);
      }
    });

    expenses.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const seq = {};
    expenses.forEach((e, i) => {
      const y = e.date.slice(0, 4);
      seq[y] = (seq[y] || 0) + 1;
      e.id = 'EXP-' + pad(i + 1, 3);
      e.voucherNo = 'PV-' + y + '-' + pad(seq[y], 3);
    });
    return expenses.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

  function build() {
    const projects = buildProjects();
    const plots = buildPlots(projects);
    const customers = buildCustomers();
    const { sales, payments, plans } = buildSales(projects, plots, customers);
    payments.forEach((p, i) => { p.receiptNo = 'RCP-2026-' + pad(i + 1, 4); });
    const notifications = buildNotifications(sales, plans, payments, customers);
    const users = buildUsers();
    const activity = buildActivity(sales, payments, users);
    const requests = buildRequests(customers, sales);
    const expenses = buildExpenses(projects);

    return {
      version: SEED_VERSION,
      seededAt: new Date().toISOString(),
      projects, plots, customers, sales, plans, payments,
      notifications, users, activity, requests, expenses,
      settings: {
        companyName: 'Ardhi Land Company Limited',
        companyEmail: 'info@ardhi.co.tz',
        companyPhone: '+255 22 213 7700',
        companyAddress: 'Plot 45, Ali Hassan Mwinyi Road, Dar es Salaam, Tanzania',
        currency: 'TZS',
        reminderLeadDays: 7,
        gracePeriodDays: 3,
        receiptPrefix: 'RCP',
        smsSender: 'ARDHI',
        integrations: { sms: 'Interface only — not connected', whatsapp: 'Interface only — not connected', email: 'Interface only — not connected' }
      }
    };
  }

  global.SampleData = { build, SEED_VERSION };
})(window);
