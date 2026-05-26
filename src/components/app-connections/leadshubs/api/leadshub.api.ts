import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";
import { getClientUserWithProfile } from "@/src/services/auth.client.service";
import { getActiveClientKey } from "@/src/store/localStorage";

const getHeaders = () => {
  return { clientkey: getActiveClientKey() };
};

export const leadshubApi = {
  getStatus: async (): Promise<{ connected: boolean }> => {
    try {
      const { data } = await axiosInstance.get(API_ROUTES.GHL.STATUS, { headers: getHeaders() });
      const isConnected =
        data?.data?.connected === true ||
        data?.data?.alreadyConnected === true ||
        data?.connected === true ||
        data?.alreadyConnected === true ||
        data?.success === true;
      return { connected: isConnected };
    } catch {
      return { connected: false };
    }
  },

  connect: async (returnUrl: string) => {
    const { user, profile } = await getClientUserWithProfile();
    if (!user) {
      throw new Error("Cannot connect LeadsHub — no authenticated user. Please log in again.");
    }
    const activeClientKey = getActiveClientKey();
    if (!activeClientKey) {
      throw new Error("Cannot connect LeadsHub — no client key found in your profile.");
    }

    const { data } = await axiosInstance.get(API_ROUTES.GHL.CONNECT, {
      params: { returnUrl },
      headers: { clientkey: activeClientKey },
    });
    return data;
  },

  disconnect: async () => {
    const { data } = await axiosInstance.delete(API_ROUTES.GHL.DISCONNECT, { headers: getHeaders() });
    return data;
  },

  getContacts: async (): Promise<unknown[]> => {
    const { data } = await axiosInstance.get("/leadshub/contacts", { headers: getHeaders() });
    if (Array.isArray(data)) return data;
    const withContacts = data as { contacts?: unknown[] } | null;
    if (withContacts?.contacts && Array.isArray(withContacts.contacts)) {
      return withContacts.contacts;
    }
    return [];
  },

  syncContacts: async (): Promise<void> => {
    await axiosInstance.post(API_ROUTES.GHL.SYNC, {}, { headers: getHeaders() });
  },

  getActionEventTypes: async (): Promise<{ action_key: string; label: string; description?: string }[]> => {
    const { data } = await axiosInstance.get(API_ROUTES.GHL.ACTION_EVENT_TYPES, { headers: getHeaders() });
    return data?.data ?? [];
  },

  getTriggers: async (): Promise<{ action_key: string; label: string; description?: string }[]> => {
    const { data } = await axiosInstance.get(API_ROUTES.GHL.ACTION_EVENT_TRIGGERS, { headers: getHeaders() });
    return data?.data ?? [];
  },

  getActions: async (): Promise<{ action_key: string; label: string; description?: string }[]> => {
    const { data } = await axiosInstance.get(API_ROUTES.GHL.ACTION_EVENT_ACTIONS, { headers: getHeaders() });
    return data?.data ?? [];
  },
};
