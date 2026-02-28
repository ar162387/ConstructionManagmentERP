import mongoose from "mongoose";
import { Employee } from "../models/Employee.js";
import { EmployeePayment } from "../models/EmployeePayment.js";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { logAudit } from "./auditService.js";
import { roleDisplay } from "./authService.js";
import { getEmployeeTotals, getEmployeeTotalPaidOnly, getEmployeeSnapshotForMonth } from "./employeeLedgerService.js";
import type { MonthlySnapshot } from "./employeeLedgerService.js";
import type { EmployeeType } from "../models/Employee.js";

export interface EmployeePayload {
  id: string;
  projectId: string;
  project?: string;
  name: string;
  role: string;
  type: EmployeeType;
  monthlySalary?: number;
  dailyRate?: number;
  phone: string;
  totalPaid?: number;
  totalDue?: number;
  createdAt?: string;
}

export interface CreateEmployeeInput {
  projectId: string;
  name: string;
  role: string;
  type: EmployeeType;
  monthlySalary?: number;
  dailyRate?: number;
  phone?: string;
}

export interface UpdateEmployeeInput {
  name?: string;
  role?: string;
  type?: EmployeeType;
  monthlySalary?: number;
  dailyRate?: number;
  phone?: string;
}

function toPayload(
  doc: {
    _id: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;
    name: string;
    role: string;
    type: EmployeeType;
    monthlySalary?: number;
    dailyRate?: number;
    phone?: string;
    createdAt?: Date;
  },
  projectName?: string,
  totals?: { totalPaid: number; totalDue: number }
): EmployeePayload {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    project: projectName,
    name: doc.name,
    role: doc.role,
    type: doc.type,
    monthlySalary: doc.monthlySalary,
    dailyRate: doc.dailyRate,
    phone: doc.phone ?? "",
    totalPaid: totals?.totalPaid,
    totalDue: totals?.totalDue,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
  };
}

export interface EmployeeListOptions {
  month?: string;
}

/** List employees for a project. When month is provided, includes snapshot (payable, paid, remaining, paymentStatus) for that month. */
export async function listEmployees(
  actor: { userId: string; role: string },
  projectIdParam?: string,
  options?: EmployeeListOptions
): Promise<(EmployeePayload & { snapshot?: MonthlySnapshot })[]> {
  let projectId: string | undefined;
  if (actor.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    projectId = user?.assignedProjectId?.toString();
    if (!projectId) return [];
  } else {
    projectId = projectIdParam;
  }
  const query = projectId && mongoose.Types.ObjectId.isValid(projectId) ? { projectId: new mongoose.Types.ObjectId(projectId) } : {};
  const docs = await Employee.find(query)
    .select("_id projectId name role type monthlySalary dailyRate phone createdAt")
    .lean();
  const projectIds = [...new Set(docs.map((d) => d.projectId.toString()))];
  const projects = await Project.find({ _id: { $in: projectIds } }).select("_id name").lean();
  const projectMap = new Map(projects.map((p) => [p._id.toString(), p.name]));

  const totalsList = await Promise.all(docs.map((d) => getEmployeeTotalPaidOnly(d._id.toString())));
  const month = options?.month?.trim();
  let snapshots: (MonthlySnapshot | undefined)[] = [];
  if (month) {
    snapshots = await Promise.all(
      docs.map((d) => getEmployeeSnapshotForMonth(d._id.toString(), month, d.createdAt))
    );
  }
  return docs.map((doc, i) => ({
    ...toPayload(doc, projectMap.get(doc.projectId.toString()), { totalPaid: totalsList[i], totalDue: 0 }),
    ...(snapshots[i] && { snapshot: snapshots[i] }),
  }));
}

export async function getEmployeeById(
  id: string,
  actor?: { userId: string; role: string }
): Promise<EmployeePayload | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await Employee.findById(id).lean();
  if (!doc) return null;
  if (actor?.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    const assignedId = user?.assignedProjectId?.toString();
    if (assignedId !== doc.projectId.toString()) return null;
  }
  const project = await Project.findById(doc.projectId).select("name").lean();
  const totals = await getEmployeeTotals(id);
  return toPayload(doc, project?.name, totals);
}

/** Create employee. Site Manager: uses assigned project. Admin/Super Admin: requires projectId in input. */
export async function createEmployee(
  actor: { userId: string; email: string; role: string },
  input: CreateEmployeeInput
): Promise<EmployeePayload> {
  if (!input.name?.trim()) throw new Error("Employee name is required");
  if (!input.role?.trim()) throw new Error("Employee role is required");
  if (!input.type || !["Fixed", "Daily"].includes(input.type)) throw new Error("Employee type must be Fixed or Daily");

  let projectId: string;
  if (actor.role === "site_manager") {
    const user = await User.findById(actor.userId).select("assignedProjectId").lean();
    projectId = user?.assignedProjectId?.toString() ?? "";
    if (!projectId) throw new Error("Site Manager must be assigned to a project to create employees");
  } else {
    projectId = input.projectId ?? "";
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) throw new Error("Project is required");
  }

  const payload: Record<string, unknown> = {
    projectId: new mongoose.Types.ObjectId(projectId),
    name: input.name.trim(),
    role: input.role.trim(),
    type: input.type,
    phone: (input.phone ?? "").trim(),
  };
  if (input.type === "Fixed" && input.monthlySalary != null) payload.monthlySalary = Math.max(0, input.monthlySalary);
  if (input.type === "Daily" && input.dailyRate != null) payload.dailyRate = Math.max(0, input.dailyRate);

  const employee = await Employee.create(payload);

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "create",
    module: "employees",
    entityId: employee._id.toString(),
    description: `Created employee: ${employee.name}`,
    newValue: { name: employee.name, type: employee.type },
  });

  const project = await Project.findById(projectId).select("name").lean();
  return toPayload(employee, project?.name);
}

export async function updateEmployee(
  actor: { userId: string; email: string; role: string },
  id: string,
  input: UpdateEmployeeInput
): Promise<EmployeePayload> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid employee ID");

  const target = await Employee.findById(id);
  if (!target) throw new Error("Employee not found");

  const updates: Record<string, unknown> = {};
  if (input.name != null) updates.name = input.name.trim();
  if (input.role != null) updates.role = input.role.trim();
  if (input.type != null) {
    if (!["Fixed", "Daily"].includes(input.type)) throw new Error("Employee type must be Fixed or Daily");
    updates.type = input.type;
  }
  if (input.monthlySalary != null) updates.monthlySalary = Math.max(0, input.monthlySalary);
  if (input.dailyRate != null) updates.dailyRate = Math.max(0, input.dailyRate);
  if (input.phone != null) updates.phone = input.phone.trim();

  const updated = await Employee.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!updated) throw new Error("Update failed");

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "update",
    module: "employees",
    entityId: id,
    description: `Updated employee: ${target.name}`,
    oldValue: { name: target.name },
    newValue: { name: updated.name },
  });

  const project = await Project.findById(updated.projectId).select("name").lean();
  return toPayload(updated, project?.name);
}

/** Prevent delete if employee has any payment records (referential integrity). */
export async function deleteEmployee(
  actor: { userId: string; email: string; role: string },
  id: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid employee ID");

  const target = await Employee.findById(id);
  if (!target) throw new Error("Employee not found");

  const paymentCount = await EmployeePayment.countDocuments({ employeeId: new mongoose.Types.ObjectId(id) });
  if (paymentCount > 0) {
    throw new Error(
      `Cannot delete employee "${target.name}": ${paymentCount} payment record(s) exist. Remove or reassign payments first.`
    );
  }

  await Employee.findByIdAndDelete(id);

  const actorUser = await User.findById(actor.userId).lean();
  const role = roleDisplay[actor.role as keyof typeof roleDisplay] ?? actor.role;
  await logAudit({
    userId: actor.userId,
    userName: actorUser?.name ?? "Unknown",
    userEmail: actor.email,
    role,
    action: "delete",
    module: "employees",
    entityId: id,
    description: `Deleted employee: ${target.name}`,
    oldValue: { name: target.name },
  });
}
