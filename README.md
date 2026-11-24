# Ardhi LIMS — Land Installment Management System (frontend prototype)

A fully interactive, fictional demonstration of a land installment management workspace for a Tanzanian land company. Built with **HTML5, CSS3 and vanilla JavaScript (ES6+)** only — no frameworks, libraries, build tools, backend or database.

> This is a frontend prototype. No real authentication, money movement, SMS/WhatsApp/email delivery or digital mapping takes place. All customers, staff, plots and transaction references are fictional. Amounts are in TZS.

## Run it

No installation or build step is required.

1. Open `index.html` directly in a modern browser (Chrome, Edge or Firefox).
2. Sign in with any demo account or the password `demo1234`.
3. The customer portal is a separate page: open `customer-portal.html` (optionally `customer-portal.html?customer=CUS-001`).

If your browser restricts local file access, serve the folder over a simple static server, for example:

```bash
python -m http.server 8080
# then open http://localhost:8080/
```

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Owner | `salma@ardhi.co.tz` | `demo1234` |
| Manager | `juma@ardhi.co.tz` | `demo1234` |
| Accountant | `neema@ardhi.co.tz` | `demo1234` |
| Cashier | `baraka@ardhi.co.tz` | `demo1234` |

Customer portal: use a customer number (e.g. `CUS-001`) or phone number, with password `demo1234`.

## What is included

- **Dashboard** — KPI cards, 8-month collections chart, portfolio donut, project performance, overdue overview, recent payments/sales, upcoming installments and staff activity.
- **Land Management** — projects and plots (CRUD), statuses, intended use, location class, plus a clearly labelled *prototype visualisation* of physical maps (no interactive digital mapping is claimed).
- **Customers & Sales** — customer records with NIDA and next of kin, plot purchase agreements, deposits, agents and fixed/flexible installment plans. Customers automatically receive a view-only portal account.
- **Installment Management** — fixed 6/12/18/24-month and flexible plans, weekly or monthly schedules, progress rings, paid/pending/overdue states and a printable statement.
- **Payment Management** — M-Pesa, Tigo Pesa, Airtel Money, bank transfer, cash and cheque. Recording a payment updates the balance, allocation, installment progress and generates a printable simulated receipt.
- **Notifications & Reminders** — customer reminders, confirmations, receipts and an internal notification centre with the Accountant's "You have a new message." alert. Channels are interface previews only.
- **Reports** — daily/weekly/monthly/annual and custom ranges, printable reports, and role differences (Owner sees all report categories; Manager sees operational reports and staff activity; land and customer reports are Owner-only).
- **User Management** — Owner-only role assignment and privilege changes, staff activity, suspension/reactivation. Manager access is read-only.
- **Settings** — company profile, receipt prefix, reminder lead time, grace period, payment methods, channel connection status and demo data reset.
- **Customer portal** (`customer-portal.html`) — view-only plot details, paid/balance, schedule, payment history, printable receipts, agreement/schedule downloads and plot-size increase requests. No online payments, invoices, editing or access to other customers' data.

## Pending clarifications (intentionally not invented)

The interface marks these as pending instead of inventing policy: complete Accountant/Cashier permissions, Manager's exact scope, overdue-reason workflow, plot-size expansion approval workflow, digital mapping, and any transaction approval, correction or reversal workflow.

## Data and reset

All data is seeded deterministically in the browser relative to today's date and stored in `localStorage` (`ardhi_lims_db`). Sign-in state uses `ardhi_lims_session`; the portal uses `ardhi_lims_portal_customer`. To restore the original fictional dataset, use **Settings → Reset demo data** or clear the site's local storage.

## File structure

```
index.html               Admin console shell
customer-portal.html     Customer portal shell
css/style.css            Design tokens, layout, components
css/dashboard.css        Dashboard-specific styles
css/modules.css          Module, table, modal, receipt styles
css/portal.css           Customer portal styles
css/responsive.css       Tablet/mobile adjustments
js/icons.js              Inline SVG icon set
js/sample-data.js        Deterministic fictional seed data
js/store.js              Persistence, domain logic, calculations
js/ui.js                 UI utilities, charts, modals, toasts, printing
js/dashboard.js ... js/settings.js   Feature modules
js/app.js                Routing, auth/session, navigation shell
js/customer-portal.js    Portal logic
```
