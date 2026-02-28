import mongoose from "mongoose";

export interface IConsumptionItem {
  itemId: mongoose.Types.ObjectId;
  quantityUsed: number;
}

export interface IStockConsumptionEntry {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  date: string;
  remarks?: string;
  items: IConsumptionItem[];
  createdAt: Date;
  updatedAt: Date;
}

const consumptionItemSchema = new mongoose.Schema<IConsumptionItem>(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "ConsumableItem", required: true },
    quantityUsed: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const stockConsumptionEntrySchema = new mongoose.Schema<IStockConsumptionEntry>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    date: { type: String, required: true },
    remarks: { type: String, trim: true },
    items: { type: [consumptionItemSchema], required: true },
  },
  { timestamps: true }
);

stockConsumptionEntrySchema.index({ projectId: 1, date: -1 });

export const StockConsumptionEntry = mongoose.model<IStockConsumptionEntry>(
  "StockConsumptionEntry",
  stockConsumptionEntrySchema
);
