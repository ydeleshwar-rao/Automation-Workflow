import axios from "axios";
import { getValidAccessToken } from "../../../../common/function.js";
import { UpdateOpportunityDTO } from "../dto/update-opportunities.dto.js";

const GHL_OPPORTUNITIES_URL = "https://services.leadconnectorhq.com/opportunities";
const GHL_API_VERSION = "2021-07-28";

async function buildGhlHeaders(locationId: string) {
  const accessToken = await getValidAccessToken(locationId);
  return {
    Authorization: `Bearer ${accessToken}`,
    Version: GHL_API_VERSION,
    Accept: "application/json",
  };
}

function logGhlError(context: string, error: any) {
  console.error(`❌ ${context}`, {
    status: error.response?.status,
    data: error.response?.data,
    message: error.message,
  });
}

/** Opportunities are read live from GHL — we do not keep a local copy. */
export async function getOpportunity(locationId: string, opportunityId: string) {
  const headers = await buildGhlHeaders(locationId);

  try {
    const response = await axios.get(`${GHL_OPPORTUNITIES_URL}/${opportunityId}`, { headers });
    return response.data.opportunity ?? null;
  } catch (error: any) {
    logGhlError("GHL get opportunity failed", error);
    throw error;
  }
}

export async function updateOpportunity(
  locationId: string,
  opportunityId: string,
  updateDTO: UpdateOpportunityDTO
) {
  const headers = await buildGhlHeaders(locationId);

  try {
    const response = await axios.put(`${GHL_OPPORTUNITIES_URL}/${opportunityId}`, updateDTO, { headers });
    return response.data.opportunity;
  } catch (error: any) {
    logGhlError("GHL update opportunity failed", error);
    throw error;
  }
}
