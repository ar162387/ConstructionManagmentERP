import mongoose from "mongoose";

export interface IConsumableUnit {
  _id: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const consumableUnitSchema = new mongoose.Schema<IConsumableUnit>(
  { name: { type: String, required: true, trim: true, unique: true } },
  { timestamps: true }
);

export const ConsumableUnit = mongoose.model<IConsumableUnit>("ConsumableUnit", consumableUnitSchema);
