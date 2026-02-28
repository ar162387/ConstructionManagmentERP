import mongoose from "mongoose";

export interface IContractorEntry {
  _id: mongoose.Types.ObjectId;
  contractorId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  date: string;
  amount: number;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}

const contractorEntrySchema = new mongoose.Schema<IContractorEntry>(
  {
    contractorId: { type: mongoose.Schema.Types.ObjectId, ref: "Contractor", required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    remarks: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

contractorEntrySchema.index({ contractorId: 1, date: -1 });
contractorEntrySchema.index({ projectId: 1, date: -1 });

export const ContractorEntry = mongoose.model<IContractorEntry>("ContractorEntry", contractorEntrySchema);
