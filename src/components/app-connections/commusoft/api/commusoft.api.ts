import { API_ROUTES } from "@/src/constants/api.constants";
import axiosInstance from "@/src/services/apiClient";

/**
 * Commusoft API client.
 * All authentication is handled via JWT Bearer token in axiosInstance.
 * No clientkey header — the backend resolves the user from the JWT.
 */
export const commusoftApi = {
  getStatus: async (): Promise<{ connected: boolean }> => {
    try {
      const { data } = await axiosInstance.get(API_ROUTES.COMMUSOFT.STATUS);
      const isConnected =
        data.data?.connected === true ||
        data.data?.alreadyConnected === true;
      return { connected: isConnected };
    } catch {
      return { connected: false };
    }
  },

  connect: async (credentials: { clientId: string; username: string; password: string }) => {
    const { data } = await axiosInstance.post(API_ROUTES.COMMUSOFT.CONNECT, credentials);
    return data;
  },

  disconnect: async () => {
    const { data } = await axiosInstance.delete(API_ROUTES.COMMUSOFT.DISCONNECT);
    return data;
  },

  getJobs: async (): Promise<unknown[]> => {
    const { data } = await axiosInstance.get<unknown[]>(API_ROUTES.COMMUSOFT.GET_ALL_JOBS);
    return data;
  },

  sync: async (): Promise<void> => {
    await axiosInstance.post(API_ROUTES.COMMUSOFT.SYNC, {});
  },
};
