import mongoose from "mongoose";

export interface IContractorPayment {
  _id: mongoose.Types.ObjectId;
  contractorId: mongoose.Types.ObjectId;
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank" | "Online";
  referenceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contractorPaymentSchema = new mongoose.Schema<IContractorPayment>(
  {
    contractorId: { type: mongoose.Schema.Types.ObjectId, ref: "Contractor", required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: { type: String, enum: ["Cash", "Bank", "Online"], required: true },
    referenceId: { type: String, trim: true },
  },
  { timestamps: true }
);

contractorPaymentSchema.index({ contractorId: 1, date: -1 });

export const ContractorPayment = mongoose.model<IContractorPayment>("ContractorPayment", contractorPaymentSchema);
