import {Request, Response, NextFunction } from "express";
import * as opportunityService from "../service/opportunities.service.js";
import { ApiResponse } from "../../../../utils/ApiResponse.js";
import { UpdateOpportunityDTO } from "../dto/update-opportunities.dto.js";
import { getLocationIdByUserId, getUserId } from "../../../../common/function.js";
import { processLeadhubCreateAndContact } from "../../../workflow-automation/processor/leadhubProcessor.js";

// Resolve {{map:id|label|fallback}} tokens → fallback (3rd segment), preserving structure.
// Used in test mode where no upstream node outputs exist.
const MAP_TOKEN_RE = /\{\{map:[^|]*\|[^|]*\|([^}]*)\}\}/g;
function resolveMapTokens(value: any): any {
  if (typeof value === "string") return value.replace(MAP_TOKEN_RE, (_, v) => v);
  if (Array.isArray(value)) return value.map(resolveMapTokens);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveMapTokens(v);
    return out;
  }
  return value;
}

export  const syncOpportunityController = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const { opportunityId } = req.params;
        if (!opportunityId || typeof opportunityId !== 'string') {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing OpportunitiyId parameter",
            });
        }
        const userId = await getUserId(req);
        const locationId = await getLocationIdByUserId(userId);
        const data = await opportunityService.getOpportunity(locationId, opportunityId);
        return ApiResponse(res, 200, "Opportunity synced successfully", data);
    } catch(error) {
        next (error);
    }
};

export const updateOpportunityController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  console.log("🎯 updateOpportunityController HIT");

  try {
    const { opportunityId } = req.params;
    const updateDTO: UpdateOpportunityDTO = req.body;

    console.log("📍 OpportunityId:", opportunityId);
    console.log("📝 Update Payload:", updateDTO);

    if (!opportunityId) {
      return res.status(400).json({
        success: false,
        message: "OpportunityId is required",
      });
    }

    if (!opportunityId || Array.isArray(opportunityId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid opportunityId",
        });
        }

    if (!updateDTO || Object.keys(updateDTO).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Update data is required",
      });
    }

    const userId = await getUserId(req);
    const locationId = await getLocationIdByUserId(userId);
    const updatedOpportunity = await opportunityService.updateOpportunity(
      locationId,
      opportunityId,
      updateDTO
    );

    return res.status(200).json({
      success: true,
      message: "Opportunity updated successfully",
      data: updatedOpportunity,
    });

  } catch (error) {
    next(error);
  }
};

// Test endpoint for the "Add/Update Opportunity" action — called from the
// workflow builder's Test step. Reuses the same processor that runs at
// workflow execution time so what the user tests is exactly what will run.
export const testAddUpdateOpportunityController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("🎯 testAddUpdateOpportunityController HIT");
  try {
    const userId = await getUserId(req);
    const input = resolveMapTokens(req.body || {});
    console.log("[Test:add_update_opportunity] input:", JSON.stringify(input));

    const result = await processLeadhubCreateAndContact(userId, input);

    return ApiResponse(res, 200, "Opportunity test completed", result);
  } catch (error: any) {
    console.error(
      "[Test:add_update_opportunity] failed:",
      error?.response?.data ?? error?.message
    );
    next(error);
  }
};
