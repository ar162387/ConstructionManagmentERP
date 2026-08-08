import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireBankAccountAccess, requireBankAccountManageAccess } from "../middleware/rbac.js";
import { list, create, update, remove } from "../controllers/bankTransactionsController.js";

export const bankTransactionRoutes = Router();
bankTransactionRoutes.use(authMiddleware);
bankTransactionRoutes.use(requireBankAccountAccess);

bankTransactionRoutes.get("/", list);
bankTransactionRoutes.post("/", create);
bankTransactionRoutes.patch("/:id", update);
bankTransactionRoutes.delete("/:id", requireBankAccountManageAccess, remove);
