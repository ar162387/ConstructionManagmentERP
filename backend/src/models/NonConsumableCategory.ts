import mongoose from "mongoose";

export interface INonConsumableCategory {
  _id: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const nonConsumableCategorySchema = new mongoose.Schema<INonConsumableCategory>(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true }
);

export const NonConsumableCategory = mongoose.model<INonConsumableCategory>(
  "NonConsumableCategory",
  nonConsumableCategorySchema
);
