import axiosInstance from "@/src/services/apiClient";

export interface CommusoftActionEvent {
  action_key: string;
  label: string;
  type: "trigger" | "action";
  description?: string;
}

export const getCommusoftTriggers = async (): Promise<CommusoftActionEvent[]> => {
  const response = await axiosInstance.get(
    "/automation/action-event-types/commusoft/triggers"
  );
  return response.data?.data ?? [];
};

export const getCommusoftActions = async (): Promise<CommusoftActionEvent[]> => {
  const response = await axiosInstance.get(
    "/automation/action-event-types/commusoft/actions"
  );
  return response.data?.data ?? [];
};
