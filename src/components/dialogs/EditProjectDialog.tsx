import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { updateProject } from "@/services/projectsService";
import type { ApiProject } from "@/services/projectsService";
import { toast } from "sonner";

type Status = "Active" | "On Hold" | "Completed";

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ApiProject | null;
  onSave?: () => void;
}

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onSave,
}: EditProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allocatedBudget, setAllocatedBudget] = useState("");
  const [status, setStatus] = useState<Status>("Active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setDescription(project.description ?? "");
    setAllocatedBudget(String(project.allocatedBudget));
    setStatus(project.status);
    setStartDate(project.startDate ?? "");
    setEndDate(project.endDate ?? "");
  }, [project, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const budget = parseFloat(allocatedBudget);
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (isNaN(budget) || budget <= 0) {
      toast.error("Valid allocated budget is required");
      return;
    }

    setLoading(true);
    try {
      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim(),
        allocatedBudget: budget,
        status,
        startDate: startDate || project.startDate || new Date().toISOString().slice(0, 10),
        endDate: endDate || "",
      });
      toast.success("Project updated");
      onOpenChange(false);
      onSave?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Project Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Skyline Tower"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Allocated Budget *</Label>
            <Input
              type="number"
              min={1}
              value={allocatedBudget}
              onChange={(e) => setAllocatedBudget(e.target.value)}
              placeholder="0"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Status *</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="warning" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
