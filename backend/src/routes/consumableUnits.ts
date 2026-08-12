import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { create, list } from "../controllers/consumableUnitsController.js";

export const consumableUnitRoutes = Router();
consumableUnitRoutes.use(authMiddleware);
consumableUnitRoutes.get("/", list);
consumableUnitRoutes.post("/", create);
