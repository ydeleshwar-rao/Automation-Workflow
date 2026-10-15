import { Router } from "express";
import { SsoController } from "./sso.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/access.middleware.js";
import { authRateLimiter } from "../../middlewares/rateLimiter.js";

const router = Router();

// Public
router.post("/callback", authRateLimiter, SsoController.callback);
router.get("/discover",  authRateLimiter, SsoController.discover);

// Workspace admin
router.post(  "/connect",         authMiddleware, requireRole("admin"), SsoController.connect);
router.get(   "/settings",        authMiddleware, requireRole("admin"), SsoController.settings);
router.patch( "/settings",        authMiddleware, requireRole("admin"), SsoController.updateSettings);
router.delete("/connections/:id", authMiddleware, requireRole("admin"), SsoController.removeConnection);

export default router;
