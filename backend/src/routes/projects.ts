import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireProjectCreateAccess, requireProjectManageAccess } from "../middleware/rbac.js";
import { list, create, update, remove } from "../controllers/projectsController.js";

export const projectRoutes = Router();
projectRoutes.use(authMiddleware);

projectRoutes.get("/", list);
projectRoutes.post("/", requireProjectCreateAccess, create);
projectRoutes.patch("/:id", requireProjectManageAccess, update);
projectRoutes.delete("/:id", requireProjectManageAccess, remove);
