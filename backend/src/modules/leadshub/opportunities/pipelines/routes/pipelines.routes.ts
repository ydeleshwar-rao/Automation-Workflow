import Router from "express";
import { getPipelinesController } from "../controllers/pipelines.controller.js"

const router = Router();
router.get("/all", getPipelinesController);
export default router;
