import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireBankAccountAccess } from "../middleware/rbac.js";
import { create, ledger, list, update } from "../controllers/clientsController.js";
export const clientRoutes = Router();
clientRoutes.use(authMiddleware, requireBankAccountAccess);
clientRoutes.get("/", list); clientRoutes.post("/", create); clientRoutes.patch("/:id", update); clientRoutes.get("/:id/ledger", ledger);
