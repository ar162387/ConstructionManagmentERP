import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireBankAccountManageAccess } from "../middleware/rbac.js";
import {
  getLedger,
  createBalanceAdjustment,
  updateBalanceAdjustment,
  deleteBalanceAdjustment,
} from "../controllers/projectLedgerController.js";

export const projectLedgerRoutes = Router({ mergeParams: true });
projectLedgerRoutes.use(authMiddleware);

projectLedgerRoutes.get("/", getLedger);
projectLedgerRoutes.post("/balance-adjustments", requireBankAccountManageAccess, createBalanceAdjustment);
projectLedgerRoutes.patch("/balance-adjustments/:id", requireBankAccountManageAccess, updateBalanceAdjustment);
projectLedgerRoutes.delete("/balance-adjustments/:id", requireBankAccountManageAccess, deleteBalanceAdjustment);
