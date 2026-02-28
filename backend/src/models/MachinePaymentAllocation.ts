import mongoose from "mongoose";

export interface IMachinePaymentAllocation {
  _id: mongoose.Types.ObjectId;
  machineId: mongoose.Types.ObjectId;
  entryId: mongoose.Types.ObjectId;
  paymentId: mongoose.Types.ObjectId;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const machinePaymentAllocationSchema = new mongoose.Schema<IMachinePaymentAllocation>(
  {
    machineId: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: "MachineLedgerEntry", required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "MachinePayment", required: true },
    amount: { type: Number, required: true, min: 0.01 },
  },
  { timestamps: true }
);

machinePaymentAllocationSchema.index({ machineId: 1, entryId: 1 });
machinePaymentAllocationSchema.index({ machineId: 1, paymentId: 1 });

export const MachinePaymentAllocation = mongoose.model<IMachinePaymentAllocation>(
  "MachinePaymentAllocation",
  machinePaymentAllocationSchema
);
