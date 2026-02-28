import mongoose from "mongoose";

export type MachineOwnership = "Company Owned" | "Rented";

export interface IMachine {
  _id: mongoose.Types.ObjectId;
  name: string;
  ownership: MachineOwnership;
  hourlyRate: number;
  projectId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const machineSchema = new mongoose.Schema<IMachine>(
  {
    name: { type: String, required: true, trim: true },
    ownership: {
      type: String,
      required: true,
      enum: ["Company Owned", "Rented"],
    },
    hourlyRate: { type: Number, required: true, min: 0 },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  },
  { timestamps: true }
);

machineSchema.index({ projectId: 1 });

export const Machine = mongoose.model<IMachine>("Machine", machineSchema);
