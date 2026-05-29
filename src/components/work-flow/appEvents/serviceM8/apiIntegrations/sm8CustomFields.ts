import axiosInstance from "@/src/services/apiClient";

export const getServiceM8CustomFields = async (eventKey?: string) => {
  const response = await axiosInstance.get(
    "/servicem8/customfields/all",
    {
      params: eventKey ? { event: eventKey } : undefined,
    }
  );

  return {
    contact: response.data.data?.contact ?? [],
    action: response.data.data?.action ?? [],
  };
};
