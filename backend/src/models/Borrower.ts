import mongoose from "mongoose";

export interface IBorrower {
  _id: mongoose.Types.ObjectId;
  name: string;
  normalizedName: string;
  archived: boolean;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

const borrowerSchema = new mongoose.Schema<IBorrower>({
  name: { type: String, required: true, trim: true },
  normalizedName: { type: String, required: true, unique: true },
  archived: { type: Boolean, default: false, required: true },
  revision: { type: Number, default: 0, required: true },
}, { timestamps: true });
borrowerSchema.index({ archived: 1, name: 1 });
export const Borrower = mongoose.model<IBorrower>("Borrower", borrowerSchema);
