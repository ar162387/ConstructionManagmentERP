import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireUserManagementAccess } from "../middleware/rbac.js";
import { list, create, update, remove } from "../controllers/usersController.js";

export const userRoutes = Router();
userRoutes.use(authMiddleware);
userRoutes.use(requireUserManagementAccess);

userRoutes.get("/", list);
userRoutes.post("/", create);
userRoutes.patch("/:id", update);
userRoutes.delete("/:id", remove);
