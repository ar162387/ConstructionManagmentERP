import mongoose from "mongoose";

export type UserRole = "super_admin" | "admin" | "site_manager";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  assignedProjectId?: string;
  assignedProjectName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["super_admin", "admin", "site_manager"],
    },
    assignedProjectId: { type: String },
    assignedProjectName: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);
