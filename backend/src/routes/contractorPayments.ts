import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { createPayment } from "../controllers/contractorLedgerController.js";

export const contractorPaymentRoutes = Router({ mergeParams: true });
contractorPaymentRoutes.use(authMiddleware);

contractorPaymentRoutes.post("/payments", createPayment);
