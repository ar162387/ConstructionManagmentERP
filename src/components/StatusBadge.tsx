import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  Active: "border-success bg-success/10 text-success",
  "On Hold": "border-warning bg-warning/10 text-warning",
  Completed: "border-muted-foreground bg-muted text-muted-foreground",
  Inflow: "border-success bg-success/10 text-success",
  Outflow: "border-destructive bg-destructive/10 text-destructive",
  Create: "border-info bg-info/10 text-info",
  Edit: "border-warning bg-warning/10 text-warning",
  Delete: "border-destructive bg-destructive/10 text-destructive",
  Fixed: "border-info bg-info/10 text-info",
  Daily: "border-warning bg-warning/10 text-warning",
  "Company Owned": "border-success bg-success/10 text-success",
  Rented: "border-warning bg-warning/10 text-warning",
  "Super Admin": "border-destructive bg-destructive/10 text-destructive",
  Admin: "border-info bg-info/10 text-info",
  "Site Manager": "border-warning bg-warning/10 text-warning",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block border-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
        statusStyles[status] || "border-border text-foreground"
      )}
    >
      {status}
    </span>
  );
}
