import mongoose from "mongoose";

export interface ICustomHead {
  _id: mongoose.Types.ObjectId;
  name: string;
  normalizedName: string;
  createdAt: Date;
  updatedAt: Date;
}

const customHeadSchema = new mongoose.Schema<ICustomHead>(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export const CustomHead = mongoose.model<ICustomHead>("CustomHead", customHeadSchema);
