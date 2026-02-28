# Project Ledger Pro (BuildERP)

Construction ERP for small-to-mid contractors. It keeps project budgets, materials, people, equipment, and cash in one simple web app so office staff, site managers, and owners all see the same truth.

**Who benefits**
- Business owners who want a single view of cost, cash, and dues across jobs
- Site managers who must log material usage and payments without spreadsheets
- Account/admin teams who reconcile vendors, wages, and bank movements

**What it does (plain language)**
- Shows a live dashboard of active projects, budget vs. spend, bank balance, and what is still owed
- Tracks each project from start/end dates to allocated budget and actual spending
- Keeps one materials system: consumables (cement/steel/etc.) with stock + consumption history, and reusable tools/equipment with where they are (store, in use, repair, lost)
- Handles vendors, contractors, and employees with their own ledgers so you always know billed, paid, and pending amounts
- Records all money movement: bank accounts, inflow/outflow transactions, project expenses by category, and a liabilities view that totals dues across people, suppliers, and machines
- Covers machinery usage (owned or rented) with hours worked, rates, costs, payments, and per-machine ledger
- Protects data with login + roles (Super Admin, Admin, Site Manager), user management, and a full audit log of creates/edits/deletes

**How information is organized**
- Company-level: bank accounts, user management, audit logs, and non-consumable assets live here.
- Project-level: projects, consumable inventory, vendors, contractors, employees, expenses, machinery, and their ledgers are filtered to the chosen project. Site Managers only see their assigned project.

**Feature highlights**
- Dashboard: KPIs for budget, spend, dues; charts for budget vs. spend, liabilities mix, and expense categories; quick links to key modules.
- Projects: create/edit projects, set budgets, track spend and timeline, and flag over-budget jobs.
- Inventory: consumable stock with purchase totals, current balance, and consumption history; non-consumable assets with counts by status and per-asset ledger.
- Payables & partners: vendor tables plus detailed ledgers with purchases and payments; contractor entries and payouts with remaining balance checks.
- People & payroll: fixed and daily-wage employees, salary dues, and per-employee payment ledger.
- Money & controls: bank balances with inflow/outflow lists, expense tracking with categories and filters, liabilities roll-up, machine costs and dues, and print-friendly views for on-site use.

**Run it locally**
```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

**Tech stack**
- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui components
- TanStack Query for data fetching

**Ways to edit**
- Use any IDE locally (clone, install, run `npm run dev`).
- Edit files directly in GitHub (pencil icon) and commit.
- Launch a Codespace from the repo’s Code button for an instant cloud IDE.
