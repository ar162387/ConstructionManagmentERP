import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  /** When true, content area has no padding so chart/text can use full space without overflow. */
  noContentPadding?: boolean;
}

export function ChartCard({ title, subtitle, children, className, noContentPadding }: ChartCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md",
        className
      )}
    >
      <div className="border-b px-6 py-4">
        <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
      </div>
      <div
        className={cn(
          "min-h-[280px] flex items-center justify-center overflow-visible",
          noContentPadding ? "p-0" : "p-6"
        )}
      >
        {children}
      </div>
    </div>
  );
}
