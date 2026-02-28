import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import type { UserRole } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "fallback-dev-secret";

export const roleDisplay: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  site_manager: "Site Manager",
};

export interface LoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    assignedProjectId?: string;
    assignedProjectName?: string;
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: roleDisplay[user.role] ?? user.role,
      assignedProjectId: user.assignedProjectId,
      assignedProjectName: user.assignedProjectName,
    },
  };
}

export interface MeResult {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedProjectId?: string;
  assignedProjectName?: string;
}

export async function getMe(userId: string): Promise<MeResult | null> {
  const user = await User.findById(userId).select("-passwordHash").lean();
  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: roleDisplay[user.role] ?? user.role,
    assignedProjectId: user.assignedProjectId,
    assignedProjectName: user.assignedProjectName,
  };
}
