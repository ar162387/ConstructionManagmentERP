import mongoose from "mongoose";

export type NonConsumableEventType =
  | "Purchase"
  | "AssignToProject"
  | "ReturnToCompany"
  | "Repair"
  | "ReturnFromRepair"
  | "MarkLost";

export interface INonConsumableLedgerEntry {
  _id: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  date: string;
  eventType: NonConsumableEventType;
  quantity: number;
  totalCost?: number;
  projectTo?: mongoose.Types.ObjectId;
  projectFrom?: mongoose.Types.ObjectId;
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const nonConsumableLedgerEntrySchema = new mongoose.Schema<INonConsumableLedgerEntry>(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "NonConsumableItem", required: true },
    date: { type: String, required: true },
    eventType: {
      type: String,
      enum: ["Purchase", "AssignToProject", "ReturnToCompany", "Repair", "ReturnFromRepair", "MarkLost"],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    totalCost: { type: Number, min: 0 },
    projectTo: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    projectFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    remarks: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

nonConsumableLedgerEntrySchema.index({ itemId: 1, date: -1 });
nonConsumableLedgerEntrySchema.index({ projectTo: 1 });
nonConsumableLedgerEntrySchema.index({ projectFrom: 1 });

export const NonConsumableLedgerEntry = mongoose.model<INonConsumableLedgerEntry>(
  "NonConsumableLedgerEntry",
  nonConsumableLedgerEntrySchema
);
