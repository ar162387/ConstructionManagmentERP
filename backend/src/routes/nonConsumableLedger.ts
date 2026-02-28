import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireInventoryManageAccess } from "../middleware/rbac.js";
import {
  list,
  create,
  update,
  remove,
} from "../controllers/nonConsumableLedgerController.js";

export const nonConsumableLedgerRoutes = Router({ mergeParams: true });
nonConsumableLedgerRoutes.use(authMiddleware);

nonConsumableLedgerRoutes.get("/", list);
nonConsumableLedgerRoutes.post("/", create);
nonConsumableLedgerRoutes.patch("/:id", requireInventoryManageAccess, update);
nonConsumableLedgerRoutes.delete("/:id", requireInventoryManageAccess, remove);
