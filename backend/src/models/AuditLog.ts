import mongoose from "mongoose";

export type AuditAction = "create" | "update" | "delete";

export interface IAuditLog {
  _id: mongoose.Types.ObjectId;
  timestamp: Date;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  action: AuditAction;
  module: string;
  entityId?: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
}

const auditLogSchema = new mongoose.Schema<IAuditLog>(
  {
    timestamp: { type: Date, default: Date.now },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    role: { type: String, required: true },
    action: {
      type: String,
      required: true,
      enum: ["create", "update", "delete"],
    },
    module: { type: String, required: true },
    entityId: { type: String },
    description: { type: String, required: true },
    oldValue: { type: String },
    newValue: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: false }
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ module: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ userId: 1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
