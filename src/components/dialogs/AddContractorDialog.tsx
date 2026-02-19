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
import { useMockStore } from "@/context/MockStore";
import { toast } from "sonner";

interface AddContractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set (e.g. Site Manager), project is fixed to this and selector is hidden */
  restrictedProjectId?: string;
  restrictedProjectName?: string;
}

export function AddContractorDialog({ open, onOpenChange, restrictedProjectId, restrictedProjectName }: AddContractorDialogProps) {
  const { state, actions } = useMockStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(restrictedProjectId ?? state.projects[0]?.id ?? "");

  const projects = state.projects;
  const isRestricted = Boolean(restrictedProjectId && restrictedProjectName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const project = isRestricted
      ? { id: restrictedProjectId!, name: restrictedProjectName! }
      : projects.find((p) => p.id === projectId);
    if (!project) {
      toast.error("Select a project");
      return;
    }
    actions.addContractor({
      name: name.trim(),
      phone: phone.trim(),
      description: description.trim(),
      project: project.name,
    });
    actions.addAuditLog({
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      user: "admin@erp.com",
      role: "Admin",
      action: "Create",
      module: "Contractor",
      description: `Added contractor: ${name.trim()}`,
    });
    toast.success("Contractor added");
    onOpenChange(false);
    setName("");
    setPhone("");
    setDescription("");
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="warning">Add Contractor</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
