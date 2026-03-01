import mongoose from "mongoose";

export interface IBankAccount {
  _id: mongoose.Types.ObjectId;
  name: string;
  accountNumber: string;
  openingBalance: number;
  currentBalance: number;
  totalInflow: number;
  totalOutflow: number;
  createdAt: Date;
  updatedAt: Date;
}

const bankAccountSchema = new mongoose.Schema<IBankAccount>(
  {
    name: { type: String, required: true, trim: true },
    accountNumber: { type: String, default: "", trim: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    totalInflow: { type: Number, default: 0 },
    totalOutflow: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const BankAccount = mongoose.model<IBankAccount>("BankAccount", bankAccountSchema);
