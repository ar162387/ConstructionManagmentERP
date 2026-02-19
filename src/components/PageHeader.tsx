import PrintExportButton from "./PrintExportButton";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  printTargetId?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, printTargetId, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wider">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {printTargetId && <PrintExportButton title={title} printTargetId={printTargetId} />}
        {actions}
      </div>
    </div>
  );
}
