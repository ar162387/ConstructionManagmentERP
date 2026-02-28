# Employee Management – Features & User Flows

## Main Employees View
- Month-scoped list, project filter (or auto project for Site Manager), search, payment-status filter.
- Employee type tabs (Fixed Salary / Daily Wage) above the table.
- Columns: Name, Role, Rate, This Month (attendance summary), Overtime (daily), Payable, Paid, Remaining, Total (all months), Payment Status.
- Rows are clickable, opening the employee’s detail ledger page for the selected month.
- Add Employee dialog supports Fixed or Daily, role, project selection, salary/rate, phone.

## Month Controls
- Month selector with previous/next buttons and dropdown of surrounding months.
- Affects list KPIs and snapshots; payment ledger on detail page remains all-time.

## Employee Detail Page
- Summary KPIs: Salary/Wages, Payable, Paid, Remaining, Payment Status, attendance/overtime snapshot, unpaid-leave deduction (fixed), overtime pay (daily).
- Payments Ledger: shows all months (not filtered), with Date/Month/Amount/Type/Method/Remarks; quick actions for Advance, Partial, Full Remaining.
- Attendance:
  - Fixed Salary: calendar popups with Present, Absent, Paid Leave, Unpaid Leave; global paid-leave quota (default 4) with paid/unpaid split.
  - Daily Wage: calendar popups with Present/Absent/Leave plus hours worked and overtime hours per day.

## Payment Actions
- Record payment modal with quick options (Advance, Partial, Full Remaining), date, amount, method, remarks.
- Payments immediately reflected in KPIs and ledger.

## Data & Defaults
- Global allowed paid leaves: 4 per month (applies to all fixed-salary employees).
- Overtime rule (daily wage): hourly rate = daily rate / 8; overtime pay = overtime hours × hourly rate.
