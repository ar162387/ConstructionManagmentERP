import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireContractorManageAccess } from "../middleware/rbac.js";
import { list, getOne, create, update, remove } from "../controllers/contractorsController.js";
import {
  getLedger,
  createEntry,
  deleteEntry,
  deletePayment,
} from "../controllers/contractorLedgerController.js";

export const contractorRoutes = Router();
contractorRoutes.use(authMiddleware);

// Ledger routes must come before /:id to avoid "ledger" being parsed as id
contractorRoutes.get("/ledger", getLedger);
contractorRoutes.post("/entries", createEntry);
contractorRoutes.delete("/entries/:entryId", requireContractorManageAccess, deleteEntry);
contractorRoutes.delete("/payments/:paymentId", requireContractorManageAccess, deletePayment);

contractorRoutes.get("/", list);
contractorRoutes.get("/:id", getOne);
contractorRoutes.post("/", create);
contractorRoutes.patch("/:id", requireContractorManageAccess, update);
contractorRoutes.delete("/:id", requireContractorManageAccess, remove);
