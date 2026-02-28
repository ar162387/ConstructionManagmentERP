import mongoose from "mongoose";

/** Fixed salary: status per day (present, absent, paid_leave, unpaid_leave, leave) */
export interface IFixedAttendanceEntry {
  day: number;
  status: string;
}

/** Daily wage: hours and overtime per day */
export interface IDailyAttendanceEntry {
  day: number;
  hoursWorked: number;
  overtimeHours: number;
  status: string;
  notes?: string;
}

export interface IEmployeeAttendance {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  month: string; // YYYY-MM
  fixedEntries: IFixedAttendanceEntry[];
  dailyEntries: IDailyAttendanceEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const fixedEntrySchema = new mongoose.Schema<IFixedAttendanceEntry>(
  { day: { type: Number, required: true }, status: { type: String, required: true } },
  { _id: false }
);

const dailyEntrySchema = new mongoose.Schema<IDailyAttendanceEntry>(
  {
    day: { type: Number, required: true },
    hoursWorked: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    status: { type: String, required: true },
    notes: { type: String },
  },
  { _id: false }
);

const employeeAttendanceSchema = new mongoose.Schema<IEmployeeAttendance>(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    month: { type: String, required: true },
    fixedEntries: { type: [fixedEntrySchema], default: [] },
    dailyEntries: { type: [dailyEntrySchema], default: [] },
  },
  { timestamps: true }
);

employeeAttendanceSchema.index({ employeeId: 1, month: 1 }, { unique: true });

export const EmployeeAttendance = mongoose.model<IEmployeeAttendance>(
  "EmployeeAttendance",
  employeeAttendanceSchema
);
