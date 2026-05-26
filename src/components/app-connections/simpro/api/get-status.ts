import { AxiosError } from "axios";
import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";
import { getRequestHeaders } from "@/src/services/clientkey.service";

/**
 * Get simPRO integration status (backend Railway, same baseURL as axiosInstance).
 */
export async function getSimproStatus(): Promise<{ connected: boolean }> {
  try {
    const headers = await getRequestHeaders();
    const { data } = await axiosInstance.get(API_ROUTES.SIMPRO.STATUS, {
      headers: { ...headers },
    });
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
