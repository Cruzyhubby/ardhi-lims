/* Ardhi LIMS — shared UI utilities */
(function (global) {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const moneyFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  function money(n) { return 'TZS ' + moneyFmt.format(Math.round(Number(n) || 0)); }
  function num(n) { return moneyFmt.format(Math.round(Number(n) || 0)); }
  function moneyShort(n) {
    n = Number(n) || 0;
    if (Math.abs(n) >= 1e9) return 'TZS ' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return 'TZS ' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return 'TZS ' + Math.round(n / 1e3) + 'K';
    return 'TZS ' + moneyFmt.format(n);
  }
  function numberShort(n) {
    n = Number(n) || 0;
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'K';
    return String(n);
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function date(s, style) {
    if (!s) return '—';
    const d = new Date(String(s).length <= 10 ? s + 'T00:00:00' : s);
    if (isNaN(d)) return '—';
    const day = d.getDate(), mon = MONTHS[d.getMonth()], yr = d.getFullYear();
    if (style === 'short') return day + ' ' + mon;
    if (style === 'month') return mon + ' ' + yr;
    if (style === 'long') return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return day + ' ' + mon + ' ' + yr;
  }
  function dateTime(s) {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d)) return '—';
    let h = d.getHours(), m = d.getMinutes();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return date(s) + ' · ' + h + ':' + String(m).padStart(2, '0') + ' ' + ap;
  }
  function relTime(s) {
    const d = new Date(s);
    if (isNaN(d)) return '—';
    const diff = Date.now() - d.getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + ' hr' + (hrs > 1 ? 's' : '') + ' ago';
    const days = Math.round(hrs / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return days + ' days ago';
    return date(s);
  }
  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  }
  const AV_COLORS = ['', 'c2', 'c3', 'c4', 'c5', 'c6'];
  function avatar(name, cls) {
    let hash = 0;
    for (let i = 0; i < String(name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997;
    const tone = AV_COLORS[hash % AV_COLORS.length];
    return '<span class="avatar ' + (tone || '') + ' ' + (cls || '') + '">' + esc(initials(name)) + '</span>';
  }

  const STATUS_TONES = {
    'Available': 'green', 'Reserved': 'amber', 'Installment': 'blue', 'Sold': 'dark',
    'Completed': 'green', 'Ongoing': 'blue', 'Overdue': 'red', 'On track': 'blue',
    'Paid': 'green', 'Pending': 'grey', 'Partial': 'amber', 'Scheduled': 'blue',
    'Sent': 'green', 'Unread': 'blue', 'Read': 'grey', 'Active': 'green', 'Suspended': 'red',
    'Pending review': 'amber', 'Recorded': 'blue', 'Approved': 'green', 'Rejected': 'red',
    'Urgent': 'red', 'High': 'amber', 'Normal': 'grey', 'Fixed': 'grey', 'Flexible': 'blue'
  };
  function badge(text, tone, opts) {
    const t = tone || STATUS_TONES[text] || 'grey';
    const noDot = opts && opts.noDot;
    return '<span class="badge ' + t + (noDot ? ' no-dot' : '') + '">' + esc(text) + '</span>';
  }

  function icon(name, cls) { return global.Icons.get(name, cls); }

  function methodMeta(method) {
    return {
      'M-Pesa': { icon: 'smartphone', tone: 'green' },
      'Tigo Pesa': { icon: 'smartphone', tone: 'blue' },
      'Airtel Money': { icon: 'smartphone', tone: 'red' },
      'Bank Transfer': { icon: 'bank', tone: 'grey' },
      'Cash': { icon: 'cash', tone: 'amber' },
      'Cheque': { icon: 'receipt', tone: 'grey' }
    }[method] || { icon: 'payments', tone: 'grey' };
  }
  function methodChip(method) {
    const m = methodMeta(method);
    return '<span class="chip outline"><span class="icon" style="color:var(--muted)">' + icon(m.icon) + '</span>' + esc(method) + '</span>';
  }

  function progress(pct, tone) {
    const v = Math.max(0, Math.min(100, Math.round(pct || 0)));
    return '<div class="progress ' + (tone || '') + '"><span style="width:' + v + '%"></span></div>';
  }
  function progressCell(pct, tone, label) {
    const v = Math.max(0, Math.min(100, Math.round(pct || 0)));
    return '<div class="progress-wrap"><div class="progress ' + (tone || '') + '" style="flex:1"><span style="width:' + v + '%"></span></div><span class="val">' + (label != null ? label : v + '%') + '</span></div>';
  }
  function ring(pct, size, stroke, label, sub) {
    size = size || 132; stroke = stroke || 10;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(100, pct || 0));
    const dash = (v / 100) * c;
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#EDEFEC" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#16A34A" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + dash + ' ' + (c - dash) + '"/>' +
      '</svg><div class="ring-label"><div class="v">' + esc(label != null ? label : Math.round(v) + '%') + '</div><div class="k">' + esc(sub || '') + '</div></div></div>';
  }

  /* ---------------- modal ---------------- */
  function modal(opts) {
    const root = $('#modalRoot');
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop' + (opts.sheet ? ' sheet-backdrop' : '');
    const size = opts.size || '';
    const modalEl = document.createElement('div');
    modalEl.className = 'modal ' + size + (opts.sheet ? ' sheet' : '');
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.innerHTML =
      '<div class="modal-head">' +
        '<div><h3>' + esc(opts.title || '') + '</h3>' + (opts.subtitle ? '<div class="sub">' + esc(opts.subtitle) + '</div>' : '') + '</div>' +
        '<button class="icon-btn modal-close" type="button" aria-label="Close dialog">' + icon('x', 'icon-sm') + '</button>' +
      '</div>' +
      '<div class="modal-body' + (opts.flush ? ' flush' : '') + '">' + (opts.body || '') + '</div>' +
      (opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : '');

    backdrop.appendChild(modalEl);
    root.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    const prevFocus = document.activeElement;
    function close() {
      backdrop.remove();
      if (!root.children.length) document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    $$('.modal-close', modalEl).forEach(b => b.addEventListener('click', close));
    if (!opts.persistent) {
      backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
    }
    setTimeout(() => {
      const focusTarget = $('input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea', modalEl);
      if (focusTarget && opts.autofocus !== false) focusTarget.focus();
    }, 60);

    if (typeof opts.onMount === 'function') opts.onMount(modalEl, close);
    return { el: modalEl, close, backdrop };
  }

  function confirmDialog(opts) {
    return new Promise(resolve => {
      const m = modal({
        title: opts.title || 'Are you sure?',
        subtitle: opts.subtitle || '',
        size: 'sm',
        body: '<div style="font-size:13px;color:var(--ink-2);line-height:1.6">' + (opts.message || '') + '</div>' +
          (opts.note ? '<div class="notice warn" style="margin-top:14px">' + icon('info') + '<div>' + opts.note + '</div></div>' : ''),
        footer: '<button class="btn btn-outline" data-x="cancel">Cancel</button><button class="btn ' + (opts.tone === 'danger' ? 'btn-danger' : 'btn-primary') + '" data-x="ok">' + esc(opts.confirmText || 'Confirm') + '</button>',
        onClose: () => resolve(false)
      });
      let done = false;
      $('[data-x="cancel"]', m.el).addEventListener('click', () => { done = true; resolve(false); m.close(); });
      $('[data-x="ok"]', m.el).addEventListener('click', () => { done = true; resolve(true); m.close(); });
      m.el.addEventListener('remove', () => { if (!done) resolve(false); });
    });
  }

  /* ---------------- toast ---------------- */
  function toast(message, type) {
    const root = $('#toastRoot');
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    const ic = type === 'error' ? 'alert' : type === 'warn' ? 'alert' : 'check-circle';
    el.innerHTML = icon(ic) + '<div>' + message + '</div><button class="toast-close" aria-label="Dismiss">' + icon('x') + '</button>';
    root.appendChild(el);
    const kill = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 200); };
    el.querySelector('.toast-close').addEventListener('click', kill);
    setTimeout(kill, type === 'error' ? 5200 : 3800);
  }

  /* ---------------- print & download ---------------- */
  function printElement(el, title) {
    const area = $('#printArea');
    area.innerHTML = '<div class="print-doc">' + (title ? '<div style="display:none">' + esc(title) + '</div>' : '') + el.outerHTML + '</div>';
    const cleanup = () => {
      area.innerHTML = '';
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => { window.print(); setTimeout(cleanup, 2000); }, 60);
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
  }

  /* ---------------- filtering ---------------- */
  function filterRows(rows, query) {
    const q = String(query || '').trim().toLowerCase();
    let visible = 0;
    rows.forEach(r => {
      const hay = (r.getAttribute('data-search') || r.textContent).toLowerCase();
      const show = !q || hay.includes(q);
      r.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    return visible;
  }
  function debounce(fn, wait) {
    let t;
    return function () { const args = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(null, args), wait || 180); };
  }

  /* ---------------- forms ---------------- */
  function readForm(form) {
    const data = {};
    $$('input, select, textarea', form).forEach(el => {
      if (!el.name) return;
      if (el.type === 'checkbox') data[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
      else data[el.name] = el.value;
    });
    return data;
  }
  function fieldBox(el) { return el.closest('.field'); }
  function fieldError(el, msg) {
    const box = fieldBox(el);
    if (!box) return;
    box.classList.add('invalid');
    const em = $('.error-msg', box);
    if (em && msg) em.textContent = msg;
  }
  function clearErrors(form) { $$('.field.invalid', form).forEach(f => f.classList.remove('invalid')); }
  function validate(form, checks) {
    clearErrors(form);
    let ok = true;
    checks.forEach(c => {
      const el = form.elements[c.name];
      if (!el) return;
      const val = (el.value || '').trim();
      let bad = false;
      if (c.required && !val) bad = true;
      else if (val && c.test && !c.test(val)) bad = true;
      if (bad) { ok = false; fieldError(el, c.msg); }
    });
    if (!ok) {
      const first = $('.field.invalid input, .field.invalid select, .field.invalid textarea', form);
      if (first) first.focus();
    }
    return ok;
  }
  const patterns = {
    phone: /^(\+?255|0)[\s-]?[67][\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{3}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    tin: /^\d{9}$/
  };

  /* ---------------- charts ---------------- */
  let chartSeq = 0;
  function niceMax(v) {
    if (v <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * mag;
  }
  function smoothPath(pts) {
    if (!pts.length) return '';
    if (pts.length < 3) return 'M' + pts.map(p => p[0] + ' ' + p[1]).join(' L');
    let d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1];
      const mx = (p0[0] + p1[0]) / 2;
      d += ' C' + mx + ' ' + p0[1] + ', ' + mx + ' ' + p1[1] + ', ' + p1[0] + ' ' + p1[1];
    }
    return d;
  }

  function lineChart(container, cfg) {
    if (!container) return;
    const w = 680, h = cfg.height || 230;
    const pl = 8, pr = 8, pt = 14, pb = 28;
    const labels = cfg.labels || [];
    const data = cfg.data || [];
    const max = niceMax(Math.max.apply(null, data.concat([1])));
    const innerW = w - pl - pr, innerH = h - pt - pb;
    const pts = data.map((v, i) => [pl + (labels.length <= 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW), pt + innerH - (v / max) * innerH]);
    const id = 'grad' + (++chartSeq);
    const fmt = cfg.format || (v => moneyShort(v));
    let grid = '';
    for (let i = 0; i <= 3; i++) {
      const y = pt + (innerH / 3) * i;
      grid += '<line x1="' + pl + '" y1="' + y + '" x2="' + (w - pr) + '" y2="' + y + '" stroke="#EEF0ED" stroke-width="1" stroke-dasharray="' + (i === 3 ? '0' : '3 5') + '"/>';
      grid += '<text x="' + (w - pr) + '" y="' + (y - 5) + '" text-anchor="end" font-size="9.5" fill="#9CA3AF">' + esc(fmt(max - (max / 3) * i)) + '</text>';
    }
    const area = smoothPath(pts) + ' L' + pts[pts.length - 1][0] + ' ' + (pt + innerH) + ' L' + pts[0][0] + ' ' + (pt + innerH) + ' Z';
    const path = smoothPath(pts);
    let dots = '', xlabels = '';
    const every = Math.ceil(labels.length / 8);
    pts.forEach((p, i) => {
      dots += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.2" fill="#fff" stroke="' + (cfg.color || '#16A34A') + '" stroke-width="2"><title>' + esc(labels[i] + ': ' + money(data[i])) + '</title></circle>';
      if (i % every === 0 || i === pts.length - 1) {
        xlabels += '<text x="' + p[0] + '" y="' + (h - 8) + '" text-anchor="middle" font-size="9.5" fill="#9CA3AF">' + esc(labels[i]) + '</text>';
      }
    });
    container.innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" preserveAspectRatio="none" role="img" aria-label="Trend chart">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + (cfg.color || '#16A34A') + '" stop-opacity="0.22"/><stop offset="100%" stop-color="' + (cfg.color || '#16A34A') + '" stop-opacity="0.01"/></linearGradient></defs>' +
      grid +
      '<path d="' + area + '" fill="url(#' + id + ')"/>' +
      '<path d="' + path + '" fill="none" stroke="' + (cfg.color || '#16A34A') + '" stroke-width="2.4" stroke-linecap="round"/>' +
      dots + xlabels + '</svg>';
  }

  function donutChart(container, cfg) {
    if (!container) return;
    const size = cfg.size || 168;
    const stroke = cfg.stroke || 18;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const segs = cfg.segments || [];
    const total = segs.reduce((s, x) => s + x.value, 0) || 1;
    let offset = 0;
    let circles = '';
    segs.forEach(seg => {
      const len = (seg.value / total) * c;
      circles += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + seg.color + '" stroke-width="' + stroke + '" stroke-dasharray="' + Math.max(0, len - 2) + ' ' + (c - Math.max(0, len - 2)) + '" stroke-dashoffset="' + (-offset) + '" stroke-linecap="round"><title>' + esc(seg.label + ': ' + seg.value) + '</title></circle>';
      offset += len;
    });
    container.innerHTML =
      '<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;justify-content:center">' +
      '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' +
        '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="transform:rotate(-90deg)">' +
          '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#F0F2EF" stroke-width="' + stroke + '"/>' + circles +
        '</svg>' +
        '<div class="ring-label"><div class="v">' + esc(cfg.centerValue != null ? cfg.centerValue : total) + '</div><div class="k">' + esc(cfg.centerLabel || '') + '</div></div>' +
      '</div>' +
      '<div style="display:grid;gap:9px;min-width:130px">' + segs.map(s =>
        '<div style="display:flex;align-items:center;gap:8px;font-size:12px"><span style="width:9px;height:9px;border-radius:3px;background:' + s.color + '"></span><span style="flex:1;color:var(--muted)">' + esc(s.label) + '</span><strong style="font-variant-numeric:tabular-nums">' + s.value + '</strong></div>'
      ).join('') + '</div></div>';
  }

  function barChart(container, cfg) {
    if (!container) return;
    const items = cfg.items || [];
    const max = Math.max.apply(null, items.map(i => i.value).concat([1]));
    container.innerHTML = '<div style="display:grid;gap:14px">' + items.map(i => {
      const pct = Math.max(2, Math.round((i.value / max) * 100));
      return '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px"><span>' + esc(i.label) + '</span><strong style="font-variant-numeric:tabular-nums">' + esc(cfg.format ? cfg.format(i.value) : i.value) + '</strong></div><div class="progress" style="height:8px"><span style="width:' + pct + '%;background:' + (i.color || '#16A34A') + '"></span></div></div>';
    }).join('') + '</div>';
  }

  /* ---------------- misc templates ---------------- */
  function emptyState(iconName, title, text, action) {
    return '<div class="empty-state"><div class="icon-wrap">' + icon(iconName) + '</div><h4>' + esc(title) + '</h4><p>' + esc(text) + '</p>' + (action || '') + '</div>';
  }
  function options(list, selected, valKey, labelKey) {
    return list.map(item => {
      const v = valKey ? item[valKey] : item.value;
      const l = labelKey ? item[labelKey] : item.label;
      return '<option value="' + esc(v) + '"' + (String(v) === String(selected) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  }

  /* ---------------- receipt template ---------------- */
  function receiptHTML(payment) {
    const s = Store.sale(payment.saleId);
    const c = Store.customer(payment.customerId);
    const prj = s ? Store.project(s.projectId) : null;
    const p = s ? Store.plot(s.plotId) : null;
    const balance = s ? Store.saleBalance(s.id) : 0;
    const settings = Store.db.settings;
    return '<div class="receipt print-doc" id="receiptDoc">' +
      '<div class="receipt-top">' +
        '<div class="receipt-brand"><div class="brand-mark">' + icon('leaf') + '</div><div><div class="nm">' + esc(settings.companyName) + '</div><div class="addr">' + esc(settings.companyAddress) + '</div><div class="addr">' + esc(settings.companyPhone) + ' · ' + esc(settings.companyEmail) + '</div></div></div>' +
        '<div class="receipt-meta"><div class="doc-type">Payment receipt</div><div class="ref">' + esc(payment.receiptNo) + '</div><div class="date">' + date(payment.date) + '</div><span class="badge green no-dot">Simulated</span></div>' +
      '</div>' +
      '<div class="receipt-body">' +
        '<div class="receipt-cols">' +
          '<div><div class="lbl">Received from</div><div class="val">' + esc(c ? c.name : '—') + '</div><div class="sml">' + esc(c ? c.phone : '') + '</div><div class="sml">' + esc(c ? c.address : '') + '</div></div>' +
          '<div><div class="lbl">Account / agreement</div><div class="val">' + esc(s ? s.id : '—') + '</div><div class="sml">' + esc(s ? s.ref : '') + '</div><div class="sml">' + esc(prj ? prj.name : '') + ' · Plot ' + esc(p ? p.plotNo : '—') + '</div></div>' +
        '</div>' +
        '<div class="receipt-amount"><div class="lbl">Amount received</div><div class="amt">' + money(payment.amount) + '</div><div class="words">' + esc(amountWords(payment.amount)) + '</div></div>' +
        '<table class="receipt-table"><tbody>' +
          '<tr><td>Payment method</td><td>' + esc(payment.method) + '</td></tr>' +
          '<tr><td>Transaction reference</td><td class="mono">' + esc(payment.txnRef) + '</td></tr>' +
          '<tr><td>Payment type</td><td>' + esc(payment.type) + '</td></tr>' +
          (payment.allocations && payment.allocations.length ? '<tr><td>Installments covered</td><td>' + payment.allocations.map(a => '#' + a.n + ' (' + money(a.amount) + ')').join(', ') + '</td></tr>' : '') +
          '<tr><td>Selling price</td><td>' + money(s ? s.price : 0) + '</td></tr>' +
          '<tr><td>Outstanding balance after payment</td><td class="strong">' + money(balance) + '</td></tr>' +
          '<tr><td>Recorded by</td><td>' + esc(payment.recordedBy) + '</td></tr>' +
        '</tbody></table>' +
        (payment.notes ? '<div class="receipt-note"><strong>Note:</strong> ' + esc(payment.notes) + '</div>' : '') +
        '<div class="receipt-foot">This is a system-generated demonstration receipt. No real payment has been processed. Retain this receipt for your records.</div>' +
      '</div>' +
    '</div>';
  }

  function amountWords(n) {
    return 'Tanzanian Shillings ' + num(n) + ' only.';
  }

  function showReceipt(payment) {
    const m = modal({
      title: 'Payment receipt',
      subtitle: payment.receiptNo + ' · ' + date(payment.date),
      size: 'md',
      body: receiptHTML(payment),
      footer: '<button class="btn btn-outline" data-act="close">Close</button><button class="btn btn-outline" data-act="download">' + icon('download') + 'Save as file</button><button class="btn btn-primary" data-act="print">' + icon('print') + 'Print receipt</button>',
      onMount(el, close) {
        $('[data-act="close"]', el).addEventListener('click', close);
        $('[data-act="print"]', el).addEventListener('click', () => printElement($('#receiptDoc', el), 'Receipt ' + payment.receiptNo));
        $('[data-act="download"]', el).addEventListener('click', () => {
          download('Receipt_' + payment.receiptNo + '.html', '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ' + payment.receiptNo + '</title><link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/modules.css"></head><body style="background:#fff;padding:30px;max-width:760px;margin:auto">' + $('#receiptDoc', el).outerHTML + '</body></html>', 'text/html');
          toast('Receipt file generated for download.');
        });
      }
    });
    return m;
  }

  global.UI = {
    $, $$, esc, money, num, moneyShort, numberShort, date, dateTime, relTime, greeting,
    initials, avatar, badge, icon, methodChip, methodMeta,
    progress, progressCell, ring,
    modal, confirm: confirmDialog, toast, printElement, download,
    filterRows, debounce, readForm, validate, patterns, clearErrors, fieldError,
    lineChart, donutChart, barChart, emptyState, options,
    receiptHTML, showReceipt, amountWords
  };
})(window);
