import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireInventoryManageAccess } from "../middleware/rbac.js";
import {
  getVendorLedgerHandler,
  createPayment,
  deletePayment,
} from "../controllers/vendorPaymentsController.js";

export const vendorPaymentRoutes = Router({ mergeParams: true });
vendorPaymentRoutes.use(authMiddleware);

vendorPaymentRoutes.get("/ledger", getVendorLedgerHandler);
vendorPaymentRoutes.post("/payments", createPayment);
vendorPaymentRoutes.delete("/payments/:paymentId", requireInventoryManageAccess, deletePayment);
