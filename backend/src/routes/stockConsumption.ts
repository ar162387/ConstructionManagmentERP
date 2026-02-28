import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireInventoryManageAccess } from "../middleware/rbac.js";
import { list, create, update, remove } from "../controllers/stockConsumptionController.js";

export const stockConsumptionRoutes = Router();
stockConsumptionRoutes.use(authMiddleware);

stockConsumptionRoutes.get("/", list);
stockConsumptionRoutes.post("/", create);
stockConsumptionRoutes.patch("/:id", requireInventoryManageAccess, update);
stockConsumptionRoutes.delete("/:id", requireInventoryManageAccess, remove);
