import { useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { formatCurrency } from "@/lib/mock-data";
import { useVendors } from "@/hooks/useVendors";
import { useVendorLedger } from "@/hooks/useVendorLedger";
import { VendorPaymentDialog } from "@/components/dialogs/VendorPaymentDialog";
import { ApplyAdvanceDialog } from "@/components/dialogs/ApplyAdvanceDialog";
import { TablePagination } from "@/components/TablePagination";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { deleteVendorPayment } from "@/services/vendorPaymentService";
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

export default function VendorLedger() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const [searchParams] = useSearchParams();
  const fromLiabilities = searchParams.get("returnTo") === "liabilities";
  const { user } = useAuth();
  const canEditDelete = user?.role !== "Site Manager";

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { vendors, loading: vendorLoading } = useVendors();
  const vendor = vendors.find((v) => v.id === vendorId);

  const { ledger, loading: ledgerLoading, refetch } = useVendorLedger(
    vendorId ?? "",
    page,
    pageSize,
    startDate || undefined,
    endDate || undefined
  );

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setPage(1);
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setPage(1);
  };

  const total = ledger?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndexOneBased = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [applyAdvanceOpen, setApplyAdvanceOpen] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const handleDeletePayment = async () => {
    if (!deletePaymentId || !vendorId) return;
    try {
      await deleteVendorPayment(vendorId, deletePaymentId);
      toast.success("Payment deleted — vendor balance updated");
      setDeletePaymentId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete payment");
      setDeletePaymentId(null);
    }
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  if (!vendorId) return null;
  if (vendorLoading) return <Layout><p className="text-muted-foreground p-6">Loading vendor…</p></Layout>;
  if (!vendor) return <Layout><p className="text-destructive p-6">Vendor not found.</p></Layout>;

  const totalBilled = ledger?.totalBilled ?? vendor.totalBilled;
  const totalPaid = ledger?.totalPaid ?? vendor.totalPaid;
  const remaining = ledger?.remaining ?? vendor.remaining;
  const advanceBalance = ledger?.advanceBalance ?? vendor.advanceBalance;

  return (
    <Layout>
      <Link
        to={fromLiabilities ? "/liabilities" : "/vendors"}
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> {fromLiabilities ? "Back to Liabilities" : "Back to Vendors"}
      </Link>

      <PageHeader
        title={`${vendor.name} — Ledger`}
        subtitle={vendor.description}
        printTargetId="vendor-ledger"
        actions={
          <div className="flex items-center gap-2">
            {advanceBalance > 0 && (
              <Button variant="outline" size="sm" onClick={() => setApplyAdvanceOpen(true)}>
                Apply Advance ({advanceBalance.toLocaleString()})
              </Button>
            )}
            <Button variant="warning" size="sm" onClick={() => setPaymentOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />Record Payment
            </Button>
          </div>
        }
      />

      <VendorPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        vendor={{ ...vendor, totalBilled, totalPaid, remaining, advanceBalance }}
        onSuccess={() => { setPaymentOpen(false); refetch(); }}
      />

      <ApplyAdvanceDialog
        open={applyAdvanceOpen}
        onOpenChange={setApplyAdvanceOpen}
        vendor={{ ...vendor, totalBilled, totalPaid, remaining, advanceBalance }}
        onSuccess={() => { setApplyAdvanceOpen(false); refetch(); }}
      />

      <AlertDialog open={!!deletePaymentId} onOpenChange={(open) => !open && setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the payment and restore the vendor's outstanding balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-wrap items-end gap-3 mb-4 print-hidden">
        <div className="min-w-[180px]">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start date</Label>
          <Input
            type="date"
            className="mt-1"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </div>
        <div className="min-w-[180px]">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End date</Label>
          <Input
            type="date"
            className="mt-1"
            value={endDate}
            min={startDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
          />
        </div>
        {(startDate || endDate) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setPage(1);
            }}
          >
            Clear filter
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 mb-6">
        <StatCard label="Total Billed" value={formatCurrency(totalBilled)} />
        <StatCard label="Total Paid" value={formatCurrency(totalPaid)} variant="success" />
        <StatCard label="Remaining" value={formatCurrency(remaining)} variant={remaining > 0 ? "destructive" : "success"} />
        <StatCard label="Advance Balance" value={formatCurrency(advanceBalance)} variant={advanceBalance > 0 ? "success" : undefined} />
        {startDate && (
          <StatCard label="Previous Balance" value={formatCurrency(ledger?.previousBalance ?? 0)} />
        )}
      </div>

      <div id="vendor-ledger" className="border-2 border-border">
        <div className="overflow-x-auto">
          {ledgerLoading ? (
            <p className="px-4 py-8 text-center text-muted-foreground">Loading ledger…</p>
          ) : (
            <table className="w-full text-base">
              <thead>
                <tr className="border-b-2 border-border bg-primary text-primary-foreground">
                  <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Item / Ref</th>
                  <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Total</th>
                  <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Paid</th>
                  <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Due</th>
                  <th className="px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wider">Method</th>
                  <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider">Balance</th>
                  {canEditDelete && (
                    <th className="px-4 py-2.5 text-right text-sm font-bold uppercase tracking-wider print-hidden">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {!ledger || ledger.rows.length === 0 ? (
                  <tr>
                    <td colSpan={canEditDelete ? 10 : 9} className="px-4 py-8 text-center text-muted-foreground">
                      No transactions for this vendor yet.
                    </td>
                  </tr>
                ) : (
                  ledger.rows.map((row) => (
                    <tr key={`${row.type}-${row.id}`} className="border-b border-border hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-sm">{row.date}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${row.type === "payment" ? (row.source === "advance" ? "bg-info/20 text-info" : "bg-success/20 text-success") : "bg-primary/10"}`}>
                          {row.type === "payment" ? (row.source === "advance" ? "Advance Applied" : "Payment") : "Purchase"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold">
                        {row.type === "purchase" ? row.itemName : (row.remarks || row.referenceId || "—")}
                        {row.type === "purchase" && (row.advanceGenerated ?? 0) > 0 && (
                          <p className="text-xs font-normal text-info">+{formatCurrency(row.advanceGenerated!)} advance</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {row.type === "purchase" ? row.quantity : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {row.type === "purchase"
                          ? formatCurrency(row.totalPrice!)
                          : row.source === "advance"
                            ? "—"
                            : formatCurrency(row.amount!)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-success">
                        {row.type === "purchase" ? formatCurrency(row.paidAmount!) : formatCurrency(row.amount!)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-destructive">
                        {row.type === "purchase" && (row.remaining ?? 0) > 0 ? formatCurrency(row.remaining!) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">{row.paymentMethod}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold">{formatCurrency(row.runningTotal)}</td>
                      {canEditDelete && (
                    <td className="px-4 py-3 text-right print-hidden">
                          {row.type === "payment" && (
                            <Button variant="ghost" size="icon" onClick={() => setDeletePaymentId(row.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {!ledgerLoading && ledger && ledger.rows.length > 0 && (
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
