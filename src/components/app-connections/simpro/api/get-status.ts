import { AxiosError } from "axios";
import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";

/**
 * Get simPRO integration status.
 * Auth is handled via JWT Bearer token in axiosInstance — no clientkey header.
 */
export async function getSimproStatus(): Promise<{ connected: boolean }> {
  try {
    const { data } = await axiosInstance.get(API_ROUTES.SIMPRO.STATUS);
    const connected =
      data?.data?.connected === true ||
      data?.data?.alreadyConnected === true ||
      data?.connected === true;
    return { connected };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { connected: false };
    }
    return { connected: false };
  }
}
