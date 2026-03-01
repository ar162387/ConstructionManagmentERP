import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ApiEmployeeWithSnapshot } from "@/services/employeesService";

interface SelectEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  employees: ApiEmployeeWithSnapshot[];
  onSelect: (employee: ApiEmployeeWithSnapshot) => void;
}

export function SelectEmployeeDialog({
  open,
  onOpenChange,
  employees,
  onSelect,
}: SelectEmployeeDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!open) setSelectedId("");
  }, [open]);

  const selected = employees.find((e) => e.id === selectedId);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      setSelectedId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Employee</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Employee</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                    {e.snapshot?.remaining != null && e.snapshot.remaining > 0
                      ? ` (${e.snapshot.remaining.toLocaleString()} due)`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="warning" onClick={handleConfirm} disabled={!selected}>
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
