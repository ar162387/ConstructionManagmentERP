import mongoose from "mongoose";

export interface IProjectBalanceAdjustment {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  date: string;
  amount: number; // positive = add to project, negative = subtract
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectBalanceAdjustmentSchema = new mongoose.Schema<IProjectBalanceAdjustment>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

projectBalanceAdjustmentSchema.index({ projectId: 1, date: -1 });

export const ProjectBalanceAdjustment = mongoose.model<IProjectBalanceAdjustment>(
  "ProjectBalanceAdjustment",
  projectBalanceAdjustmentSchema
);
