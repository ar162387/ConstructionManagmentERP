import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { login, getMeHandler } from "../controllers/authController.js";

export const authRoutes = Router();

authRoutes.get("/me", authMiddleware, getMeHandler);
authRoutes.post("/login", login);
