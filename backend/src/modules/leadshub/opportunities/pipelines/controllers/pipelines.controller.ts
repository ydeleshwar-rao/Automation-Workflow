import { Request, Response, NextFunction } from "express";
import * as pipelineService from "../service/pipelines.service.js"
import { ApiResponse } from "../../../../../utils/ApiResponse.js";
import { getLocationIdByUserId, getUserId } from "../../../../../common/function.js";

export async function getPipelinesController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = await getUserId(req);
    const locationId = await getLocationIdByUserId(userId);
    const pipelines = await pipelineService.getPipelinesService(locationId);
    return ApiResponse(res, 200, "Pipelines retrieved successfully", pipelines);
  } catch (error) {
    next(error);
  }
}
