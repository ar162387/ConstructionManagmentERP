

## Software Requirement Specification (SRS)

## Web-Based Construction Company ERP System

# 1. Introduction

## 1.1 Purpose

This document defines functional and non-functional requirements for a **Web-Based Construction Company ERP System**. The system centralizes operations for **projects, finance, inventory, banks/accounts, vendors, employees, assets, liabilities, and audit logs**, with strict role-based control.

## 1.2 Scope

The system will:

* Manage **multiple construction projects**
* Track **financial transactions** in near real-time
* Manage inventory in two categories:

  * **Consumable inventory** (materials that reduce/finish)
  * **Non-consumable inventory** (tools/assets that move across projects)
* Maintain person-wise and entity-wise ledgers
* Enforce **RBAC** (role-based access control)
* Provide transparency through **reports + full audit trail**
* Be accessible via modern browsers (desktop/tablet/mobile)

---

# 2. User Roles & Access Control (RBAC)

## 2.1 Super Admin

**Full company-level control**

* Create/manage all projects and all master data
* Access company-wide dashboard, analytics, and cross-project reporting
* View full audit logs (system-wide)
* Can restrict Admin actions via system policy:

  * Example toggles: “Admin cannot delete”, “Admin cannot edit financial records”, etc.

## 2.2 Admin

**Operational company-level control**

* Create/edit/delete project records (as permitted by Super Admin restrictions)
* Manage most company-level modules (except creating/editing Super Admin or other Admin users)
* Can view **project-level dashboards**
* Cannot access **multi-project strategic analytics** if restricted

## 2.3 Site Manager

**Project-scoped entry role**

* Can be assigned to **only one project**
* Create entries only (no edit/delete)
* Can view only assigned project records
* No access to: user management, global dashboards, company-level banks/accounts, logs, system policies

---

# 2.4 Global vs Project Scope (Important Rule)

**Company-level modules** (Super Admin + Admin only):

* User Management
* Audit Logs (system-wide)
* Bank & Accounts
* Main dashboard (cross-project)

**Project-level modules** (scoped per project):

* Inventory (consumable + non-consumable)
* Vendors, Contractors
* Employees & Salaries
* Expenses
* Machinery/Assets utilization
* Project reports & liabilities visualization

---

# 3. Functional Requirements

# 3.1 Project Management

## 3.1.1 Create Project (Required Fields)

* Project Name (required, unique per company suggested)
* Description (optional)
* Allocated Budget (required)
* Status (required): `Active | On Hold | Completed`
* Start Date (optional)
* End Date (optional)

## 3.1.2 Project Scope Rule

Each project maintains its own:

* Consumable inventory & consumption
* Non-consumable assets usage
* Vendors/contractors
* Employees (fixed/per day)
* Machinery utilization
* Expenses

---

# 3.2 Inventory Management

## 3.2.1 Consumable Inventory (Materials)

### A) Item Master Creation

* Item Name (required, case-insensitive unique)
* Unit (required, case-insensitive unique)

  * Example: `kg`, `bag`, `ft`, `piece`

### B) Consumable Inventory List View (Per Project)

Each item shows:

* Item Name
* Current Stock (live)
* Total Stock Purchased (lifetime)
* Total Amount (sum of purchases)
* Total Paid
* Total Pending

### C) Item Ledger (On Item Click)

Each entry includes:

* Date (required)
* Quantity Added (required)
* Unit Price / Total Price (required)
* Paid Amount (optional; default 0)
* Remaining Amount (auto = Total - Paid)
* Vendor (required) – searchable dropdown from vendor records
* Bilty Number (optional)
* Vehicle Number (optional)
* Payment Method (optional): `Cash | Bank | Online`
* Reference/Cheque ID (optional; enabled only if method is Bank/Online)
* Remarks (optional)

**System Behavior**

* Every ledger entry updates:

  * Item stock
  * Item totals (paid/pending)
  * Vendor totals (billed/paid/pending)

### D) Stock Consumption Module

Entry fields:

* Date (required)
* Project (auto-selected for Site Manager; selectable for Admin/Super Admin view)
* Remarks (optional)
* Items list (required) where each row contains:

  * Item Name (dropdown)
  * Quantity Used (required)

**System Behavior**

* On submission, quantities are deducted from Current Stock
* Prevent negative stock (validation rule)

---

## 3.2.2 Non-Consumable Inventory (Tools / Reusable Assets) — Refined

### Core Concept

Non-consumables are **assets** that can move across projects over time:

* Purchased by company / project
* Assigned to a project (in use)
* Can be transferred between projects
* Can be returned back to company store
* Can be marked damaged/repairable/lost

This module must behave like an **asset tracking + movement ledger**, not like consumable stock only.

---

### A) Non-Consumable Item Master

For each non-consumable asset type:

* Item Name (required, case-insensitive unique)
* Optional: Unit Type (default `piece`) *(recommended)*
* Optional: Item Category (tools, scaffolding, shuttering, safety gear, etc.)

> You said “name only” — that’s okay, but adding Category improves reporting.

---

### B) Non-Consumable Asset Ledger (Per Item)

When clicking an item, open its ledger with **event-based entries**.

Each ledger entry MUST have:

* Date (required)
* Event Type (required):

  1. `Purchase/Add Stock`
  2. `Assign to Project`
  3. `Return to Company`
  4. `Transfer Project → Project`
  5. `Repair / Maintenance`
  6. `Mark Lost`
  7. `Mark Damaged (Still usable / Not usable)`
* Quantity (required)
* Unit Price / Cost (required only for Purchase/Repair events)
* Vendor Name (optional text OR dropdown)

  * **Recommendation:** allow both:

    * dropdown from vendor module if available
    * or manual entry
* Remarks (optional)
* Created By (auto from logged-in user)
* Attachment optional (optional, future): invoice/receipt image

---

### C) Location & Availability Logic (Most Important)

The system must always know **where the items currently are**:

**Asset Location Types**

* `Company Store`
* `Project: <ProjectName>`

**Availability Status**

* `Available` (in company store, usable)
* `In Use` (assigned to a project)
* `Under Repair`
* `Lost`
* `Damaged`

**Rules**

* `Assign to Project` decreases “Company Store Available” and increases “In Use on Project”
* `Return to Company` decreases project “In Use” and increases company “Available”
* `Transfer Project → Project` moves quantity between projects without returning to company
* `Repair` does not change location unless explicitly set (optional advanced)
* `Lost` permanently reduces total available quantity

---

### D) Site Manager Access Flow (Your “design it accordingly” requirement)

Since Site Manager is project-scoped:

* Site Manager can ONLY:

  * View assigned project’s non-consumable stock currently “In Use”
  * Create entries:

    * `Return to Company`
    * `Mark Damaged`
    * `Mark Lost`
    * Optional: `Request Transfer` (creates request, Admin approves) *(recommended for control)*

**Admin/Super Admin**

* Can purchase/add stock
* Can assign to project
* Can transfer project → project
* Can approve/deny transfer requests (if enabled)

---

### E) Non-Consumable Summary View (Per Project)

Show tables:

1. **Currently In Use**

* Item name
* Quantity
* Status breakdown (usable/damaged/under repair)

2. **Movement History**

* Filter by date and event type

3. **Company Store Stock**

* Total available across company (Admin/Super Admin)

---

### F) Repairs / Maintenance (Clearer than “item repaired with quantity and price”)

Repair ledger entry includes:

* Date
* Quantity repaired
* Repair cost
* Repair vendor (optional)
* Notes
  **Effect**
* If item was “Under Repair”, it can be moved back to “Available” or “In Use” depending on location.

---

# 3.3 Bank & Accounts Management (Company Level)

* Add/manage multiple bank accounts
* Maintain opening balances
* Record transactions:

  * Inflow / Outflow
  * Date
  * Amount
  * Source / Destination
  * Mode: `Cash | Bank | Online`
  * Reference ID / Cheque No (optional)
  * Remarks
* Generate:

  * Bank ledger
  * Account statements
  * Date-wise filtering & export (optional future)

---

# 3.4 Expense Management (Project Level)

Fields:

* Date (required)
* Description (required)
* Category (searchable dropdown + “one-click create”)
* Payment Mode (required): `Cash | Bank | Online`
* Amount (required)
* Project (auto for Site Manager; selectable for Admin/Super Admin global view)

---

# 3.5 Vendor Management (Project Level)

Vendor profile:

* Name (required)
* Phone (optional)
* Description (optional)

Vendor financials:

* Total Billed (auto from consumable ledgers)
* Total Paid (auto)
* Remaining (auto)

Vendor ledger view:

* Pull from consumable inventory ledgers:

  * Date, item, qty, total, paid, due
* Additional “Vendor Payment Entry” screen:

  * allows paying pending dues later (linked to bank/cash)

---

# 3.6 Employee Management (Project Level)

## 3.6.1 Employee Types

1. Fixed Monthly Salary
2. Daily Wage (8 hours = 1 day)

### Fixed Salary Features

* Monthly attendance marking
* Allowed leaves configuration
* Salary deduction rules (absent/late optional)
* Advance salary support
* Late payment support
* Salary ledger:

  * month, payable, paid, due, payment date, method

### Daily Wage Features

* Daily attendance entries:

  * Date
  * Hours worked (default 8)
  * Overtime hours (if > 8)
  * Daily rate
  * Overtime rate (auto derived: dailyRate / 8)
* Salary calculation auto:

  * base = dailyRate
  * overtime = overtimeHours * (dailyRate/8)
* Payment tracking (paid/due)

---

# 3.7 Liabilities Visualization (Per Project)

Dashboards / summaries:

* Vendor pending payments
* Contractor pending payments (if contractors module exists)
* Salary dues
* Entity-wise outstanding summary
* Filters: date range, entity, category

---

# 3.8 Asset / Machinery Management

* Machinery types: `Company Owned | Rented`
* Create machine fields:

  * Name
  * Ownership
  * Hourly Rate
* Machine ledger entries:

  * Date
  * Hours worked
  * Used by (person name / employee dropdown optional)
  * Total cost (auto = hours * rate)
  * Paid amount
  * Remaining
  * Remarks

---

# 3.9 Logs & Audit Trail

System must record:

* Who created each entry
* Timestamp (create)
* Admin edits:

  * old value → new value
  * edit timestamp
* Admin deletions:

  * soft-delete recommended
  * keep deletion reason optional
* User activity timeline (Super Admin only)

---

# 4. Non-Functional Requirements

* Secure authentication (hashed passwords, session/token security)
* Strict RBAC enforcement on API + UI
* Responsive UI (mobile + desktop)
* Data integrity (transactions, validations, no negative stock, consistent ledgers)
* Performance optimized for large datasets (pagination, indexing)
* Backup & recovery strategy
* Reliability: prevent accidental data loss (soft delete, audit trail)

