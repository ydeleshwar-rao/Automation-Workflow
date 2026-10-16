import { Router } from "express";
import {
  getLocalContactsController,
  createContactController,
} from "../controllers/contacts.controller.js";

const router = Router();

router.post("/createlead", createContactController);
router.get("/local/:locationId", getLocalContactsController);

export default router;
