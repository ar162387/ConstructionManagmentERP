import mongoose from "mongoose";

export interface IVendorPayment {
  _id: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const vendorPaymentSchema = new mongoose.Schema<IVendorPayment>(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: { type: String, enum: ["Cash", "Bank", "Online"], required: true },
    referenceId: { type: String, trim: true },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

vendorPaymentSchema.index({ vendorId: 1, date: -1 });

export const VendorPayment = mongoose.model<IVendorPayment>("VendorPayment", vendorPaymentSchema);
