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
- Every payment type — Advance, Salary, and Wage — subtracts from the employee's running ledger balance the same way; there's no special-case where an Advance adds to it. (Daily-wage employees additionally get an `outstandingAdvance` figure — cumulative advance not yet worked off through a given month — shown separately for the salary sheet's net payable; it does not affect the running balance itself.)

## Joining Date & Ending Date
- Joining Date: the date the employee actually started. Salary/attendance data before this month shows "No Data".
- Ending Date: the date the employee actually left. Available for Fixed, Machinery, and Daily-wage employees.
  - Fixed/Machinery: the ending month's salary is prorated (days after the ending date are treated like unpaid leave), and no salary/liability is generated for any month after it — the employee is excluded from liabilities as if no longer employed.
  - Daily wage: salary already depends on attendance being marked, so no extra accrual logic is needed; the ending date is recorded to mark that the employee is no longer with the company. Attendance dated after the ending date is also excluded from payable, as a safety net.
  - The Employees list and ledger detail page show a "Left" badge and treat months after the ending date as "No Data", mirroring the joining-date cutoff.

## Data & Defaults
- Global allowed paid leaves: 4 per month (applies to all fixed-salary employees).
- Overtime rule (daily wage): hourly rate = daily rate / 8; overtime pay = overtime hours × hourly rate.
