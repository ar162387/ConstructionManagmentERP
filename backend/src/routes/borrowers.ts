import { Router, type Response } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { requireBankAccountAccess, requireBankAccountManageAccess } from "../middleware/rbac.js";
import { BorrowerError, listBorrowers, createBorrower, updateBorrower, deleteBorrower, getBorrowerLedger } from "../services/borrowerService.js";

export const borrowerRoutes = Router();
borrowerRoutes.use(authMiddleware, requireBankAccountAccess);
function handle(fn: (req: AuthRequest, res: Response) => Promise<unknown>) {
  return async (req: AuthRequest, res: Response) => {
    try { await fn(req, res); }
    catch (err) { res.status(err instanceof BorrowerError ? err.status : 500).json({ error: err instanceof Error ? err.message : "Borrower operation failed" }); }
  };
}
borrowerRoutes.get("/", handle(async (req, res) => {
  if (req.query.archived != null && req.query.archived !== "true" && req.query.archived !== "false") throw new BorrowerError("Invalid archive filter");
  res.json(await listBorrowers(req.query.archived === "true"));
}));
borrowerRoutes.post("/", handle(async (req, res) => { res.status(201).json(await createBorrower(req.user!, req.body.name)); }));
borrowerRoutes.patch("/:id", handle(async (req, res) => { res.json(await updateBorrower(req.user!, req.params.id, req.body.name)); }));
borrowerRoutes.delete("/:id", requireBankAccountManageAccess, handle(async (req, res) => { await deleteBorrower(req.user!, req.params.id); res.status(204).send(); }));
borrowerRoutes.get("/:id/ledger", handle(async (req, res) => { res.json(await getBorrowerLedger(req.params.id, typeof req.query.startDate === "string" ? req.query.startDate : undefined, typeof req.query.endDate === "string" ? req.query.endDate : undefined)); }));
