import { Router } from "express";
import { authMiddleware } from "../../../../middlewares/auth.middleware.js";
import { requireRole } from "../../../../middlewares/access.middleware.js";
import {
  getTagSettingsController,
  updateTagSettingsController,
  createTagController,
  getTagsController,
  updateTagController,
  deleteTagController,
  addTagToWorkflowController,
  removeTagFromWorkflowController,
  getTagsByWorkflowController,
  getWorkflowsByTagController,
} from "./workflow-tags.controller.js";

const router = Router();
const adminOnly = requireRole("admin");

// Every tag route works on the signed-in user's organization
router.use(authMiddleware);

// Admin switch (registered before "/:id" so "settings" isn't read as a tag id)
router.get("/settings", getTagSettingsController);
router.patch("/settings", adminOnly, updateTagSettingsController);

// Tag CRUD — the organization's shared tags; only admins manage them
router.get("/getAll", getTagsController);
router.post("/create", adminOnly, createTagController);
router.patch("/:id", adminOnly, updateTagController);
router.delete("/:id", adminOnly, deleteTagController);

// Workflow ↔ Tag linking
router.post("/workflow/:workflowId", addTagToWorkflowController);
router.delete("/workflow/:workflowId/:tagId", removeTagFromWorkflowController);
router.get("/workflow/:workflowId", getTagsByWorkflowController);
router.get("/filter/:tagId", getWorkflowsByTagController);

export default router;
