This SRS reflects a Project-Centric Architecture, where the system acts as a "Company Umbrella" hosting multiple, isolated "Project Silos." Financials flow from a global bank pool into project-specific buckets.

1. System Overview & Logic
The system is divided into two distinct scopes:
* Company Scope (Global): Centralized banking, cross-project analytics, user management, and high-level audit trails.
* Project Scope (Local): Isolated dashboards for each project containing its own inventory, workforce, and specific financial liabilities.

2. User Roles & Access Control
2.1 Super Admin (The Oversight)
* Full Visibility: Access to all projects, global financial KPIs, and alerts.
* User Authority: Create/Manage Admins and Site Managers.
* Permission Control: Can toggle "Edit/Delete" permissions for Admins globally.
* Audit Mastery: View comprehensive logs of all actions taken by any user.
2.2 Admin (The Operator)
* Global Operations: Manage bank accounts, company-level expenses, and project creation.
* Operational Control: CRUD (Create, Read, Update, Delete) access to all project-scoped modules.
* Partial User Mgmt: Manage Site Managers and other Admin profiles (unless restricted).
2.3 Site Manager (The Contributor)
* Project Isolation: Can only view and interact with assigned project(s).
* Data Entry: Log daily expenses, stock consumption, and material receipts.
* Immutable Records: Strictly entry-only; cannot edit or delete any record once submitted.

3. Global Modules (Company Level)
3.1 Bank & Accounts Management
* Multi-Account Tracking: Manage multiple bank accounts with real-time balance tracking.
* Transaction Flow: Record all inflows and outflows with source/destination tagging.
* Company Expenses: Dedicated sheet for non-project costs (Rent, Utilities, etc.).
* Payment Modes: Support for Cash, Bank Transfers, and Cheque tracking.
3.2 Analytics & Reporting
* Cross-Project Financials: Compare project performance side-by-side.
* Analytical Dashboards: Visual charts for KPIs, cash flow trends, and budget alerts.

4. Project-Scoped Modules (Individual Dashboards)
4.1 Project Management
* Scoped Dashboards: Unique landing page for each project with localized data.
* Expense Sheets: Project-specific ledgers for materials, labor, and site costs.
* P&L Reports: Automated Profit and Loss calculation per project.
4.2 Inventory Management
Type	Key Features
Consumable	Vehicle-based entry (Vehicle #, Bilty #), receipt logs, and auto-stock calculation.
Non-Consumable	Tracking tools/machinery by status (In Use, Returned, Damaged, Lost).
4.3 Personnel & Salary Management
* Workforce Scoping: Assign employees specifically to projects.
* Flexible Pay Definition: Manage salaries based on Monthly, Weekly, Daily, or Hourly rates.
* Payroll Processing: Automated calculation of advances, deductions, and unpaid dues.
* Asset Assignment: Track company assets (phones, vehicles) assigned to specific personnel.
4.4 Vendors & Contractors
* Entity Profiles: Maintain separate databases for material vendors and civil contractors.
* Liability Tracking: Real-time summary of outstanding payments and advances per project.

5. Security & Data Integrity
5.1 Comprehensive Audit Trail
* Identity Stamping: Every entry is tagged with the User ID and Timestamp.
* History Logs: Full "Before/After" snapshots for any Edit or Delete action performed by Admins or Super Admins.
* Activity Tracking: A searchable timeline of user logins and module access.
5.2 Technical Safeguards
* RBAC: Role-Based Access Control ensures users see only what they are assigned.
* Responsive UI: Optimized for Desktop (Admin) and Mobile/Tablet (Site Manager entry).

Would you like me to generate a Database Schema (ERD) that illustrates how these projects and bank accounts link together?
