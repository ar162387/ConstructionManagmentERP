import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireVendorManageAccess } from "../middleware/rbac.js";
import { list, getOne, create, update, remove } from "../controllers/vendorsController.js";

export const vendorRoutes = Router();
vendorRoutes.use(authMiddleware);

vendorRoutes.get("/", list);
vendorRoutes.get("/:id", getOne);
vendorRoutes.post("/", create);
vendorRoutes.patch("/:id", requireVendorManageAccess, update);
vendorRoutes.delete("/:id", requireVendorManageAccess, remove);
