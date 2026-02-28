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
    remaining: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const Vendor = mongoose.model<IVendor>("Vendor", vendorSchema);
