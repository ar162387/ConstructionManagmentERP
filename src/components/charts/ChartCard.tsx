import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, children, className }: ChartCardProps) {
  return (
    <div
      className={cn(
        "border-2 border-border bg-card overflow-hidden",
        className
      )}
    >
      <div className="border-b border-border bg-secondary px-4 py-3">
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4 min-h-[280px] flex items-center justify-center">{children}</div>
    </div>
  );
}
