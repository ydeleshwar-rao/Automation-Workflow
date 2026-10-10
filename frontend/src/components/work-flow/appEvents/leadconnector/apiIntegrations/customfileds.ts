import axiosInstance from "@/src/services/apiClient";

export const getCustomFileds = async () => {
  const response = await axiosInstance.get("/leadshub/customfields/all");
  return {
    contact: response.data.data.contact,
    action: response.data.data.action,
  };
};
