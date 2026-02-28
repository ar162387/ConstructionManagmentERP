import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireEmployeeManageAccess } from "../middleware/rbac.js";
import {
  getLedger,
  createPayment,
  updatePayment,
  deletePayment,
  getAttendanceHandler,
  putAttendanceHandler,
} from "../controllers/employeeLedgerController.js";

export const employeeLedgerRoutes = Router({ mergeParams: true });
employeeLedgerRoutes.use(authMiddleware);

employeeLedgerRoutes.get("/ledger", getLedger);
employeeLedgerRoutes.get("/attendance", getAttendanceHandler);
employeeLedgerRoutes.put("/attendance", putAttendanceHandler);
employeeLedgerRoutes.post("/payments", createPayment);
employeeLedgerRoutes.put("/payments/:paymentId", requireEmployeeManageAccess, updatePayment);
employeeLedgerRoutes.delete("/payments/:paymentId", requireEmployeeManageAccess, deletePayment);
