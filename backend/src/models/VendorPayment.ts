import mongoose from "mongoose";

export interface IVendorPayment {
  _id: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  /** "external" = fresh money paid to the vendor (default). "advance" = drawn from the
   *  vendor's existing advanceBalance to settle an outstanding due, not new money. */
  source: "external" | "advance";
  /** Only set when source === "external": how much of `amount` exceeded the vendor's
   *  remaining balance at the time and was recorded as a new advance instead. */
  advancePortion: number;
  /** Optional: pins this payment to one specific ItemLedgerEntry instead of leaving FIFO free
   *  to apply it to whichever bill is oldest. Used by "apply advance to this delivery" — without
   *  it, an advance drawn down specifically to settle a just-recorded bill could get redirected
   *  by FIFO to an older, unrelated bill instead, leaving the intended one showing as unpaid. */
  targetEntryId?: mongoose.Types.ObjectId;
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
    source: { type: String, enum: ["external", "advance"], default: "external" },
    advancePortion: { type: Number, default: 0, min: 0 },
    targetEntryId: { type: mongoose.Schema.Types.ObjectId, ref: "ItemLedgerEntry" },
    referenceId: { type: String, trim: true },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

vendorPaymentSchema.index({ vendorId: 1, date: -1 });

export const VendorPayment = mongoose.model<IVendorPayment>("VendorPayment", vendorPaymentSchema);
