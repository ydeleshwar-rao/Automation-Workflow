import axiosInstance from "@/src/services/apiClient";
import { getActiveClientKey } from "@/src/store/localStorage";

export interface CommusoftActionEvent {
  action_key: string;
  label: string;
  type: "trigger" | "action";
  description?: string;
}

export const getCommusoftTriggers = async (): Promise<CommusoftActionEvent[]> => {
  const clientKey = getActiveClientKey();

  const response = await axiosInstance.get(
    "/automation/action-event-types/commusoft/triggers",
    { headers: { clientkey: clientKey } }
  );

  return response.data?.data ?? [];
};

export const getCommusoftActions = async (): Promise<CommusoftActionEvent[]> => {
  const clientKey = getActiveClientKey();

  const response = await axiosInstance.get(
    "/automation/action-event-types/commusoft/actions",
    { headers: { clientkey: clientKey } }
  );

  return response.data?.data ?? [];
};
