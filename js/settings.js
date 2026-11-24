/* Ardhi LIMS — Settings and pending clarifications */
(function (global) {
  'use strict';
  const V = global.Views = global.Views || {};
  const $ = UI.$;
  const $$ = UI.$$;

  const PAYMENT_METHODS = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Bank Transfer', 'Cash', 'Cheque'];

  const PENDING = [
    { t: 'Interactive digital plot mapping', s: 'The company currently uses physical maps. Digitisation and an interactive survey map have not been confirmed.' },
    { t: 'Overdue-payment reason workflow', s: 'How overdue reasons are captured, reviewed and escalated is still to be defined. No reason fields are implemented.' },
    { t: 'Plot size expansion approval', s: 'The authority responsible for approving or rejecting customer expansion requests, and the required checks, are pending clarification.' },
    { t: 'Accountant & Cashier permissions', s: 'Both have individual accounts and assigned access, but their complete permission sets are not finalised.' },
    { t: 'Manager reporting scope', s: 'Manager access to operational reports is confirmed; the exact set of staff and reports within scope is still to be confirmed.' },
    { t: 'Transaction approval / correction', s: 'No approval, correction or reversal workflow has been confirmed, so none is implemented in this mockup.' }
  ];

  function statusPill(text, tone) {
    return '<span class="chip" style="' + (tone === 'warn' ? 'color:var(--amber);border-color:#FDE68A;background:#FFFBEB' : '') + '">' + UI.esc(text) + '</span>';
  }

  V.settings = {
    render() {
      const s = Store.db.settings;
      const canWrite = App.can('settingsWrite');
      const isOwner = App.role() === 'Owner';
      const dis = canWrite ? '' : ' disabled';

      const companyForm =
        '<form id="companyForm" novalidate><div class="card-body">' +
          '<div class="notice ' + (canWrite ? 'info' : 'warn') + '" style="margin-bottom:16px">' + Icons.get(canWrite ? 'info' : 'lock') + '<div>' + (canWrite ? 'These details appear on the management system and on printed receipts and reports.' : '<strong>Read-only.</strong> Company profile and sensitive settings can only be changed by the Owner.') + '</div></div>' +
          '<div class="form-grid">' +
            '<div class="field full" data-field="companyName"><label>Company name <span class="req">*</span></label><input class="input" name="companyName" value="' + UI.esc(s.companyName) + '"' + dis + ' /><span class="error-msg">Enter the company name.</span></div>' +
            '<div class="field" data-field="companyEmail"><label>Email address <span class="req">*</span></label><input class="input" name="companyEmail" value="' + UI.esc(s.companyEmail) + '"' + dis + ' /><span class="error-msg">Enter a valid email address.</span></div>' +
            '<div class="field" data-field="companyPhone"><label>Phone number <span class="req">*</span></label><input class="input" name="companyPhone" value="' + UI.esc(s.companyPhone) + '"' + dis + ' /><span class="error-msg">Enter the company phone number.</span></div>' +
            '<div class="field full"><label>Physical address</label><input class="input" name="companyAddress" value="' + UI.esc(s.companyAddress) + '"' + dis + ' /></div>' +
          '</div>' +
          (canWrite ? '<div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn btn-primary" type="submit">' + Icons.get('check') + 'Save company details</button></div>' : '') +
        '</div></form>';

      const prefsForm =
        '<form id="prefsForm" novalidate><div class="card-body">' +
          '<div class="settings-row"><div><div class="sr-title">Currency</div><div class="sr-sub">All monetary records in the system use Tanzanian Shillings.</div></div><div class="sr-control"><span class="chip">' + Icons.get('cash') + 'TZS · fixed</span></div></div>' +
          '<div class="settings-row"><div><div class="sr-title">Receipt number prefix</div><div class="sr-sub">Applies to newly generated simulated receipts, e.g. RCP-2026-0042.</div></div><div class="sr-control"><input class="input" name="receiptPrefix" value="' + UI.esc(s.receiptPrefix) + '" style="width:110px;text-transform:uppercase" maxlength="6"' + dis + ' /></div></div>' +
          '<div class="settings-row"><div><div class="sr-title">Reminder lead time</div><div class="sr-sub">How many days before a due date an upcoming installment reminder is shown or queued.</div></div><div class="sr-control"><input class="input" type="number" min="0" max="30" name="reminderLeadDays" value="' + s.reminderLeadDays + '" style="width:90px"' + dis + ' /><span class="muted small">days</span></div></div>' +
          '<div class="settings-row"><div><div class="sr-title">Grace period</div><div class="sr-sub">Demo ageing buffer before an unpaid installment is highlighted as overdue.</div></div><div class="sr-control"><input class="input" type="number" min="0" max="30" name="gracePeriodDays" value="' + s.gracePeriodDays + '" style="width:90px"' + dis + ' /><span class="muted small">days</span></div></div>' +
          '<div class="settings-row"><div><div class="sr-title">SMS sender ID</div><div class="sr-sub">Displayed sender name for simulated SMS notifications. Not connected to a live gateway.</div></div><div class="sr-control"><input class="input" name="smsSender" value="' + UI.esc(s.smsSender) + '" style="width:110px"' + dis + ' /></div></div>' +
          '<div class="settings-row"><div><div class="sr-title">Installment structure</div><div class="sr-sub">Fixed plans: 6, 12, 18 or 24 months. Flexible plans are individually agreed. Payment frequency: weekly or monthly.</div></div><div class="sr-control"><span class="chip">Fixed & flexible</span><span class="chip">Weekly / Monthly</span></div></div>' +
          '<div class="settings-row"><div><div class="sr-title">Customer portal</div><div class="sr-sub">View-only portal for the signed-in customer. Online payments, invoices and account editing are intentionally excluded.</div></div><div class="sr-control"><a class="btn btn-outline btn-sm" href="customer-portal.html" target="_blank" rel="noopener">' + Icons.get('external') + 'Open portal</a></div></div>' +
          (canWrite ? '<div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn btn-primary" type="submit">' + Icons.get('check') + 'Save preferences</button></div>' : '') +
        '</div></form>';

      return '<div class="page">' +
        '<div class="page-head-row"><div><h2>Settings</h2><div class="sub">Company profile, operational preferences and system readiness. Sensitive settings are Owner-controlled.</div></div>' +
          '<div class="page-actions">' + (isOwner ? '<span class="chip outline">' + Icons.get('shield-check') + 'Owner · sensitive settings</span>' : '<span class="chip">' + Icons.get('lock') + 'Read-only access</span>') + '</div>' +
        '</div>' +
        '<div class="settings-layout">' +
          '<div style="display:grid;gap:18px">' +
            '<div class="card"><div class="card-head"><div><h3>Company profile</h3><div class="sub">Business identity used across the system</div></div></div>' + companyForm + '</div>' +
            '<div class="card"><div class="card-head"><div><h3>Operational preferences</h3><div class="sub">Installments, reminders and receipts</div></div></div>' + prefsForm + '</div>' +
            '<div class="card"><div class="card-head"><div><h3>Approved payment methods</h3><div class="sub">Payment options confirmed in the PRD</div></div></div><div class="card-body" style="padding-top:8px">' +
              '<div style="display:flex;gap:8px;flex-wrap:wrap">' + PAYMENT_METHODS.map(m => UI.methodChip(m)).join('') + '</div>' +
              '<div class="notice" style="margin-top:12px">' + Icons.get('info') + '<div>All payment methods are recorded manually in the system. Payment approvals, corrections and reversals are not part of this mockup.</div></div>' +
            '</div></div>' +
          '</div>' +
          '<div style="display:grid;gap:18px">' +
            '<div class="card"><div class="card-head"><div><h3>Message channels</h3><div class="sub">Interface preview only</div></div></div><div class="card-body" style="padding-top:4px">' +
              ['SMS', 'WhatsApp', 'Email'].map(ch => '<div class="channel-card"><div class="ch-icon">' + Icons.get(ch === 'SMS' ? 'smartphone' : ch === 'WhatsApp' ? 'message' : 'mail') + '</div><div><div class="ch-name">' + ch + '</div><div class="ch-sub">' + (ch === 'SMS' ? 'Sender ID ' + UI.esc(s.smsSender) : ch === 'Email' ? UI.esc(s.companyEmail) : 'Customer phone number') + '</div></div><span class="ch-state">Not connected</span></div>').join('') +
              '<div class="notice warn" style="margin-top:12px">' + Icons.get('alert') + '<div>No SMS, WhatsApp or email gateway is connected. Notifications in this mockup are recorded internally with demo statuses only.</div></div>' +
            '</div></div>' +
            '<div class="card"><div class="card-head"><div><h3>Pending clarification</h3><div class="sub">Requirements not finalised in the PRD</div></div></div><div class="card-body" style="padding-top:4px"><div class="pending-list">' +
              PENDING.map(p => '<div class="pending-item">' + Icons.get('alert') + '<div><div class="t">' + UI.esc(p.t) + '</div><div class="s">' + UI.esc(p.s) + '</div></div></div>').join('') +
            '</div></div></div>' +
            '<div class="card"><div class="card-head"><div><h3>Role & access</h3><div class="sub">Sensitive configuration</div></div></div><div class="card-body">' +
              '<div class="settings-row" style="padding-top:0"><div><div class="sr-title">Privilege management</div><div class="sr-sub">Only the Owner can assign, change or remove user privileges. The Manager has no access to privilege management.</div></div><div class="sr-control">' + statusPill('Owner only', 'warn') + '</div></div>' +
              '<div class="settings-row"><div><div class="sr-title">Operational reports</div><div class="sr-sub">Owner sees all reports. Manager sees operational reports and own/staff activity.</div></div><div class="sr-control">' + statusPill('Owner / Manager') + '</div></div>' +
              '<div class="settings-row"><div><div class="sr-title">Sensitive settings</div><div class="sr-sub">Company identity, receipt numbering, reminder policy and integration status are Owner-controlled.</div></div><div class="sr-control">' + statusPill(isOwner ? 'Owner access' : 'View only') + '</div></div>' +
            '</div></div>' +
            (isOwner ? '<div class="card"><div class="card-head"><div><h3>Demo data</h3><div class="sub">Restore the fictional starting dataset</div></div></div><div class="card-body">' +
              '<div class="notice warn">' + Icons.get('alert') + '<div>Resetting discards all changes made in this browser and restores the original sample data.</div></div>' +
              '<button class="btn btn-danger" style="margin-top:12px" data-act="reset">' + Icons.get('refresh') + 'Reset demo data</button>' +
            '</div></div>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    },

    mount(el) {
      const canWrite = App.can('settingsWrite');
      const company = $('#companyForm', el);
      if (company && canWrite) company.addEventListener('submit', (e) => {
        e.preventDefault();
        const ok = UI.validate(company, [
          { name: 'companyName', required: true, msg: 'Enter the company name.' },
          { name: 'companyEmail', required: true, test: UI.patterns.email, msg: 'Enter a valid email address.' },
          { name: 'companyPhone', required: true, msg: 'Enter the company phone number.' }
        ]);
        if (!ok) return;
        const d = UI.readForm(company);
        Store.updateSettings({ companyName: d.companyName.trim(), companyEmail: d.companyEmail.trim(), companyPhone: d.companyPhone.trim(), companyAddress: d.companyAddress.trim() });
        App.refresh();
        UI.toast('Company profile updated.');
      });

      const prefs = $('#prefsForm', el);
      if (prefs && canWrite) prefs.addEventListener('submit', (e) => {
        e.preventDefault();
        const d = UI.readForm(prefs);
        const prefix = (d.receiptPrefix || '').trim().toUpperCase();
        if (!/^[A-Z0-9]{2,6}$/.test(prefix)) { UI.toast('Receipt prefix must be 2–6 letters or digits.', 'warn'); return; }
        const lead = Number(d.reminderLeadDays);
        const grace = Number(d.gracePeriodDays);
        if (!(lead >= 0 && lead <= 30) || !(grace >= 0 && grace <= 30)) { UI.toast('Reminder lead time and grace period must be between 0 and 30 days.', 'warn'); return; }
        if (!d.smsSender.trim()) { UI.toast('SMS sender ID cannot be empty.', 'warn'); return; }
        Store.updateSettings({ receiptPrefix: prefix, reminderLeadDays: lead, gracePeriodDays: grace, smsSender: d.smsSender.trim() });
        App.refresh();
        UI.toast('Operational preferences saved.');
      });

      const reset = $('[data-act="reset"]', el);
      if (reset) reset.addEventListener('click', async () => {
        const ok = await UI.confirm({
          title: 'Reset demo data?',
          message: 'All changes made during this session will be discarded and the original fictional sample data restored.',
          confirmText: 'Reset data',
          tone: 'danger'
        });
        if (!ok) return;
        Store.reset();
        App.bootApp();
        UI.toast('Demo data has been reset.');
      });
    }
  };
})(window);
