# Vendor, Inventory (Consumable), and Vendor Invoices / Stock Consumption – Backend Plan

This plan covers implementing the backend for **Vendors**, **Inventory (consumable only)**, **Vendor Invoices** (with payments), **Stock Consumption**, and wiring **vendor invoices** and **stock consumption** to **inventory** (add/deduct stock). All mock data for these entities will be removed and replaced with real API calls.

---

## 1. Scope and Conventions

- **Project-scoped where applicable**: Stock consumption is project-scoped; site managers see only their assigned projects. Vendors, units, consumable items, and vendor invoices are **company-scoped** (no `project_id`).
- **Audit**: All create/update/delete for these entities use `AuditService::log()`.
- **Policies**: Vendors and company-level resources: site manager = Create + Read only; admin/super_admin = full CRUD (respecting `canEdit`/`canDelete` where applied). Stock consumption: project-scoped with ProjectPolicy-style access.
- **Inventory (consumable only)**: This implementation covers consumable items and units only. Non-consumable equipment remains mock for now.

---

## 2. Backend Entities and Relationships

| Entity | Scope | Key fields | Notes |
|--------|--------|------------|--------|
| **Unit** | Company | id, name, symbol | Used by ConsumableItem |
| **Vendor** | Company | id, name, contact_person, phone, email | total_billed/total_paid/outstanding computed from invoices |
| **ConsumableItem** | Company | id, name, unit_id, current_stock | Stock updated by invoice (add) and consumption (deduct) |
| **VendorInvoice** | Company | id, vendor_id, vehicle_number, bilty_number, invoice_date, total_amount, paid_amount, remaining_amount, invoice_number?, created_by | |
| **VendorInvoiceLineItem** | — | invoice_id, consumable_item_id, quantity, unit_cost, line_total | On invoice create: add quantity to ConsumableItem.current_stock |
| **VendorInvoicePayment** | — | id, invoice_id, amount, date, payment_mode, reference, created_by | On create: update invoice paid_amount, remaining_amount |
| **StockConsumptionEntry** | Project | id, project_id, remarks, created_by, created_at | Project-scoped list |
| **StockConsumptionLineItem** | — | consumption_entry_id, consumable_item_id, quantity | On entry create: subtract quantity from ConsumableItem.current_stock |

---

## 3. Implementation Order

### Phase A: Database and models

1. **Migrations**
   - `create_units_table` (id, name, symbol, timestamps)
   - `create_vendors_table` (id, name, contact_person, phone, email, timestamps)
   - `create_consumable_items_table` (id, name, unit_id, current_stock default 0, timestamps)
   - `create_vendor_invoices_table` (id, vendor_id, vehicle_number, bilty_number, invoice_date, total_amount, paid_amount, remaining_amount, invoice_number nullable, created_by user_id, timestamps)
   - `create_vendor_invoice_line_items_table` (id, vendor_invoice_id, consumable_item_id, quantity, unit_cost, line_total, timestamps)
   - `create_vendor_invoice_payments_table` (id, vendor_invoice_id, amount, date, payment_mode, reference nullable, created_by user_id, timestamps)
   - `create_stock_consumption_entries_table` (id, project_id, remarks, created_by user_id, timestamps)
   - `create_stock_consumption_line_items_table` (id, stock_consumption_entry_id, consumable_item_id, quantity, timestamps)

2. **Models**
   - `Unit`, `Vendor`, `ConsumableItem`, `VendorInvoice`, `VendorInvoiceLineItem`, `VendorInvoicePayment`, `StockConsumptionEntry`, `StockConsumptionLineItem`
   - Relationships: Vendor hasMany VendorInvoice; VendorInvoice hasMany line items and payments; ConsumableItem belongsTo Unit; StockConsumptionEntry belongsTo Project, hasMany line items; etc.

### Phase B: Policies and authorization

3. **Policies**
   - **VendorPolicy**: viewAny/view/create/update/delete — site_manager: viewAny, view, create only; admin/super_admin: full, with canEdit/canDelete for admin.
   - **UnitPolicy**: same pattern (company-level, site manager create+read).
   - **ConsumableItemPolicy**: same pattern.
   - **VendorInvoicePolicy**: same (company-level).
   - **StockConsumptionEntry**: project-scoped — viewAny/view: filter by assigned projects for site_manager; create: allowed for site_manager on assigned project; update/delete: per canEdit/canDelete for admin, not for site_manager.

### Phase C: API controllers and inventory logic

4. **UnitController**
   - `index` (list units), `store`, `show`, `update`, `destroy` (optional; consider soft constraints if used by consumables).
   - Audit on create/update/delete.

5. **VendorController**
   - `index`, `store`, `show`, `update`, `destroy`.
   - Return computed total_billed, total_paid, outstanding (from invoices) in index/show.
   - Audit on create/update/delete.

6. **ConsumableItemController**
   - `index`, `store`, `show`, `update`, `destroy`.
   - Eager load unit for display. Audit on create/update/delete.

7. **VendorInvoiceController**
   - `index` (with optional vendor filter), `store`, `show` (with line items and payments), `update` (optional), `destroy` (optional; may restrict if payments exist).
   - **Store**: Validate vendor_id, line items (consumable_item_id, quantity, unit_cost). Create invoice, create line items, **add each line’s quantity to ConsumableItem.current_stock**, set paid_amount=0, remaining_amount=total_amount. Audit.
   - **Show**: Return invoice + line_items + payments; optionally embed consumable item names and unit.

8. **VendorInvoicePaymentController** (nested or separate)
   - `store` for a given invoice: validate amount ≤ remaining_amount. Create payment, then **update invoice**: paid_amount += amount, remaining_amount -= amount. Audit.

9. **StockConsumptionEntryController**
   - `index`: project-scoped (site_manager: only assigned projects); filter by project_id optional.
   - `store`: validate project_id (user must have access), validate line items (consumable_item_id, quantity), validate available stock (current_stock >= quantity). Create entry and line items; **deduct each line’s quantity from ConsumableItem.current_stock**. Audit.

### Phase D: Routes

10. **API routes** (under `auth:sanctum`)
    - `apiResource('units', UnitController::class)` (or scoped as needed)
    - `apiResource('vendors', VendorController::class)`
    - `apiResource('consumable-items', ConsumableItemController::class)` (or similar path)
    - `apiResource('vendor-invoices', VendorInvoiceController::class)`
    - `POST vendor-invoices/{id}/payments` → VendorInvoicePaymentController@store (or nested resource)
    - `apiResource('stock-consumption-entries', StockConsumptionEntryController::class)` (index project-scoped)

### Phase E: Frontend – remove mock, use API

11. **Services (frontend)**
    - `unitService.ts`: getUnits, createUnit, updateUnit, deleteUnit (if needed).
    - `vendorService.ts`: getVendors, createVendor, updateVendor, deleteVendor.
    - `consumableItemService.ts`: getConsumableItems, createConsumableItem, updateConsumableItem, deleteConsumableItem.
    - `vendorInvoiceService.ts`: getVendorInvoices, getVendorInvoice(id), createVendorInvoice(invoice + lines), recordPayment(invoiceId, payment).
    - `stockConsumptionService.ts`: getStockConsumptionEntries(projectId?), createStockConsumptionEntry(projectId, remarks, lines).

12. **Pages and components**
    - **Vendors.tsx**: Replace mockVendors with vendorService; load list on mount; handle add/edit/delete with API calls; refresh after mutate.
    - **Inventory.tsx** (consumable tab only for this task): Replace mockConsumables and mockUnits with consumableItemService and unitService; load list on mount; add/edit/delete consumable via API. Keep non-consumable tab as mock for now.
    - **VendorInvoices.tsx**: Replace mock vendor invoices, line items, payments, vendors, consumables, units with API; fetch invoices (and vendors/consumables/units for dropdowns); create invoice and record payment via API; refresh after mutate.
    - **StockConsumption.tsx**: Replace mock entries/line items with stockConsumptionService; fetch entries (project-scoped); create entry via API; ensure consumables list from API for dropdown.
    - **Modals**: VendorDialog, VendorInvoiceDialog, VendorInvoicePaymentDialog, StockConsumptionDialog, InventoryDialog (consumable part) — ensure they receive data from props/callbacks that come from API (e.g. vendors list, consumables list, units list from services, not mockData).

13. **Mock data cleanup**
    - Remove from `mockData.ts`: mockVendors, mockUnits, mockConsumables, mockVendorInvoices, mockVendorInvoiceLineItems, mockVendorInvoicePayments, mockStockConsumptionEntries, mockStockConsumptionLineItems.
    - Remove any imports of these mocks from Vendors, Inventory, VendorInvoices, StockConsumption, and related modals. Replace with API-backed state.

---

## 4. Inventory Connection Summary

- **Vendor invoice created** → For each line item: `ConsumableItem::whereId($consumable_item_id)->increment('current_stock', $quantity)`.
- **Stock consumption entry created** → For each line item: validate `current_stock >= quantity`, then `ConsumableItem::decrement('current_stock', $quantity)` (or increment by negative). Optionally lock row to avoid race.

---

## 5. Checklist (to stick to the plan)

- [ ] Phase A: Migrations and models
- [ ] Phase B: Policies and authorization
- [ ] Phase C: Unit, Vendor, ConsumableItem, VendorInvoice, VendorInvoicePayment, StockConsumptionEntry controllers and inventory add/deduct logic
- [ ] Phase D: API routes registered
- [ ] Phase E: Frontend services (unit, vendor, consumableItem, vendorInvoice, stockConsumption)
- [ ] Phase E: Pages and modals switched to API; mock data removed for these entities

---

## 6. Optional Enhancements (post-MVP)

- Invoice number auto-generation (e.g. INV-YYYY-NNN).
- Prevent deleting consumable item if used in invoices or consumption.
- Prevent deleting vendor if has invoices.
- Stock consumption: strict validation that current_stock never goes below zero (with DB lock or transaction).
