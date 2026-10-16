import { Router }from "express";
import { updateOpportunityController, syncOpportunityController, testAddUpdateOpportunityController } from "../controllers/opportunities.controller.js";

const router = Router();

router.get("/sync/:opportunityId", syncOpportunityController);
console.log("🚀 Opportunities Routes Updated");
router.put("/update/:opportunityId", updateOpportunityController);
router.post("/test/add-update", testAddUpdateOpportunityController);

export default router;