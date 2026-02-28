import mongoose from "mongoose";

export interface IContractor {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const contractorSchema = new mongoose.Schema<IContractor>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export const Contractor = mongoose.model<IContractor>("Contractor", contractorSchema);
