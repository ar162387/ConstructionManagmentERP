import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireInventoryManageAccess } from "../middleware/rbac.js";
import { list, create, update, remove } from "../controllers/itemLedgerController.js";

export const itemLedgerRoutes = Router({ mergeParams: true });
itemLedgerRoutes.use(authMiddleware);

itemLedgerRoutes.get("/", list);
itemLedgerRoutes.post("/", create);
itemLedgerRoutes.patch("/:id", requireInventoryManageAccess, update);
itemLedgerRoutes.delete("/:id", requireInventoryManageAccess, remove);
