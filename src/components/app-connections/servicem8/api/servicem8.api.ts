import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";

/**
 * ServiceM8 API client.
 * All authentication is handled via JWT Bearer token in axiosInstance.
 * No clientkey header — the backend resolves the user from the JWT.
 */
export const servicem8Api = {
  getStatus: async (): Promise<{ connected: boolean; needsReauth: boolean }> => {
    try {
      const { data } = await axiosInstance.get(API_ROUTES.SERVICEM8.STATUS);
      const isConnected =
        data?.data?.connected === true ||
        data?.data?.alreadyConnected === true ||
        data?.connected === true;
      const needsReauth =
        data?.data?.needs_reauth === true ||
        data?.needs_reauth === true;
      return { connected: isConnected && !needsReauth, needsReauth: isConnected && needsReauth };
    } catch {
      return { connected: false, needsReauth: false };
    }
  },

  connect: async (returnUrl: string) => {
    const { data } = await axiosInstance.get(API_ROUTES.SERVICEM8.CONNECT, {
      params: { returnUrl },
    });
    return data;
  },

  disconnect: async () => {
    const { data } = await axiosInstance.delete(API_ROUTES.SERVICEM8.DISCONNECT);
    return data;
  },

  getJobs: async (): Promise<Record<string, unknown>[]> => {
    const { data } = await axiosInstance.get<{ servicem8?: Record<string, unknown>[] }>(
      API_ROUTES.SERVICEM8.JOBS
    );
    return data.servicem8 || [];
  },

  sync: async (): Promise<void> => {
    await axiosInstance.post(API_ROUTES.SERVICEM8.SYNC, undefined);
  },
};
