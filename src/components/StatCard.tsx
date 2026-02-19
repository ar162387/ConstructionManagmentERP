import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  variant?: "default" | "warning" | "success" | "destructive" | "info";
  /** Full value for tooltip (e.g. full currency when value is compact) */
  title?: string;
}

const variantStyles = {
  default: "border-border",
  warning: "border-warning bg-warning/5",
  success: "border-success bg-success/5",
  destructive: "border-destructive bg-destructive/5",
  info: "border-info bg-info/5",
};

export default function StatCard({ label, value, icon, variant = "default", title }: StatCardProps) {
  return (
    <div className={cn("border-2 p-4 transition-all hover:shadow-sm", variantStyles[variant])}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="mt-2 text-lg font-bold leading-tight truncate min-w-0" title={title ?? value}>{value}</p>
    </div>
  );
}
