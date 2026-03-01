import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "default" | "warning" | "success" | "destructive" | "info";
  /** Full value for tooltip (e.g. full currency when value is compact) */
  title?: string;
  /** Use responsive font scaling for long numbers to prevent overflow */
  numeric?: boolean;
}

const variantStyles = {
  default: "border-border",
  warning: "border-warning bg-warning/5",
  success: "border-success bg-success/5",
  destructive: "border-destructive bg-destructive/5",
  info: "border-info bg-info/5",
};

export default function StatCard({ label, value, icon, variant = "default", title, numeric }: StatCardProps) {
  const displayTitle = title ?? (typeof value === "string" ? value : undefined);
  return (
    <div
      className={cn(
        "rounded-xl border bg-card/50 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 flex flex-col min-h-[100px] min-w-0",
        variantStyles[variant]
      )}
    >
      {icon && <span className="text-muted-foreground shrink-0 [&>svg]:size-4 mb-1">{icon}</span>}
      <p
        className="text-muted-foreground font-medium min-w-0 overflow-hidden leading-snug break-words"
        style={{ fontSize: "clamp(0.5rem, 1.2vw + 0.3rem, 0.75rem)" }}
      >
        {label}
      </p>
      <div
        className={cn(
          "mt-1.5 font-bold leading-tight tabular-nums min-w-0 overflow-hidden",
          numeric
            ? "text-[length:clamp(0.5rem,min(1.25rem,2vw+0.5rem),1.25rem)]"
            : "text-xl"
        )}
        title={displayTitle}
      >
        {value}
      </div>
    </div>
  );
}
