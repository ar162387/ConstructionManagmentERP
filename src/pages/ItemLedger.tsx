import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { formatCurrency } from "@/lib/mock-data";
import { useItemLedger } from "@/hooks/useItemLedger";
import { getConsumableItem } from "@/services/consumableItemsService";
import { deleteItemLedgerEntry, type ApiItemLedgerEntry } from "@/services/itemLedgerService";
import { AddLedgerEntryDialog } from "@/components/dialogs/AddLedgerEntryDialog";
import { TablePagination } from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE_OPTIONS = [12, 24, 50, 100];

export default function ItemLedger() {
  const { itemId } = useParams<{ itemId: string }>();
  const { user } = useAuth();
  const canEditDelete = user?.role !== "Site Manager";

  const [item, setItem] = useState<{ id: string; projectId: string; name: string; unit: string; currentStock: number; totalAmount: number; totalPaid: number; totalPending: number } | null>(null);
  const [itemLoading, setItemLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;
    setItemLoading(true);
    getConsumableItem(itemId)
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setItemLoading(false));
  }, [itemId]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const { entries, total, loading: ledgerLoading, refetch } = useItemLedger(itemId ?? "", page, pageSize);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndexOneBased = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ApiItemLedgerEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<ApiItemLedgerEntry | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteEntry || !itemId) return;
    try {
      await deleteItemLedgerEntry(itemId, deleteEntry.id);
      toast.success("Ledger entry deleted — item and vendor totals updated");
      setDeleteEntry(null);
      refetch();
      // Refresh item stats
      getConsumableItem(itemId).then(setItem).catch(() => null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete entry");
      setDeleteEntry(null);
    }
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  if (itemLoading) {
    return <Layout><p className="text-muted-foreground p-6">Loading…</p></Layout>;
  }

  if (!item) {
    return <Layout><p className="text-destructive p-6">Item not found.</p></Layout>;
  }

  return (
    <Layout>
      <Link to="/inventory/consumable" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Back to Inventory
      </Link>

      <PageHeader
        title={`${item.name} Ledger`}
        subtitle={`Unit: ${item.unit} — Current Stock: ${item.currentStock.toLocaleString()}`}
        printTargetId="item-ledger"
        actions={
          <Button variant="warning" size="sm" onClick={() => setAddEntryOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />Add Entry
          </Button>
        }
      />

      <AddLedgerEntryDialog
        open={addEntryOpen}
        onOpenChange={setAddEntryOpen}
        itemId={item.id}
        itemName={item.name}
        projectId={item.projectId}
        editEntry={null}
        onSuccess={() => {
          setAddEntryOpen(false);
          refetch();
          getConsumableItem(item.id).then(setItem).catch(() => null);
        }}
      />
      {editEntry && (
        <AddLedgerEntryDialog
          open={!!editEntry}
          onOpenChange={(open) => !open && setEditEntry(null)}
          itemId={item.id}
          itemName={item.name}
          projectId={item.projectId}
          editEntry={editEntry}
          onSuccess={() => {
            setEditEntry(null);
            refetch();
            getConsumableItem(item.id).then(setItem).catch(() => null);
          }}
        />
      )}

      <AlertDialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ledger entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the item stock addition and vendor totals for this entry. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard label="Current Stock" value={item.currentStock.toLocaleString()} variant="info" />
        <StatCard label="Total Amount" value={formatCurrency(item.totalAmount)} />
        <StatCard label="Total Paid" value={formatCurrency(item.totalPaid)} variant="success" />
        <StatCard label="Pending" value={formatCurrency(item.totalPending)} variant={item.totalPending > 0 ? "destructive" : "default"} />
      </div>

      <div id="item-ledger" className="border-2 border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                <th className="px-3 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Date</th>
                <th className="px-3 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Qty</th>
                <th className="px-3 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Unit Price</th>
                <th className="px-3 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Total</th>
                <th className="px-3 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Paid</th>
                <th className="px-3 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Due</th>
                <th className="px-3 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Vendor</th>
                <th className="px-3 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Payment</th>
                <th className="px-3 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Ref / Vehicle</th>
                {canEditDelete && (
                  <th className="px-3 py-2.5 text-right text-sm font-bold uppercase tracking-wider print-hidden">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {ledgerLoading ? (
                <tr><td colSpan={canEditDelete ? 10 : 9} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={canEditDelete ? 10 : 9} className="px-4 py-8 text-center text-muted-foreground">No ledger entries yet. Add one to record a purchase.</td></tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="px-3 py-3 text-sm">{entry.date}</td>
                    <td className="px-3 py-3 text-right font-mono text-sm">{entry.quantity}</td>
                    <td className="px-3 py-3 text-right font-mono text-sm">{formatCurrency(entry.unitPrice)}</td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-bold">{formatCurrency(entry.totalPrice)}</td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-success">{formatCurrency(entry.paidAmount)}</td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-destructive">{entry.remaining > 0 ? formatCurrency(entry.remaining) : "—"}</td>
                    <td className="px-3 py-3 text-sm font-bold">{entry.vendorName}</td>
                    <td className="px-3 py-3 text-sm">{entry.paymentMethod}</td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">
                      {entry.referenceId && <span>{entry.referenceId}</span>}
                      {entry.vehicleNumber && <span className="block">{entry.vehicleNumber}</span>}
                      {entry.biltyNumber && <span className="block text-xs">Bilty: {entry.biltyNumber}</span>}
                    </td>
                    {canEditDelete && (
                    <td className="px-3 py-3 text-right print-hidden">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditEntry(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteEntry(entry)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!ledgerLoading && entries.length > 0 && (
          <div className="print-hidden">
            <TablePagination
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              page={page}
              totalPages={totalPages}
              totalItems={total}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              canPrevious={page > 1}
              canNext={page < totalPages}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              startIndexOneBased={startIndexOneBased}
              endIndex={endIndex}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
