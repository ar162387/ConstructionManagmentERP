import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireInventoryManageAccess } from "../middleware/rbac.js";
import { list, getOne, create, update, remove } from "../controllers/consumableItemsController.js";

export const consumableItemRoutes = Router();
consumableItemRoutes.use(authMiddleware);

consumableItemRoutes.get("/", list);
consumableItemRoutes.get("/:id", getOne);
consumableItemRoutes.post("/", create);
consumableItemRoutes.patch("/:id", requireInventoryManageAccess, update);
consumableItemRoutes.delete("/:id", requireInventoryManageAccess, remove);
