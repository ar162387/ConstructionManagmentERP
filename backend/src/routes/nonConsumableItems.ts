import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireInventoryManageAccess } from "../middleware/rbac.js";
import {
  list,
  getOne,
  create,
  update,
  remove,
} from "../controllers/nonConsumableItemsController.js";
import { nonConsumableLedgerRoutes } from "./nonConsumableLedger.js";

export const nonConsumableItemRoutes = Router();
nonConsumableItemRoutes.use(authMiddleware);

nonConsumableItemRoutes.get("/", list);
nonConsumableItemRoutes.get("/:id", getOne);
nonConsumableItemRoutes.post("/", create);
nonConsumableItemRoutes.patch("/:id", requireInventoryManageAccess, update);
nonConsumableItemRoutes.delete("/:id", requireInventoryManageAccess, remove);
nonConsumableItemRoutes.use("/:itemId/ledger", nonConsumableLedgerRoutes);
