import axios from "axios";
import { getValidAccessToken } from "../../../../../common/function.js";

const GHL_PIPELINES_URL = "https://services.leadconnectorhq.com/opportunities/pipelines";
const GHL_API_VERSION = "2021-07-28";

/** Maps a GHL pipeline to the snake_case shape the frontend already consumes. */
function formatGhlPipeline(pipeline: any, locationId: string) {
  return {
    id: pipeline.id,
    location_id: locationId,
    name: pipeline.name,
    origin_id: pipeline.originId ?? null,
    use_opportunity_probability: pipeline.useOpportunityProbability ?? false,
    stages: pipeline.stages ?? [],
  };
}

/** Pipelines are read live from GHL — we do not keep a local copy. */
export async function getPipelinesService(locationId: string) {
  const accessToken = await getValidAccessToken(locationId);

  try {
    const response = await axios.get(GHL_PIPELINES_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: GHL_API_VERSION,
        Accept: "application/json",
      },
      params: { locationId },
    });

    const pipelines: any[] = response.data?.pipelines ?? [];
    return pipelines.map((pipeline) => formatGhlPipeline(pipeline, locationId));
  } catch (error: any) {
    console.error("GHL pipelines fetch failed:", error.response?.data || error.message);
    throw error;
  }
}
