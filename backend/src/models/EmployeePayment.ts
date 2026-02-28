import mongoose from "mongoose";

export type EmployeePaymentType = "Advance" | "Salary" | "Wage";
export type EmployeePaymentMethod = "Cash" | "Bank" | "Online";

export interface IEmployeePayment {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  month: string; // YYYY-MM
  date: string;
  amount: number;
  type: EmployeePaymentType;
  paymentMethod: EmployeePaymentMethod;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const employeePaymentSchema = new mongoose.Schema<IEmployeePayment>(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    month: { type: String, required: true }, // YYYY-MM
    date: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    type: { type: String, required: true, enum: ["Advance", "Salary", "Wage"] },
    paymentMethod: { type: String, required: true, enum: ["Cash", "Bank", "Online"] },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

employeePaymentSchema.index({ employeeId: 1, month: 1 });
employeePaymentSchema.index({ employeeId: 1, date: -1 });

export const EmployeePayment = mongoose.model<IEmployeePayment>("EmployeePayment", employeePaymentSchema);
