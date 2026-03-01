import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireBankAccountAccess, requireBankAccountManageAccess } from "../middleware/rbac.js";
import { list, create, update, remove } from "../controllers/bankAccountsController.js";

export const bankAccountRoutes = Router();
bankAccountRoutes.use(authMiddleware);
bankAccountRoutes.use(requireBankAccountAccess);

bankAccountRoutes.get("/", list);
bankAccountRoutes.post("/", create);
bankAccountRoutes.patch("/:id", requireBankAccountManageAccess, update);
bankAccountRoutes.delete("/:id", requireBankAccountManageAccess, remove);
