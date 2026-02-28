import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireExpenseManageAccess } from "../middleware/rbac.js";
import {
  list,
  listCategoriesHandler,
  getOne,
  create,
  update,
  remove,
} from "../controllers/expensesController.js";

export const expenseRoutes = Router();
expenseRoutes.use(authMiddleware);

expenseRoutes.get("/", list);
expenseRoutes.get("/categories", listCategoriesHandler);
expenseRoutes.get("/:id", getOne);
expenseRoutes.post("/", create);
expenseRoutes.patch("/:id", requireExpenseManageAccess, update);
expenseRoutes.delete("/:id", requireExpenseManageAccess, remove);
