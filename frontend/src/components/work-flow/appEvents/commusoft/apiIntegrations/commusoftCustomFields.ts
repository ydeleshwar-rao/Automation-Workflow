import axiosInstance from "@/src/services/apiClient";

export const getCommusoftCustomFields = async (eventKey?: string) => {
  const response = await axiosInstance.get(
    "/commusoft/customfields/all",
    {
      params: eventKey ? { event: eventKey } : undefined,
    }
  );

  return {
    contact: response.data.data?.contact ?? [],
    action: response.data.data?.action ?? [],
  };
};
