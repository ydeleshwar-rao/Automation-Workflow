import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";

/** The ServiceM8 job fields the frontend reads; the backend passes ServiceM8's job.json through. */
export interface ServiceM8Job {
  uuid: string;
  status?: string | null;
  date?: string | null;
  total_invoice_amount?: string | number | null;
  payment_processed?: string | number | boolean | null;
  [field: string]: unknown;
}

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

  /** Jobs fetched live from ServiceM8 by the backend (GET /servicem8/listjobs). */
  getJobs: async (): Promise<ServiceM8Job[]> => {
    const { data } = await axiosInstance.get<{ data?: ServiceM8Job[] }>(
      API_ROUTES.SERVICEM8.JOBS
    );
    return data.data ?? [];
  },
};
