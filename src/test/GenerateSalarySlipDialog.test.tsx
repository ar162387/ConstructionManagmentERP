import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GenerateSalarySlipDialog } from "@/components/dialogs/GenerateSalarySlipDialog";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function prepareSlip() {
  const write = vi.fn();
  vi.spyOn(window, "open").mockReturnValue({
    document: { open: vi.fn(), write, close: vi.fn() },
    print: vi.fn(),
  } as unknown as Window);
  render(<GenerateSalarySlipDialog open onOpenChange={() => {}} />);
  fireEvent.change(screen.getByLabelText("Employee ID *"), { target: { value: "EMP-42" } });
  fireEvent.change(screen.getByPlaceholderText("Employee name"), { target: { value: "Test Employee" } });
  return () => {
    fireEvent.click(screen.getByRole("button", { name: "Print Salary Slip" }));
    return new DOMParser().parseFromString(write.mock.calls[write.mock.calls.length - 1][0], "text/html");
  };
}

function setAmount(label: string, value: string) {
  const input = screen.getByText(label, { exact: true }).parentElement!.querySelector("input")!;
  fireEvent.change(input, { target: { value } });
}

describe("salary slip generation", () => {
  it("prints the chosen ID, revised items, correct totals in their own cells, and net pay", () => {
    const print = prepareSlip();
    for (const label of ["Ex-Gratia", "Incentive KPI", "Incentive", "Other BN", "Other"]) {
      expect(screen.queryByText(label, { exact: true })).not.toBeInTheDocument();
    }
    setAmount("Basic Salary", "1,000");
    setAmount("Other Allowance", "50");
    setAmount("Tax Deduction", "100");
    const doc = print();
    expect(doc.querySelector(".info")?.textContent).toContain("EMP-42");
    const rows = Array.from(doc.querySelectorAll<HTMLTableRowElement>(".lines tbody tr"));
    const earningLast = rows.findIndex((row) => row.cells[0].textContent === "Other Allowance");
    expect(rows[earningLast + 1].cells[0].textContent).toBe("Total Earnings");
    expect(rows[earningLast + 1].cells[1].textContent).toBe("1,050/-");
    const deductionLast = rows.findIndex((row) => row.cells[2].textContent === "Tax Deduction");
    expect(rows[deductionLast + 1].cells[2].textContent).toBe("Total Deductions");
    expect(rows[deductionLast + 1].cells[3].textContent).toBe("100");
    const netRow = rows[deductionLast + 2];
    expect(netRow.cells[1].textContent).toBe("Net Payable");
    expect(netRow.cells[2].textContent).toBe("950/-");
    expect(rows[earningLast + 1].cells[0].rowSpan).toBe(1);
    expect(rows[earningLast + 1].cells[1].rowSpan).toBe(1);
    expect(netRow.cells[0].colSpan).toBe(2);
    expect(netRow.cells[0].textContent).toBe("");
    const styles = doc.querySelector("style")?.textContent;
    expect(styles).toContain("table.lines { width: 100%; border-collapse: collapse; border: none; }");
    expect(styles).toContain("table.lines td.earnings-empty { border: none; }");
    expect(styles).toContain("table.lines td.net-payable { font-size: 14px; background: #7cfc00; }");
    expect(Array.from(doc.querySelectorAll(".lines td:not(.earnings-empty)")).every((cell) => cell.textContent?.trim())).toBe(true);
    expect(doc.querySelector(".note")?.textContent).toContain("The Company is Responsible for Paying all Types of government taxes");
    expect(doc.querySelector("style")?.textContent).toContain("height: 105.4px");
  });

  it("prints custom multiline notes as text below the table", () => {
    const print = prepareSlip();
    const note = "Paid by bank transfer.\n<script>alert('test')</script> & confirmed";
    fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: note } });
    const doc = print();
    expect(doc.querySelector(".note")?.textContent).toBe(`Note: ${note}`);
    expect(doc.querySelector(".note script")).toBeNull();
    expect(doc.querySelector(".lines")?.nextElementSibling).toBe(doc.querySelector(".note"));
  });

  it("omits whitespace-only notes and clears user-entered fields when reopened", () => {
    const print = prepareSlip();
    fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: " \n " } });
    expect(print().querySelector(".note")).toBeNull();
    cleanup();
    render(<GenerateSalarySlipDialog open onOpenChange={() => {}} />);
    expect(screen.getByLabelText("Employee ID *")).toHaveValue("");
    expect((screen.getByLabelText("Note (optional)") as HTMLTextAreaElement).value).toContain("The Company is Responsible");
    expect(screen.getByRole("checkbox", { name: "Print note" })).toBeChecked();
  });
  it("hides an unchecked note and preserves edits when checked again", () => {
    const print = prepareSlip();
    fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: "Custom note" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Print note" }));
    expect(print().querySelector(".note")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Print note" }));
    expect(print().querySelector(".note")?.textContent).toBe("Note: Custom note");
  });

  it("reserves letterhead margins and centers the slip only when selected", () => {
    const print = prepareSlip();
    expect(print().body.classList.contains("letterhead")).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: "Print on company letterhead" }));
    const doc = print();
    expect(doc.body.classList.contains("letterhead")).toBe(true);
    expect(doc.querySelector("style")?.textContent).toContain("margin: 40mm 20mm 25mm");
    expect(doc.querySelector("style")?.textContent).toContain("min-height: 232mm; display: flex; align-items: center; justify-content: center");
  });

});
