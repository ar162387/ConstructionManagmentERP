import { Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMPANY_ADDRESS, COMPANY_LOGO_URL, COMPANY_NAME, COMPANY_SHORT_NAME } from "@/lib/company";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface PrintExportButtonProps {
  title: string;
  subtitle?: string;
  printProjectName?: string;
  printTargetId: string;
  /** Browser tab / default heading text when default header is shown */
  printDocumentTitle?: string;
  /** Label for the primary action that opens the browser print sheet. */
  printLabel?: string;
  /** If true, suppress the report heading; PCF letterhead and address footer remain. */
  omitDefaultHeader?: boolean;
  /** Extra CSS appended after base print styles (e.g. toggle screen vs print sections). */
  additionalPrintCss?: string;
  /** Optional last-mile adjustment to a cloned print-only copy of the target element. */
  preparePrintContent?: (content: HTMLElement) => HTMLElement;
}

export default function PrintExportButton({
  title,
  subtitle,
  printProjectName,
  printTargetId,
  printDocumentTitle,
  printLabel = "Print",
  omitDefaultHeader = false,
  additionalPrintCss = "",
  preparePrintContent,
}: PrintExportButtonProps) {
  const handlePrint = () => {
    const content = document.getElementById(printTargetId);
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const printableContent = preparePrintContent
      ? preparePrintContent(content.cloneNode(true) as HTMLElement)
      : content;

    const rawDocumentTitle = printDocumentTitle ?? title;
    const docTitle = escapeHtml(rawDocumentTitle);
    const safeAdditionalCss = additionalPrintCss.replace(/<\/style/gi, "<\\/style");

    const projectHeading = printProjectName?.trim() || subtitle?.trim() || rawDocumentTitle;
    const secondaryHeading = subtitle?.trim() ? rawDocumentTitle : "";

    const defaultHeaderBlock = `
      <div class="company-print-header">
        <div class="company-print-brand-row">
          <img class="company-print-logo" src="${escapeHtml(COMPANY_LOGO_URL)}" alt="${escapeHtml(COMPANY_SHORT_NAME)} logo" />
          <div class="company-print-name">${escapeHtml(COMPANY_NAME)}</div>
        </div>
        <div class="company-print-address">${escapeHtml(COMPANY_ADDRESS)}</div>
      </div>
      ${omitDefaultHeader ? "" : `
        <div class="print-header">
          <div class="print-project">${escapeHtml(projectHeading)}</div>
          ${secondaryHeading ? `<h1 class="print-secondary-heading">${escapeHtml(secondaryHeading)}</h1>` : ""}
        </div>
      `}
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${docTitle}</title>
        <style>
          @page { margin: 16mm 12mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #000; overflow-wrap: anywhere; }
          h1 { font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 2px; }
          table { width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #000; padding: 8px 12px; text-align: left; font-size: 12px; }
          th { background-color: #e8e8e8 !important; color: #000 !important; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          tr:nth-child(even) { background-color: #f5f5f5 !important; }
          thead { display: table-header-group; }
          tr, img { break-inside: avoid; page-break-inside: avoid; }
          .company-print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
          .company-print-brand-row { display: flex; align-items: center; justify-content: center; gap: 10px; }
          .company-print-logo { display: block; width: auto; max-width: 100%; height: 64px; max-height: 64px; object-fit: contain; filter: grayscale(100%) contrast(180%); }
          .company-print-name { font-size: 22px; font-weight: 700; line-height: 1.15; text-transform: uppercase; letter-spacing: 0.02em; }
          .company-print-address { margin-top: 3px; font-size: 12.6px; line-height: 1.2; }
          .print-header { margin-bottom: 16px; text-align: center; }
          .print-project { font-size: 14px; font-weight: 700; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.04em; }
          .print-secondary-heading { margin: 0 0 10px; border-bottom: 2px solid #000; padding-bottom: 8px; }
          a { color: inherit !important; text-decoration: none !important; }
          button, [role="button"]:not(tr), .print-hidden, .employees-print-screen-only, .cash-controls, .kpi-card, .stat-card { display: none !important; }
          .print-hidden { display: none !important; }
          @media print { body { padding: 0; } }
          ${safeAdditionalCss}
        </style>
      </head>
      <body>
        ${defaultHeaderBlock}
        ${printableContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="h-4 w-4 mr-1" />
        {printLabel}
      </Button>
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <FileDown className="h-4 w-4 mr-1" />
        Export PDF
      </Button>
    </div>
  );
}
