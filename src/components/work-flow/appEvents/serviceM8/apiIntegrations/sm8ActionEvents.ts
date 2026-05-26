import axiosInstance from "@/src/services/apiClient";
import { getActiveClientKey } from "@/src/store/localStorage";

export interface ServiceM8ActionEvent {
  action_key: string;
  label: string;
  type: "trigger" | "action";
  description?: string;
}

export const getServiceM8Triggers = async (): Promise<ServiceM8ActionEvent[]> => {
  const clientKey = getActiveClientKey();

  const response = await axiosInstance.get(
    "/automation/action-event-types/service-m8/triggers",
    { headers: { clientkey: clientKey } }
  );

  return response.data?.data ?? [];
};

export const getServiceM8Actions = async (): Promise<ServiceM8ActionEvent[]> => {
  const clientKey = getActiveClientKey();

  const response = await axiosInstance.get(
    "/automation/action-event-types/service-m8/actions",
    { headers: { clientkey: clientKey } }
  );

  return response.data?.data ?? [];
};
