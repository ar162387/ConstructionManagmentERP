import { Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintExportButtonProps {
  title: string;
  printTargetId: string;
}

export default function PrintExportButton({ title, printTargetId }: PrintExportButtonProps) {
  const handlePrint = () => {
    const content = document.getElementById(printTargetId);
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; color: #000; }
          h1 { font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #000; padding: 8px 12px; text-align: left; font-size: 12px; }
          th { background-color: #000; color: #fff; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          tr:nth-child(even) { background-color: #f5f5f5; }
          .print-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .print-date { font-size: 12px; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${title}</h1>
          <span class="print-date">Generated: ${new Date().toLocaleDateString("en-PK")}</span>
        </div>
        ${content.innerHTML}
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
        Print
      </Button>
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <FileDown className="h-4 w-4 mr-1" />
        Export PDF
      </Button>
    </div>
  );
}
