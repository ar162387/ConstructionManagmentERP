import mongoose from "mongoose";

export interface IVendor {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  description: string;
  totalBilled: number;
  totalPaid: number;
  remaining: number;
  /** Money paid to the vendor beyond what's currently owed — a prepayment against future delivery. */
  advanceBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new mongoose.Schema<IVendor>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    totalBilled: { type: Number, default: 0, min: 0 },
    totalPaid: { type: Number, default: 0, min: 0 },
    // Signed: positive = we owe the vendor; negative = vendor owes us / prepaid balance.
    remaining: { type: Number, default: 0 },
    advanceBalance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const Vendor = mongoose.model<IVendor>("Vendor", vendorSchema);
