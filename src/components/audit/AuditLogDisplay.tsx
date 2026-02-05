import type { AuditLog } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** Format number with PKR thousands separator (1,20,000 style or 120,000) */
function formatPKR(n: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n) + ' PKR';
}

/** Format quantity with unit (e.g. "81 m³", "10 Units") */
function formatQty(qty: number, unit: string | undefined): string {
  const u = unit || 'Units';
  return `${qty} ${u}`;
}

interface AuditLogDisplayProps {
  log: AuditLog;
}

/**
 * Renders audit log in a business-friendly, accountant-readable format.
 * Replaces raw JSON with structured tables and clear before/after summaries.
 */
export function AuditLogDisplay({ log }: AuditLogDisplayProps) {
  const targetType = log.targetType ?? log.module;
  const action = log.action;
  const before = log.beforeData as Record<string, unknown> | undefined;
  const after = log.afterData as Record<string, unknown> | undefined;

  const movementTypeLabels: Record<string, string> = {
    assign_to_project: 'Assign to project',
    return_to_store: 'Return to store',
    mark_lost: 'Mark lost',
    mark_damaged: 'Mark damaged',
    repair_damaged: 'Repair',
    mark_lost_from_damaged: 'Mark lost (unrepairable)',
  };

  // --- Non-consumable Movement ---
  if (targetType === 'NonConsumableMovement' && action === 'create' && after) {
    const itemName = (after.nonConsumableItem as { name?: string })?.name ?? (after.nonConsumableItemId as string) ?? '';
    const projectName = (after.project as { name?: string })?.name ?? '';
    const movementType = (after.movementType as string) ?? '';
    const qty = (after.quantity as number) ?? 0;
    const costVal = after.cost as number | null | undefined;
    const remarksVal = after.remarks as string | null | undefined;
    const createdByName = (after.createdBy as { name?: string })?.name ?? '';

    return (
      <div className="mt-2 space-y-2">
        <p className="text-sm font-medium">
          {movementTypeLabels[movementType] ?? movementType} — {itemName}
        </p>
        <p className="text-sm text-muted-foreground">
          Quantity: {formatQty(qty, undefined)} {projectName && ` • Project: ${projectName}`}
        </p>
        {costVal != null && costVal > 0 && (
          <p className="text-sm"><strong>Repair cost:</strong> {formatPKR(costVal)}</p>
        )}
        {remarksVal && <p className="text-sm"><strong>Remarks:</strong> {remarksVal}</p>}
        {createdByName && <p className="text-sm text-muted-foreground">By: {createdByName}</p>}
      </div>
    );
  }

  // --- Receiving Entry (Non-consumable) ---
  if (targetType === 'ReceivingEntry') {
    const data = action === 'delete' ? before : after;
    const lineItems = (data?.lineItems ?? []) as Array<{
      nonConsumableItem?: { name?: string };
      quantity?: number;
      unitCost?: number;
      lineTotal?: number;
    }>;
    const totalValue = (data?.totalValue as number) ?? 0;
    const remarksVal = (data?.remarks as string) ?? '';
    const createdByName = (data?.createdBy as { name?: string })?.name ?? '';

    if (action === 'delete' && before) {
      return (
        <div className="mt-2 space-y-3">
          <p className="text-sm font-medium">Receiving Entry Deleted</p>
          {totalValue > 0 && <p className="text-sm"><strong>Total value removed:</strong> {formatPKR(totalValue)}</p>}
          {lineItems.length > 0 && (
            <>
              <p className="text-sm font-medium">Items removed from store:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell>{(line.nonConsumableItem as { name?: string })?.name ?? '-'}</TableCell>
                      <TableCell className="text-right">{formatQty(line.quantity ?? 0, undefined)}</TableCell>
                      <TableCell className="text-right">{formatPKR(line.unitCost ?? 0)}</TableCell>
                      <TableCell className="text-right">{formatPKR(line.lineTotal ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      );
    }

    if (action === 'create' && after) {
      return (
        <div className="mt-2 space-y-3">
          <p className="text-sm font-medium">Receiving Entry Created</p>
          {totalValue > 0 && <p className="text-sm"><strong>Total value:</strong> {formatPKR(totalValue)}</p>}
          {remarksVal && <p className="text-sm"><strong>Remarks:</strong> {remarksVal}</p>}
          {createdByName && <p className="text-sm text-muted-foreground">By: {createdByName}</p>}
          {lineItems.length > 0 && (
            <>
              <p className="text-sm font-medium">Items received (added to store):</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell>{(line.nonConsumableItem as { name?: string })?.name ?? '-'}</TableCell>
                      <TableCell className="text-right">{formatQty(line.quantity ?? 0, undefined)}</TableCell>
                      <TableCell className="text-right">{formatPKR(line.unitCost ?? 0)}</TableCell>
                      <TableCell className="text-right">{formatPKR(line.lineTotal ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      );
    }
  }

  // --- Generic fallback (Auth, User, other modules) ---
  if (!targetType || !['VendorInvoice', 'VendorInvoicePayment', 'StockConsumptionEntry', 'ConsumableItem'].includes(targetType)) {
    return (
      <div className="mt-2 space-y-1">
        <p className="text-sm text-muted-foreground">{log.details}</p>
        {((before && Object.keys(before).length > 0) || (after && Object.keys(after ?? {}).length > 0)) && (
          <div className="mt-2 rounded border bg-muted/30 p-3 text-xs">
            {before && Object.keys(before).length > 0 && (
              <p className="text-destructive">Before: {JSON.stringify(before)}</p>
            )}
            {after && Object.keys(after).length > 0 && (
              <p className="text-primary">After: {JSON.stringify(after)}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- Vendor Invoice ---
  if (targetType === 'VendorInvoice') {
    const invNum = (after?.invoiceNumber ?? before?.invoiceNumber) as string | undefined;
    const displayRef = invNum ?? (log.targetId ? `#${log.targetId}` : '');

    if (action === 'delete' && before) {
      const items = (before.items ?? []) as Array<{ name: string; unit: string; quantity: number }>;
      const totalAmount = (before.totalAmount as number) ?? 0;
      const vendorName = (before.vendorName as string) ?? '';

      return (
        <div className="mt-2 space-y-3">
          <p className="text-sm font-medium">
            Invoice {displayRef} deleted
            {totalAmount > 0 && ` (Amount: ${formatPKR(totalAmount)})`}
          </p>
          {vendorName && <p className="text-sm text-muted-foreground"><strong>Vendor:</strong> {vendorName}</p>}
          {items.length > 0 && (
            <>
              <p className="text-sm font-medium">Invoice Items Removed:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity Removed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{formatQty(item.quantity, item.unit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      );
    }

    if (action === 'create' && after) {
      const vendor = after.vendor as { name?: string } | undefined;
      const totalAmount = (after.totalAmount as number) ?? 0;
      const lineItems = (after.lineItems ?? []) as Array<{
        consumableItem?: { name?: string };
        quantity?: number;
        unitCost?: number;
        lineTotal?: number;
        consumableItem?: { unit?: { symbol?: string } };
      }>;

      return (
        <div className="mt-2 space-y-3">
          <p className="text-sm font-medium">Vendor Invoice Created — {displayRef}</p>
          {vendor?.name && <p className="text-sm"><strong>Vendor:</strong> {vendor.name}</p>}
          <p className="text-sm"><strong>Total Amount:</strong> {formatPKR(totalAmount)}</p>
          {lineItems.length > 0 && (
            <>
              <p className="text-sm font-medium">Items Added:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell>{line.consumableItem?.name ?? '-'}</TableCell>
                      <TableCell className="text-right">{formatQty(line.quantity ?? 0, line.consumableItem?.unit?.symbol)}</TableCell>
                      <TableCell className="text-right">{formatPKR(line.unitCost ?? 0)}</TableCell>
                      <TableCell className="text-right">{formatPKR(line.lineTotal ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      );
    }

    if (action === 'update' && before && after) {
      const vendor = (after.vendor ?? before.vendor) as { name?: string } | undefined;
      const totalAmount = (after.totalAmount as number) ?? (before.totalAmount as number) ?? 0;

      const beforeLines = (before.lineItems ?? []) as Array<{
        consumableItem?: { name?: string; unit?: { symbol?: string } };
        quantity?: number;
        lineTotal?: number;
      }>;
      const afterLines = (after.lineItems ?? []) as Array<{
        consumableItem?: { name?: string; unit?: { symbol?: string } };
        quantity?: number;
        lineTotal?: number;
      }>;

      const changes: Array<{ field: string; before: string; after: string }> = [];
      const afterByItem = new Map<string, typeof afterLines[0]>();
      afterLines.forEach((l) => {
        const name = l.consumableItem?.name ?? '-';
        afterByItem.set(name, l);
      });
      beforeLines.forEach((bl) => {
        const name = bl.consumableItem?.name ?? '-';
        const al = afterByItem.get(name);
        if (al && (bl.quantity !== al.quantity || bl.lineTotal !== al.lineTotal)) {
          changes.push({
            field: `Item Quantity (${name})`,
            before: formatQty(bl.quantity ?? 0, bl.consumableItem?.unit?.symbol),
            after: formatQty(al.quantity ?? 0, al.consumableItem?.unit?.symbol),
          });
          changes.push({
            field: `Line Total (${name})`,
            before: formatPKR(bl.lineTotal ?? 0),
            after: formatPKR(al.lineTotal ?? 0),
          });
        }
      });
      if (Number(before.totalAmount) !== Number(after.totalAmount)) {
        changes.push({
          field: 'Total Amount',
          before: formatPKR(Number(before.totalAmount) ?? 0),
          after: formatPKR(Number(after.totalAmount) ?? 0),
        });
      }

      return (
        <div className="mt-2 space-y-3">
          <p className="text-sm font-medium">Vendor Invoice Updated — {displayRef}</p>
          {vendor?.name && <p className="text-sm"><strong>Vendor:</strong> {vendor.name}</p>}
          <p className="text-sm"><strong>Total Amount:</strong> {formatPKR(totalAmount)}</p>
          {changes.length > 0 && (
            <>
              <p className="text-sm font-medium">Field Changes:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Changed</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changes.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.field}</TableCell>
                      <TableCell className="text-destructive">{c.before}</TableCell>
                      <TableCell className="text-primary">{c.after}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      );
    }
  }

  // --- Vendor Invoice Payment ---
  if (targetType === 'VendorInvoicePayment' && action === 'create' && after) {
    const amount = (after.amount as number) ?? 0;
    const invoiceNumber = (after.invoiceNumber as string) ?? '';
    const remainingBalance = (after.remainingBalance as number) ?? 0;
    const paymentMode = (after.paymentMode as string) ?? '';

    const displayRef = invoiceNumber ? (invoiceNumber.startsWith('INV-') ? invoiceNumber : `INV-${invoiceNumber}`) : '';

    return (
      <div className="mt-2 space-y-2">
        <p className="text-sm font-medium">Vendor Payment Recorded — Invoice {displayRef}</p>
        <p className="text-sm"><strong>Payment Amount:</strong> {formatPKR(amount)}</p>
        <p className="text-sm"><strong>Remaining Balance:</strong> {formatPKR(remainingBalance)}</p>
        {paymentMode && <p className="text-sm"><strong>Payment Method:</strong> {paymentMode}</p>}
      </div>
    );
  }

  // --- Stock Consumption Entry ---
  if (targetType === 'StockConsumptionEntry') {
    const projectName = (after?.project as { name?: string })?.name ?? (before?.projectName as string) ?? (before?.project as { name?: string })?.name ?? '';

    if (action === 'delete' && before) {
      const items = (before.items ?? []) as Array<{
        name: string;
        unit: string;
        quantity: number;
        stockBefore?: number;
        stockAfter?: number;
      }>;

      return (
        <div className="mt-2 space-y-3">
          <p className="text-sm font-medium">Stock Consumption Deleted — Project {projectName}</p>
          <p className="text-sm font-medium">Consumption Entry Removed:</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Quantity Removed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{formatQty(item.quantity, item.unit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {items.some((i) => i.stockBefore != null && i.stockAfter != null) && (
            <>
              <p className="text-sm font-medium text-amber-600">Stock Restored:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Stock Before</TableHead>
                    <TableHead className="text-right">Stock After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items
                    .filter((i) => i.stockBefore != null && i.stockAfter != null)
                    .map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{formatQty(item.stockBefore!, item.unit)}</TableCell>
                        <TableCell className="text-right">{formatQty(item.stockAfter!, item.unit)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      );
    }

    if (action === 'create' && after) {
      const lineItems = (after.lineItems ?? []) as Array<{
        consumableItem?: { name?: string; unit?: { symbol?: string } };
        quantity?: number;
      }>;

      return (
        <div className="mt-2 space-y-3">
          <p className="text-sm font-medium">Stock Consumption Created — Project {projectName}</p>
          <p className="text-sm font-medium">Items Consumed:</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((line, i) => (
                <TableRow key={i}>
                  <TableCell>{line.consumableItem?.name ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    {formatQty(line.quantity ?? 0, line.consumableItem?.unit?.symbol)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    if (action === 'update' && before && after) {
      const beforeLines = (before.lineItems ?? []) as Array<{
        consumableItem?: { name?: string; unit?: { symbol?: string } };
        quantity?: number;
      }>;
      const afterLines = (after.lineItems ?? []) as Array<{
        consumableItem?: { name?: string; unit?: { symbol?: string } };
        quantity?: number;
      }>;

      const changes: Array<{ item: string; before: string; after: string }> = [];
      const afterByItem = new Map<string, typeof afterLines[0]>();
      afterLines.forEach((l) => {
        const name = l.consumableItem?.name ?? '-';
        afterByItem.set(name, l);
      });
      beforeLines.forEach((bl) => {
        const name = bl.consumableItem?.name ?? '-';
        const al = afterByItem.get(name);
        if (al && bl.quantity !== al.quantity) {
          changes.push({
            item: name,
            before: formatQty(bl.quantity ?? 0, bl.consumableItem?.unit?.symbol),
            after: formatQty(al.quantity ?? 0, al.consumableItem?.unit?.symbol),
          });
        }
      });

      return (
        <div className="mt-2 space-y-3">
          <p className="text-sm font-medium">Stock Consumption Updated — Project {projectName}</p>
          {changes.length > 0 && (
            <>
              <p className="text-sm font-medium">Item Changes:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changes.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.item}</TableCell>
                      <TableCell className="text-destructive">{c.before}</TableCell>
                      <TableCell className="text-primary">{c.after}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      );
    }
  }

  // --- Consumable Item (Inventory / Stock Adjustment) ---
  if (targetType === 'ConsumableItem') {
    const itemName = (after?.name ?? before?.name) as string ?? '';

    if (action === 'delete' && before) {
      const stock = (before.currentStock as number) ?? 0;
      const unit = (before.unit as { symbol?: string })?.symbol ?? 'Units';

      return (
        <div className="mt-2 space-y-2">
          <p className="text-sm font-medium">Inventory Item Deleted — {itemName}</p>
          <p className="text-sm text-muted-foreground">
            Last recorded stock: {formatQty(stock, unit)}
          </p>
        </div>
      );
    }

    if (action === 'create' && after) {
      const stock = (after.currentStock as number) ?? 0;
      const unit = (after.unit as { symbol?: string })?.symbol ?? 'Units';

      return (
        <div className="mt-2 space-y-2">
          <p className="text-sm font-medium">Inventory Item Created — {itemName}</p>
          <p className="text-sm"><strong>Initial Stock:</strong> {formatQty(stock, unit)}</p>
        </div>
      );
    }

    if (action === 'update' && before && after) {
      const stockBefore = (before.currentStock as number) ?? 0;
      const stockAfter = (after.currentStock as number) ?? 0;
      const unit = (after.unit ?? before.unit) as { symbol?: string } | undefined;
      const unitSym = unit?.symbol ?? 'Units';

      const changes: Array<{ field: string; before: string; after: string }> = [];
      if ((before.name as string) !== (after.name as string)) {
        changes.push({
          field: 'Item Name',
          before: String(before.name ?? '-'),
          after: String(after.name ?? '-'),
        });
      }
      if (stockBefore !== stockAfter) {
        changes.push({
          field: 'Stock (Stock Adjustment)',
          before: formatQty(stockBefore, unitSym),
          after: formatQty(stockAfter, unitSym),
        });
      }

      return (
        <div className="mt-2 space-y-3">
          <p className="text-sm font-medium">Inventory Item Updated — {itemName}</p>
          {changes.length > 0 && (
            <>
              <p className="text-sm font-medium">Stock Adjusted:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Changed</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changes.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.field}</TableCell>
                      <TableCell className="text-destructive">{c.before}</TableCell>
                      <TableCell className="text-primary">{c.after}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      );
    }
  }

  // Fallback: show details only
  return <p className="mt-1 text-sm text-muted-foreground">{log.details}</p>;
}
