import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { AddBankTransactionDialog } from "@/components/dialogs/AddBankTransactionDialog";
import { createBankTransaction } from "@/services/bankTransactionService";
import { toast } from "sonner";

vi.mock("@/services/bankTransactionService", () => ({ createBankTransaction: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ui/combobox", () => ({
  Combobox: ({ options, value, onValueChange, disabled, searchPlaceholder }: { options: { value: string; label: string }[]; value: string; onValueChange: (value: string | null) => void; disabled?: boolean; searchPlaceholder: string }) => <select aria-label={searchPlaceholder} value={value ?? ""} disabled={disabled} onChange={(e) => onValueChange(e.target.value || null)}><option value="">None</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>,
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange, disabled }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void; disabled?: boolean }) => <select value={value} disabled={disabled} onChange={(e) => onValueChange(e.target.value)}>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}));

const accounts = [{ id: "bank", name: "Bank A", accountNumber: "42", openingBalance: 100, currentBalance: 100, totalInflow: 0, totalOutflow: 0 }];
const borrowers = [{ id: "borrower", name: "Ali", archived: false, totalLoaned: 50, totalRepaid: 0, outstanding: 50 }, { id: "archived", name: "Archived", archived: true, totalLoaned: 10, totalRepaid: 10, outstanding: 0 }];
function mount() {
  return render(<AddBankTransactionDialog open onOpenChange={() => {}} accounts={accounts} projects={[{ id: "project", name: "Project" } as never]} clients={[{ id: "client", name: "Client" }]} borrowers={borrowers} customHeads={[{ id: "head", name: "Rent" }]} />);
}
function chooseBorrower() { fireEvent.change(screen.getByLabelText("Search borrowers..."), { target: { value: "borrower" } }); }
function submit(amount: string) {
  const selects = screen.getAllByRole("combobox");
  fireEvent.change(selects[1], { target: { value: "bank" } });
  fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: amount } });
  fireEvent.submit(screen.getByRole("button", { name: "Add Transaction" }).closest("form")!);
}
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(createBankTransaction).mockResolvedValue({} as never); });

describe("borrower transaction entry", () => {
  it("clears and disables inflow client/project/source and submits only borrower attribution", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Search clients..."), { target: { value: "client" } });
    // The project selector is the second generic Search... combobox.
    fireEvent.change(screen.getAllByLabelText("Search...")[1], { target: { value: "project" } });
    chooseBorrower();
    expect(screen.getByLabelText("Search clients...")).toBeDisabled();
    expect(screen.getByLabelText("Search clients...")).toHaveValue("");
    expect(screen.getAllByLabelText("Search...")[1]).toBeDisabled();
    expect(screen.getAllByLabelText("Search...")[1]).toHaveValue("");
    expect(screen.getByPlaceholderText("Type payer name")).toBeDisabled();
    expect(screen.getByPlaceholderText("Type payer name")).toHaveValue("");
    expect(screen.queryByRole("option", { name: "Archived" })).not.toBeInTheDocument();
    expect(screen.getByText(/Amount owed across all banks/)).toHaveTextContent("50");
    submit("40");
    await waitFor(() => expect(createBankTransaction).toHaveBeenCalledWith(expect.objectContaining({ borrowerId: "borrower", source: "Ali", destination: "Bank A", clientId: undefined, projectId: undefined, customHeadName: undefined, amount: 40 })));
    expect(screen.getByLabelText("Search clients...")).not.toBeDisabled();
  });

  it("outflow uses a fixed head and clears a previously selected project", async () => {
    mount(); fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "outflow" } });
    const destination = screen.getAllByRole("combobox").find((s) => Array.from(s.querySelectorAll("option")).some((o) => o.value === "project" && o.textContent === "Project"))!;
    fireEvent.change(destination, { target: { value: "project" } });
    fireEvent.change(screen.getAllByLabelText("Search...")[1], { target: { value: "project" } });
    chooseBorrower();
    expect(destination).toBeDisabled(); expect(destination).toHaveValue("custom");
    expect(screen.getByLabelText("Fixed borrower head")).toHaveValue("Borrower");
    expect(screen.getByLabelText("Fixed borrower head")).toBeDisabled();
    expect(screen.queryByPlaceholderText("New head name")).not.toBeInTheDocument();
    submit("80");
    await waitFor(() => expect(createBankTransaction).toHaveBeenCalledWith(expect.objectContaining({ type: "outflow", borrowerId: "borrower", source: "Bank A", destination: "Ali", customHeadName: undefined, projectId: undefined })));
  });

  it("blocks excess repayment, insufficient bank funds and fractional cents before posting", async () => {
    mount(); chooseBorrower(); submit("50.01");
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("outstanding"));
    expect(createBankTransaction).not.toHaveBeenCalled();
    submit("0.001"); expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("two decimal"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "outflow" } });
    submit("100.01"); expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Insufficient bank balance"));
    expect(createBankTransaction).not.toHaveBeenCalled();
  });

  it("deselecting a borrower restores ordinary inflow fields and surfaces server failures", async () => {
    mount(); chooseBorrower();
    fireEvent.change(screen.getByLabelText("Search borrowers..."), { target: { value: "" } });
    expect(screen.getByLabelText("Search clients...")).not.toBeDisabled(); expect(screen.getByPlaceholderText("Type payer name")).not.toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Type payer name"), { target: { value: "Owner" } });
    vi.mocked(createBankTransaction).mockRejectedValueOnce(new Error("Bank balance changed"));
    submit("10");
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Bank balance changed"));
    expect(createBankTransaction).toHaveBeenCalledWith(expect.objectContaining({ source: "Owner", borrowerId: undefined }));
  });
});
