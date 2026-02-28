import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMachine } from "@/services/machinesService";
import { toast } from "sonner";

interface AddMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set (e.g. Site Manager), project is fixed to this and selector is hidden */
  restrictedProjectId?: string;
  restrictedProjectName?: string;
  projects: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function AddMachineDialog({
  open,
  onOpenChange,
  restrictedProjectId,
  restrictedProjectName,
  projects,
  onSuccess,
}: AddMachineDialogProps) {
  const [name, setName] = useState("");
  const [ownership, setOwnership] = useState<"Company Owned" | "Rented">("Rented");
  const [hourlyRate, setHourlyRate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const NONE_PROJECT = "__none__";
  const [projectId, setProjectId] = useState(projects[0]?.id || NONE_PROJECT);

  const effectiveProjectId =
    restrictedProjectId ?? (projectId && projectId !== NONE_PROJECT ? projectId : undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Machine name is required");
      return;
    }
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate < 0) {
      toast.error("Valid hourly rate required");
      return;
    }
    if (!effectiveProjectId) {
      toast.error("Project is required");
      return;
    }
    setSubmitting(true);
    try {
      await createMachine({
        name: name.trim(),
        ownership,
        hourlyRate: rate,
        projectId: effectiveProjectId,
      });
      toast.success("Machine added");
      onOpenChange(false);
      setName("");
      setHourlyRate("");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add machine");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Machine</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tower Crane TC-200" className="mt-1" />
          </div>
          <div>
            <Label>Ownership *</Label>
            <Select value={ownership} onValueChange={(v) => setOwnership(v as "Company Owned" | "Rented")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Company Owned">Company Owned</SelectItem>
                <SelectItem value="Rented">Rented</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hourly Rate *</Label>
            <Input type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Project *</Label>
            {restrictedProjectId && restrictedProjectName ? (
              <p className="mt-1.5 text-sm font-medium">{restrictedProjectName}</p>
            ) : (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_PROJECT}>Select project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={submitting}>{submitting ? "Adding…" : "Add Machine"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
