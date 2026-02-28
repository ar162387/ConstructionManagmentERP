import mongoose from "mongoose";

export interface IContractorPaymentAllocation {
  _id: mongoose.Types.ObjectId;
  contractorId: mongoose.Types.ObjectId;
  entryId: mongoose.Types.ObjectId;
  paymentId: mongoose.Types.ObjectId;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const contractorPaymentAllocationSchema = new mongoose.Schema<IContractorPaymentAllocation>(
  {
    contractorId: { type: mongoose.Schema.Types.ObjectId, ref: "Contractor", required: true },
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: "ContractorEntry", required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "ContractorPayment", required: true },
    amount: { type: Number, required: true, min: 0.01 },
  },
  { timestamps: true }
);

contractorPaymentAllocationSchema.index({ contractorId: 1, entryId: 1 });
contractorPaymentAllocationSchema.index({ contractorId: 1, paymentId: 1 });

export const ContractorPaymentAllocation = mongoose.model<IContractorPaymentAllocation>(
  "ContractorPaymentAllocation",
  contractorPaymentAllocationSchema
);

