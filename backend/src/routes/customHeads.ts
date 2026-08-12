import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireBankAccountAccess } from "../middleware/rbac.js";
import { list } from "../controllers/customHeadsController.js";
export const customHeadRoutes = Router();
customHeadRoutes.use(authMiddleware, requireBankAccountAccess); customHeadRoutes.get("/", list);
