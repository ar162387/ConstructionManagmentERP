import { Request, Response } from "express";
import { login as loginService, getMe } from "../services/authService.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const result = await loginService(email, password);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid email or password";
    res.status(401).json({ error: message });
  }
}

export async function getMeHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const user = await getMe(userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get user";
    res.status(500).json({ error: message });
  }
}
