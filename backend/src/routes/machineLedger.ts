import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireMachineryManageAccess } from "../middleware/rbac.js";
import {
  getLedger,
  createEntry,
  createPayment,
  deleteEntry,
  deletePayment,
} from "../controllers/machineLedgerController.js";

export const machineLedgerRoutes = Router({ mergeParams: true });
machineLedgerRoutes.use(authMiddleware);

machineLedgerRoutes.get("/", getLedger);
machineLedgerRoutes.post("/entries", createEntry);
machineLedgerRoutes.post("/payments", createPayment);
machineLedgerRoutes.delete("/entries/:entryId", requireMachineryManageAccess, deleteEntry);
machineLedgerRoutes.delete("/payments/:paymentId", requireMachineryManageAccess, deletePayment);
