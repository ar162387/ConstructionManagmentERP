import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { list } from "../controllers/auditLogsController.js";

export const auditLogRoutes = Router();
auditLogRoutes.use(authMiddleware);
auditLogRoutes.get("/", list);
