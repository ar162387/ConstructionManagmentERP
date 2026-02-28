import mongoose from "mongoose";

export type EmployeeType = "Fixed" | "Daily";

export interface IEmployee {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  role: string;
  type: EmployeeType;
  monthlySalary?: number;
  dailyRate?: number;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new mongoose.Schema<IEmployee>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ["Fixed", "Daily"] },
    monthlySalary: { type: Number, min: 0 },
    dailyRate: { type: Number, min: 0 },
    phone: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

employeeSchema.index({ projectId: 1 });
employeeSchema.index({ projectId: 1, type: 1 });

export const Employee = mongoose.model<IEmployee>("Employee", employeeSchema);
