import { API_ROUTES } from "@/src/constants/api.constants";
import axiosInstance from "@/src/services/apiClient";
import { getActiveClientKey } from "@/src/store/localStorage";

const getHeaders = () => {
  console.log("Getting headers with client key:", getActiveClientKey());
  return { clientkey: getActiveClientKey() };
};

export const commusoftApi = {
  getStatus: async (): Promise<{ connected: boolean }> => {
    try {
      const { data } = await axiosInstance.get(API_ROUTES.COMMUSOFT.STATUS, { headers: getHeaders() });
      console.log("Commusoft status response:", data);
      const isConnected =
        data.data?.connected === true ||
        data.data?.alreadyConnected === true;
      return { connected: isConnected };
    } catch {
      return { connected: false };
    }
  },

  connect: async (credentials: { clientId: string; username: string; password: string }) => {
    const { data } = await axiosInstance.post(API_ROUTES.COMMUSOFT.CONNECT, credentials, { headers: getHeaders() });
    return data;
  },

  disconnect: async () => {
    const { data } = await axiosInstance.delete(API_ROUTES.COMMUSOFT.DISCONNECT, { headers: getHeaders() });
    return data;
  },

  getJobs: async (): Promise<any[]> => {
    const { data } = await axiosInstance.get<any[]>(API_ROUTES.COMMUSOFT.GET_ALL_JOBS, { headers: getHeaders() });
    return data;
  },

  sync: async (): Promise<void> => {
    await axiosInstance.post(API_ROUTES.COMMUSOFT.SYNC, {}, { headers: getHeaders() });
  },
};
