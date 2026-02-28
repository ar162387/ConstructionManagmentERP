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
import { createVendor } from "@/services/vendorsService";
import { toast } from "sonner";

interface AddVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onSuccess?: () => void;
}

export function AddVendorDialog({ open, onOpenChange, projectId, onSuccess }: AddVendorDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vendor name is required");
      return;
    }
    if (!projectId) {
      toast.error("Please select a project first");
      return;
    }
    setLoading(true);
    try {
      await createVendor({
        projectId,
        name: name.trim(),
        phone: phone.trim(),
        description: description.trim(),
      });
      toast.success("Vendor added");
      onOpenChange(false);
      setName("");
      setPhone("");
      setDescription("");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add vendor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vendor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vendor name" className="mt-1" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 ..." className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="warning" disabled={loading}>{loading ? "Adding…" : "Add Vendor"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
