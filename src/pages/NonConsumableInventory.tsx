import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { useNonConsumableItems } from "@/hooks/useNonConsumableItems";
import { AddNonConsumableItemDialog } from "@/components/dialogs/AddNonConsumableItemDialog";
import { deleteNonConsumableItem } from "@/services/nonConsumableItemService";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function NonConsumableInventory() {
  const { user } = useAuth();
  const { items, loading, refetch } = useNonConsumableItems();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery]);

  const pagination = useTablePagination(filteredItems, { defaultPageSize: 12 });

  const canEditDelete = user?.role !== "Site Manager";

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteNonConsumableItem(deleteTarget.id);
      toast.success(`Deleted asset "${deleteTarget.name}"`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete asset");
      setDeleteTarget(null);
    }
  };

  const canDelete = (item: { companyStore: number; inUse: number; underRepair: number; lost: number }) =>
    item.companyStore === 0 && item.inUse === 0 && item.underRepair === 0 && item.lost === 0;

  return (
    <Layout>
      <PageHeader
        title="Non-Consumable Inventory"
        subtitle="Tools, assets & reusable equipment — Company-wide"
        printTargetId="nc-table"
        actions={
          <Button variant="warning" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Asset
          </Button>
        }
      />

      <AddNonConsumableItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={refetch}
      />

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div className="flex-1 min-w-[220px] max-w-xs">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search Assets</Label>
          <Input
            className="mt-1"
            placeholder="Name or category"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}" and its ledger entries. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div id="nc-table" className="border-2 border-border">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-muted-foreground">Loading…</div>
          ) : (
            <>
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                    <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Item</th>
                    <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Total</th>
                    <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">In Store</th>
                    <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">In Use</th>
                    <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Repair</th>
                    <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Lost</th>
                    {canEditDelete && (
                      <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider print-hidden">Actions</th>
                    )}
                  </tr>
                </thead>
              <tbody>
                {pagination.paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={canEditDelete ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">
                      {items.length === 0
                        ? "No non-consumable assets yet. Add an asset to start tracking."
                        : "No assets match your search."}
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map((item) => (
                    <tr key={item.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          to={`/inventory/non-consumable/${item.id}`}
                          className="font-bold hover:underline"
                        >
                          {item.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm uppercase text-muted-foreground">{item.category}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold">{item.totalQuantity}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-success">{item.companyStore}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-info">{item.inUse}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-warning">
                        {item.underRepair > 0 ? item.underRepair : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-destructive">
                        {item.lost > 0 ? item.lost : "—"}
                      </td>
                      {canEditDelete && (
                    <td className="px-4 py-3 text-right print-hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={canDelete(item) ? "Delete asset" : "Cannot delete: item has non-zero balances"}
                            disabled={!canDelete(item)}
                            onClick={() => canDelete(item) && setDeleteTarget({ id: item.id, name: item.name })}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              </table>
              <div className="print-hidden">
                <TablePagination
                  pageSize={pagination.pageSize}
                  onPageSizeChange={pagination.setPageSize}
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.totalItems}
                  onPrevious={pagination.goPrev}
                  onNext={pagination.goNext}
                  canPrevious={pagination.canPrev}
                  canNext={pagination.canNext}
                  startIndexOneBased={pagination.startIndexOneBased}
                  endIndex={pagination.endIndex}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
