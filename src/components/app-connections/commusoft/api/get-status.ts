import { API_ROUTES } from "@/src/constants/api.constants";
import axiosInstance from "@/src/services/apiClient";

export async function getCommusoftStatus(): Promise<{ connected: boolean }> {
  try {
    const { data } = await axiosInstance.get(API_ROUTES.COMMUSOFT.STATUS);
    const isConnected =
      data.data?.connected === true ||
      data.data?.alreadyConnected === true;
    return { connected: isConnected };
  } catch {
    return { connected: false };
  }
}
