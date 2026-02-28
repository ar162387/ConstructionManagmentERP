import { useState, useEffect } from "react";
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
import { updateContractor, type ApiContractorWithTotals, type UpdateContractorInput } from "@/services/contractorsService";
import { toast } from "sonner";

interface EditContractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor: ApiContractorWithTotals | null;
  onSuccess?: () => void;
}

export function EditContractorDialog({
  open,
  onOpenChange,
  contractor,
  onSuccess,
}: EditContractorDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (contractor) {
      setName(contractor.name);
      setPhone(contractor.phone ?? "");
      setDescription(contractor.description ?? "");
    }
  }, [contractor, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractor) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const input: UpdateContractorInput = { name: name.trim(), phone: phone.trim(), description: description.trim() };
      await updateContractor(contractor.id, input);
      toast.success("Contractor updated");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update contractor");
    } finally {
      setSubmitting(false);
    }
  };

  if (!contractor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Contractor</DialogTitle>
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
            <Label>Description / Address / Notes</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="warning" disabled={submitting}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
