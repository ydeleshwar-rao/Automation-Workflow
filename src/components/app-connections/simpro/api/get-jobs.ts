import { API_ROUTES } from "@/src/constants/api.constants";
import { SimproJob } from "@/src/lib/simpro/types";

/**
 * Fetch all simPRO jobs
 */
export async function getSimproJobs(): Promise<SimproJob[]> {
  const response = await fetch(API_ROUTES.SIMPRO.JOBS);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch simPRO jobs");
  }

  return response.json();
}
