import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";

/**
 * LeadsHub (GoHighLevel) API client.
 * All authentication is handled via JWT Bearer token in axiosInstance.
 * No clientkey header — the backend resolves the user from the JWT.
 */
export const leadshubApi = {
  getStatus: async (): Promise<{ connected: boolean }> => {
    try {
      const { data } = await axiosInstance.get(API_ROUTES.GHL.STATUS);
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
    const { data } = await axiosInstance.get(API_ROUTES.GHL.CONNECT, {
      params: { returnUrl },
    });
    return data;
  },

  disconnect: async () => {
    const { data } = await axiosInstance.delete(API_ROUTES.GHL.DISCONNECT);
    return data;
  },

  getContacts: async (): Promise<unknown[]> => {
    const { data } = await axiosInstance.get("/leadshub/contacts");
    if (Array.isArray(data)) return data;
    const withContacts = data as { contacts?: unknown[] } | null;
    if (withContacts?.contacts && Array.isArray(withContacts.contacts)) {
      return withContacts.contacts;
    }
    return [];
  },

  syncContacts: async (): Promise<void> => {
    await axiosInstance.post(API_ROUTES.GHL.SYNC, {});
  },

  getActionEventTypes: async (): Promise<{ action_key: string; label: string; description?: string }[]> => {
    const { data } = await axiosInstance.get(API_ROUTES.GHL.ACTION_EVENT_TYPES);
    return data?.data ?? [];
  },

  getTriggers: async (): Promise<{ action_key: string; label: string; description?: string }[]> => {
    const { data } = await axiosInstance.get(API_ROUTES.GHL.ACTION_EVENT_TRIGGERS);
    return data?.data ?? [];
  },

  getActions: async (): Promise<{ action_key: string; label: string; description?: string }[]> => {
    const { data } = await axiosInstance.get(API_ROUTES.GHL.ACTION_EVENT_ACTIONS);
    return data?.data ?? [];
  },
};
