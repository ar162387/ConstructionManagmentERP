import mongoose from "mongoose";

export type ProjectStatus = "active" | "on_hold" | "completed";

export interface IProject {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  allocatedBudget: number;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  spent: number;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new mongoose.Schema<IProject>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    allocatedBudget: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ["active", "on_hold", "completed"],
      default: "active",
    },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    spent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>("Project", projectSchema);
