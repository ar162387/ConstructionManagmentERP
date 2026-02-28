import mongoose from "mongoose";

export interface IMachinePayment {
  _id: mongoose.Types.ObjectId;
  machineId: mongoose.Types.ObjectId;
  date: string;
  amount: number;
  paymentMethod?: "Cash" | "Bank" | "Online";
  referenceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const machinePaymentSchema = new mongoose.Schema<IMachinePayment>(
  {
    machineId: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: { type: String, enum: ["Cash", "Bank", "Online"] },
    referenceId: { type: String, trim: true },
  },
  { timestamps: true }
);

machinePaymentSchema.index({ machineId: 1, date: -1 });

export const MachinePayment = mongoose.model<IMachinePayment>("MachinePayment", machinePaymentSchema);
