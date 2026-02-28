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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createContractor } from "@/services/contractorsService";
import { toast } from "sonner";

interface AddContractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set (e.g. Site Manager), project is fixed to this and selector is hidden */
  restrictedProjectId?: string;
  restrictedProjectName?: string;
  projects: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function AddContractorDialog({ open, onOpenChange, restrictedProjectId, restrictedProjectName, projects, onSuccess }: AddContractorDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(restrictedProjectId ?? projects[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const isRestricted = Boolean(restrictedProjectId && restrictedProjectName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const effectiveProjectId = isRestricted ? restrictedProjectId! : projectId;
    const project = projects.find((p) => p.id === effectiveProjectId);
    if (!project) {
      toast.error("Select a project");
      return;
    }
    setSubmitting(true);
    try {
      await createContractor({
        projectId: effectiveProjectId,
        name: name.trim(),
        phone: phone.trim(),
        description: description.trim(),
      });
      toast.success("Contractor added");
      onOpenChange(false);
      setName("");
      setPhone("");
      setDescription("");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add contractor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contractor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contractor name" className="mt-1" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 ..." className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" />
          </div>
          <div>
            <Label>Project *</Label>
            {isRestricted ? (
              <p className="mt-1.5 text-sm font-medium">{restrictedProjectName}</p>
            ) : (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={submitting}>Add Contractor</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
