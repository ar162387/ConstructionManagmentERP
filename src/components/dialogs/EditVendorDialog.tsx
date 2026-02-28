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
import { Textarea } from "@/components/ui/textarea";
import { updateVendor } from "@/services/vendorsService";
import type { ApiVendor } from "@/services/vendorsService";
import { toast } from "sonner";

interface EditVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: ApiVendor | null;
  onSave?: () => void;
}

export function EditVendorDialog({
  open,
  onOpenChange,
  vendor,
  onSave,
}: EditVendorDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vendor) return;
    setName(vendor.name);
    setPhone(vendor.phone ?? "");
    setDescription(vendor.description ?? "");
  }, [vendor, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    if (!name.trim()) {
      toast.error("Vendor name is required");
      return;
    }

    setLoading(true);
    try {
      await updateVendor(vendor.id, {
        name: name.trim(),
        phone: phone.trim(),
        description: description.trim(),
      });
      toast.success("Vendor updated");
      onOpenChange(false);
      onSave?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update vendor");
    } finally {
      setLoading(false);
    }
  };

  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Vendor</DialogTitle>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="warning" disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
