import { Router } from "express";
import { catchAsync } from "../../../../utils/catchAsync.js";
import { SimproController } from "../controller/simpro.controller.js";

const router = Router();

// ─── OAuth (Authorization Code flow) ────────────────────────────────────
router.get("/connect",          catchAsync(SimproController.getConnectUrl));   // ?build_name=acme
router.get("/callback",         catchAsync(SimproController.handleCallback));

// ─── API Key connect (Grant Type = "API Key" in Simpro Setup → API) ─────
router.post("/connect/apikey",  catchAsync(SimproController.connectWithApiKey));

router.get("/status",           catchAsync(SimproController.connectionStatus));
router.delete("/disconnect",    catchAsync(SimproController.disconnect));

// ─── UI dashboard feed ────────────────────────────────────────────────────
router.get("/getalljobs", catchAsync(SimproController.getAllJobs));

// ─── Live simPRO reads ─────────────────────────────────────────────────────
router.get("/customers",  catchAsync(SimproController.getCustomers));
router.get("/jobs",       catchAsync(SimproController.getJobs));
router.get("/sites",      catchAsync(SimproController.getSites));
router.get("/employees",  catchAsync(SimproController.getEmployees));
router.get("/schedules",  catchAsync(SimproController.getSchedules));

export default router;
