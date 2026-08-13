import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { list, filterOptions } from "../controllers/auditLogsController.js";

export const auditLogRoutes = Router();
auditLogRoutes.use(authMiddleware);
auditLogRoutes.get("/filter-options", filterOptions);
auditLogRoutes.get("/", list);
