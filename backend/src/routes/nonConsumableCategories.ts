import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { list, create } from "../controllers/nonConsumableCategoriesController.js";

export const nonConsumableCategoryRoutes = Router();
nonConsumableCategoryRoutes.use(authMiddleware);

nonConsumableCategoryRoutes.get("/", list);
nonConsumableCategoryRoutes.post("/", create);
