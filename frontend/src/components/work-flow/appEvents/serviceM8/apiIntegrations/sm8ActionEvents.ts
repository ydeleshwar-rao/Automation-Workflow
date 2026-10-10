import axiosInstance from "@/src/services/apiClient";

export interface ServiceM8ActionEvent {
  action_key: string;
  label: string;
  type: "trigger" | "action";
  description?: string;
}

export const getServiceM8Triggers = async (): Promise<ServiceM8ActionEvent[]> => {
  const response = await axiosInstance.get(
    "/automation/action-event-types/service-m8/triggers"
  );
  return response.data?.data ?? [];
};

export const getServiceM8Actions = async (): Promise<ServiceM8ActionEvent[]> => {
  const response = await axiosInstance.get(
    "/automation/action-event-types/service-m8/actions"
  );
  return response.data?.data ?? [];
};
