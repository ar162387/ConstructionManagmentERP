import mongoose from "mongoose";

export interface INonConsumableItem {
  _id: mongoose.Types.ObjectId;
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
  companyStore: number;
  inUse: number;
  underRepair: number;
  lost: number;
  createdAt: Date;
  updatedAt: Date;
}

const nonConsumableItemSchema = new mongoose.Schema<INonConsumableItem>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    category: { type: String, required: true, trim: true },
    unit: { type: String, default: "piece", trim: true },
    totalQuantity: { type: Number, default: 0, min: 0 },
    companyStore: { type: Number, default: 0, min: 0 },
    inUse: { type: Number, default: 0, min: 0 },
    underRepair: { type: Number, default: 0, min: 0 },
    lost: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const NonConsumableItem = mongoose.model<INonConsumableItem>(
  "NonConsumableItem",
  nonConsumableItemSchema
);
