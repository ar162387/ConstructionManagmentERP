import mongoose from "mongoose";

export interface IMachineLedgerEntry {
  _id: mongoose.Types.ObjectId;
  machineId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  date: string;
  hoursWorked: number;
  usedBy?: string;
  totalCost: number;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const machineLedgerEntrySchema = new mongoose.Schema<IMachineLedgerEntry>(
  {
    machineId: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    date: { type: String, required: true },
    hoursWorked: { type: Number, required: true, min: 0.01 },
    usedBy: { type: String, trim: true },
    totalCost: { type: Number, required: true, min: 0 },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

machineLedgerEntrySchema.index({ machineId: 1, date: -1 });
machineLedgerEntrySchema.index({ projectId: 1, date: -1 });

export const MachineLedgerEntry = mongoose.model<IMachineLedgerEntry>(
  "MachineLedgerEntry",
  machineLedgerEntrySchema
);
