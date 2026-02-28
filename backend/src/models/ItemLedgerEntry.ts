import mongoose from "mongoose";

export interface IItemLedgerEntry {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  date: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paidAmount: number;
  remaining: number;
  biltyNumber?: string;
  vehicleNumber?: string;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const itemLedgerEntrySchema = new mongoose.Schema<IItemLedgerEntry>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "ConsumableItem", required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    date: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    remaining: { type: Number, default: 0, min: 0 },
    biltyNumber: { type: String, trim: true },
    vehicleNumber: { type: String, trim: true },
    paymentMethod: { type: String, enum: ["Cash", "Bank", "Online"], required: true },
    referenceId: { type: String, trim: true },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

itemLedgerEntrySchema.index({ itemId: 1, date: -1 });
itemLedgerEntrySchema.index({ vendorId: 1 });
itemLedgerEntrySchema.index({ projectId: 1 });

export const ItemLedgerEntry = mongoose.model<IItemLedgerEntry>("ItemLedgerEntry", itemLedgerEntrySchema);
