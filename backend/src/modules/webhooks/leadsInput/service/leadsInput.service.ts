import { CreateLeadInputDTO } from "../dto/createLeadInput.dto.js";
import { leadInputRepository } from "../repositories/leadsInput.repository.js";
import { ApiError } from "../../../../utils/ApiError.js";

const UNKNOWN_SOURCE = "unknown";

/** Stores the raw lead webhook; only locations with a GHL token may post leads. */
export async function createLeadInput(locationId: string, dto: CreateLeadInputDTO) {
  const hasToken = await leadInputRepository.hasGhlToken(locationId);
  if (!hasToken) {
    throw new ApiError(404, `Token not found for location: ${locationId}`);
  }

  return leadInputRepository.create({
    client_id: locationId,
    source: dto.source || UNKNOWN_SOURCE,
    payload: dto.payload,
    headers: dto.headers || {},
  });
}

/** Payload of the most recent lead webhook received for the location. */
export async function getLeadInputService(locationId: string) {
  const leadData = await leadInputRepository.findLatestPayload(locationId);
  if (!leadData) {
    throw new ApiError(404, `lead data not found for location: ${locationId}`);
  }
  return leadData;
}
