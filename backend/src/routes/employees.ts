import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireEmployeeManageAccess } from "../middleware/rbac.js";
import { list, getOne, create, update, remove } from "../controllers/employeesController.js";

export const employeeRoutes = Router();
employeeRoutes.use(authMiddleware);

employeeRoutes.get("/", list);
employeeRoutes.post("/", create);
employeeRoutes.get("/:employeeId", getOne);
employeeRoutes.patch("/:employeeId", requireEmployeeManageAccess, update);
employeeRoutes.delete("/:employeeId", requireEmployeeManageAccess, remove);
