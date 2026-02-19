import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMockStore } from "@/context/MockStore";
import { toast } from "sonner";
import type { Employee } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Circle, XCircle, Umbrella } from "lucide-react";

export type DayStatus = "present" | "absent" | "leave";

interface DayEntry {
  status: DayStatus;
  remarks?: string;
}

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

function getDaysInMonth(year: number, month: number): { day: number; weekday: number }[] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const days: { day: number; weekday: number }[] = [];
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(year, month - 1, d);
    days.push({ day: d, weekday: date.getDay() }); // 0 = Sun, 6 = Sat
  }
  return days;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AttendanceDialog({ open, onOpenChange, employee }: AttendanceDialogProps) {
  const { actions } = useMockStore();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  // day of month -> { status, remarks? }. Absent/leave only; missing = present
  const [dayEntries, setDayEntries] = useState<Record<number, DayEntry>>({});

  const [year, monthNum] = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return [y, m];
  }, [month]);

  const daysInMonth = useMemo(() => getDaysInMonth(year, monthNum), [year, monthNum]);
  const firstWeekday = daysInMonth[0]?.weekday ?? 0;

  const getStatus = (day: number): DayStatus => dayEntries[day]?.status ?? "present";
  const getRemarks = (day: number): string => dayEntries[day]?.remarks ?? "";

  const setDay = (day: number, status: DayStatus, remarks?: string) => {
    if (status === "present") {
      setDayEntries((prev) => {
        const next = { ...prev };
        delete next[day];
        return next;
      });
    } else {
      setDayEntries((prev) => ({ ...prev, [day]: { status, remarks: remarks?.trim() || undefined } }));
    }
  };

  const handleSave = () => {
    if (!employee) return;
    const absent = Object.entries(dayEntries).filter(([, e]) => e.status === "absent");
    const leave = Object.entries(dayEntries).filter(([, e]) => e.status === "leave");
    const presentCount = daysInMonth.length - absent.length - leave.length;
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Employee",
      description: `Attendance: ${employee.name} — ${month}, Present: ${presentCount}, Absent: ${absent.length}, Leave: ${leave.length}`,
    });
    toast.success("Attendance saved (prototype)");
    setDayEntries({});
    onOpenChange(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) setDayEntries({});
    onOpenChange(open);
  };

  if (!employee) return null;

  const isFixed = employee.type === "Fixed";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Mark Attendance — {employee.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isFixed ? "Fixed monthly salary" : "Daily wage"} · {employee.project}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <Label className="text-xs text-muted-foreground">Month</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="mt-1 w-[160px]"
              />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded border border-border bg-background" /> Present
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded bg-destructive/80" /> Absent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded bg-amber-500/80" /> Leave
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Click a day to mark as <strong>Absent</strong> (red) or <strong>Leave</strong>. Default is Present.
          </p>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground border-b border-border pb-1">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          {/* Calendar grid: empty cells for offset + day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {daysInMonth.map(({ day, weekday }) => (
              <DayCell
                key={day}
                day={day}
                status={getStatus(day)}
                remarks={getRemarks(day)}
                onSet={(status, remarks) => setDay(day, status, remarks)}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button type="button" variant="warning" onClick={handleSave}>
            Save Attendance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DayCell({
  day,
  status,
  remarks,
  onSet,
}: {
  day: number;
  status: DayStatus;
  remarks: string;
  onSet: (status: DayStatus, remarks?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [localRemarks, setLocalRemarks] = useState(remarks);

  const handleSelect = (s: DayStatus) => {
    if (s === "present") {
      onSet("present");
      setLocalRemarks("");
      setOpen(false);
      return;
    }
    onSet(s, localRemarks || undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "aspect-square min-w-[36px] rounded-md text-sm font-medium transition-colors flex flex-col items-center justify-center gap-0.5 border",
            status === "present" &&
              "bg-background border-border hover:bg-accent/50 hover:border-muted-foreground/30",
            status === "absent" && "bg-destructive/80 text-destructive-foreground border-destructive hover:bg-destructive",
            status === "leave" && "bg-amber-500/80 text-amber-950 border-amber-600/50 hover:bg-amber-500"
          )}
        >
          <span>{day}</span>
          {status !== "present" && (
            <span className="text-[10px] font-normal opacity-90">
              {status === "absent" ? "Absent" : "Leave"}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start" side="bottom">
        <div className="space-y-3">
          <p className="text-sm font-medium">Day {day}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={status === "present" ? "default" : "outline"}
              className="gap-1"
              onClick={() => handleSelect("present")}
            >
              <Circle className="h-3.5 w-3.5" /> Present
            </Button>
            <Button
              type="button"
              size="sm"
              variant={status === "absent" ? "destructive" : "outline"}
              className="gap-1"
              onClick={() => handleSelect("absent")}
            >
              <XCircle className="h-3.5 w-3.5" /> Absent
            </Button>
            <Button
              type="button"
              size="sm"
              variant={status === "leave" ? "secondary" : "outline"}
              className="gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 border-amber-500/40"
              onClick={() => handleSelect("leave")}
            >
              <Umbrella className="h-3.5 w-3.5" /> Leave
            </Button>
          </div>
          {(status === "absent" || status === "leave") && (
            <div>
              <Label className="text-xs">Remarks (optional)</Label>
              <Input
                value={localRemarks}
                onChange={(e) => setLocalRemarks(e.target.value)}
                placeholder="e.g. Sick, Half-day"
                className="mt-1 text-sm"
                onBlur={() => onSet(status, localRemarks)}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
