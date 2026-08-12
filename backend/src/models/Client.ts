import mongoose from "mongoose";

export interface IClient {
  _id: mongoose.Types.ObjectId;
  name: string;
  normalizedName: string;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new mongoose.Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export const Client = mongoose.model<IClient>("Client", clientSchema);
