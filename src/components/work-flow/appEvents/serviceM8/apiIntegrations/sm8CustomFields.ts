import axiosInstance from "@/src/services/apiClient";
import { getActiveClientKey } from "@/src/store/localStorage";

export const getServiceM8CustomFields = async (eventKey?: string) => {
  const clientKey = getActiveClientKey();

  const response = await axiosInstance.get(
    "/servicem8/customfields/all",
    {
      headers: { clientkey: clientKey },
      params: eventKey ? { event: eventKey } : undefined,
    }
  );

  return {
    contact: response.data.data?.contact ?? [],
    action: response.data.data?.action ?? [],
  };
};
