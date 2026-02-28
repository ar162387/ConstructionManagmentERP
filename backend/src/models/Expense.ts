import mongoose from "mongoose";

export type PaymentMode = "Cash" | "Bank" | "Online";

export interface IExpense {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  date: string;
  description: string;
  category: string;
  paymentMode: PaymentMode;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new mongoose.Schema<IExpense>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    date: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    paymentMode: {
      type: String,
      required: true,
      enum: ["Cash", "Bank", "Online"],
    },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

expenseSchema.index({ projectId: 1 });
expenseSchema.index({ projectId: 1, category: 1 });
expenseSchema.index({ projectId: 1, date: -1 });

export const Expense = mongoose.model<IExpense>("Expense", expenseSchema);
