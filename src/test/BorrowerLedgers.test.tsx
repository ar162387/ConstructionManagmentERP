import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import BorrowerLedger from "@/pages/BorrowerLedger";
import Borrowers from "@/pages/Borrowers";
import BankAccountLedger from "@/pages/BankAccountLedger";
import { getBorrowerLedger } from "@/services/borrowersService";
import { getBankAccountLedger, deleteBankTransaction } from "@/services/bankTransactionService";

const state = vi.hoisted(() => ({ role: "Super Admin" }));
vi.mock("@/components/Layout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { role: state.role } }) }));
vi.mock("@/services/borrowersService", () => ({ getBorrowerLedger: vi.fn(), createBorrower: vi.fn(), updateBorrower: vi.fn(), deleteBorrower: vi.fn() }));
vi.mock("@/services/bankTransactionService", () => ({ getBankAccountLedger: vi.fn(), deleteBankTransaction: vi.fn() }));
vi.mock("@/hooks/useBorrowers", () => ({ useBorrowers: () => ({ borrowers: [{ id: "b", name: "Ali", archived: false, totalLoaned: 100, totalRepaid: 40, outstanding: 60 }, { id: "empty", name: "Empty", archived: false, totalLoaned: 0, totalRepaid: 0, outstanding: 0 }], loading: false, refetch: vi.fn() }) }));

const loan = { id: "loan", date: "2026-10-01", type: "outflow" as const, amount: 100, loanGiven: 100, repayment: 0, accountId: "a", accountName: "Bank A", borrowerName: "Ali", mode: "Bank" as const, balance: 100 };
const repayment = { ...loan, id: "repayment", date: "2026-10-02", type: "inflow" as const, amount: 40, loanGiven: 0, repayment: 40, balance: 60 };
const borrowerLedger = { borrowerId: "b", borrowerName: "Ali", archived: false, totalLoaned: 100, totalRepaid: 40, outstanding: 60, rows: [loan, repayment] };
const bankLedger = { accountName: "Bank A", accountNumber: "42", openingBalance: 200, columns: [{ key: "head:rent", label: "Rent", kind: "head" as const }, { key: "borrower", label: "Borrower", kind: "head" as const }], rows: [{ id: "loan", date: "2026-10-01", particulars: "Loan given — Ali", outflows: { borrower: 100 }, balance: 100, borrowerId: "b" }, { id: "repayment", date: "2026-10-02", particulars: "Loan payment — Ali — REF", received: 40, outflows: {}, balance: 140, borrowerId: "b" }] };
function mount(element: React.ReactNode, path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/borrowers/:borrowerId/ledger" element={element} /><Route path="/bank-accounts/:accountId/ledger" element={element} /><Route path="/borrowers" element={element} /></Routes></MemoryRouter>);
}
beforeEach(() => {
  vi.clearAllMocks(); state.role = "Super Admin";
  vi.mocked(getBorrowerLedger).mockResolvedValue(borrowerLedger);
  vi.mocked(getBankAccountLedger).mockResolvedValue(bankLedger);
  vi.mocked(deleteBankTransaction).mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("borrower date filtering preserves running debt and printing includes the filtered ledger", async () => {
  const write = vi.fn(); const print = vi.fn();
  vi.spyOn(window, "open").mockReturnValue({ document: { write, close: vi.fn() }, print } as unknown as Window);
  mount(<BorrowerLedger />, "/borrowers/b/ledger");
  await screen.findByText("Loan payment — Ali");
  expect(screen.getByRole("columnheader", { name: "Running Balance" })).toBeInTheDocument();
  const balanceColumn = screen.getAllByRole("columnheader").findIndex((header) => header.textContent === "Running Balance");
  expect(screen.getByText("Loan given — Ali").closest("tr")!.children[balanceColumn]).toHaveTextContent("100");
  expect(screen.getByText("Loan payment — Ali").closest("tr")!.children[balanceColumn]).toHaveTextContent("60");
  fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-10-02" } });
  expect(screen.queryByText("Loan given — Ali")).not.toBeInTheDocument();
  const row = screen.getByText("Loan payment — Ali").closest("tr")!;
  expect(row.children[balanceColumn]).toHaveTextContent("60");
  fireEvent.click(screen.getByRole("button", { name: "Print" }));
  expect(print).toHaveBeenCalled();
  const doc = new DOMParser().parseFromString(write.mock.calls[0][0], "text/html");
  expect(doc.querySelector("#borrower-ledger")?.textContent).toContain("Loan payment — Ali");
  expect(doc.querySelector("#borrower-ledger")?.textContent).not.toContain("Loan given — Ali");
  expect(doc.querySelectorAll("thead th")[balanceColumn].textContent).toBe("Running Balance");
  expect(doc.querySelectorAll("tbody tr")[0].children[balanceColumn].textContent).toContain("60");
  expect(doc.querySelector("style")?.textContent).toContain(".print-hidden { display: none !important; }");
});

it("Admin can view borrower history but has no payment deletion control", async () => {
  state.role = "Admin"; mount(<BorrowerLedger />, "/borrowers/b/ledger"); await screen.findByText("Loan payment — Ali");
  expect(screen.queryByRole("button", { name: /Delete payment/ })).not.toBeInTheDocument();
});

it("borrower ledger deletes the canonical bank transaction and refreshes", async () => {
  mount(<BorrowerLedger />, "/borrowers/b/ledger");
  fireEvent.click(await screen.findByRole("button", { name: "Delete payment repayment" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(deleteBankTransaction).toHaveBeenCalledWith("repayment"));
  await waitFor(() => expect(getBorrowerLedger).toHaveBeenCalledTimes(2));
});

it("bank ledger puts Borrower before Balance and displays repayments under Received", async () => {
  mount(<BankAccountLedger />, "/bank-accounts/a/ledger");
  await screen.findByText("Loan payment — Ali — REF");
  const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
  expect(headers.slice(-3)).toEqual(["Borrower", "Balance", "Actions"]);
  const row = screen.getByText("Loan payment — Ali — REF").closest("tr")!;
  expect(row.children[2]).toHaveTextContent("40");
  expect(row.children[4]).toHaveTextContent("—");
  fireEvent.click(screen.getByRole("button", { name: "Borrower" }));
  expect(screen.getByText("Loan given — Ali")).toBeInTheDocument();
  expect(screen.queryByText("Loan payment — Ali — REF")).not.toBeInTheDocument();
});

it("bank ledger allows borrower deletion for Super Admin and refreshes", async () => {
  mount(<BankAccountLedger />, "/bank-accounts/a/ledger");
  fireEvent.click(await screen.findByRole("button", { name: "Delete borrower payment repayment" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(deleteBankTransaction).toHaveBeenCalledWith("repayment"));
  await waitFor(() => expect(getBankAccountLedger).toHaveBeenCalledTimes(2));
});

it("Admin sees bank history without deletion controls", async () => {
  state.role = "Admin"; mount(<BankAccountLedger />, "/bank-accounts/a/ledger");
  await screen.findByText("Loan payment — Ali — REF");
  expect(screen.queryByRole("button", { name: /Delete borrower payment/ })).not.toBeInTheDocument();
});

it("borrower list blocks deletion while money is owed and hides deletion for Admin", () => {
  mount(<Borrowers />, "/borrowers");
  expect(screen.getByRole("button", { name: "Delete Ali" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Delete Empty" })).not.toBeDisabled();
  expect(within(screen.getByRole("link", { name: "Ali" }).closest("tr")!).getByRole("link", { name: "View ledger" })).toHaveAttribute("href", "/borrowers/b/ledger");
  cleanup(); state.role = "Admin"; mount(<Borrowers />, "/borrowers");
  expect(screen.queryByRole("button", { name: "Delete Empty" })).not.toBeInTheDocument();
});
