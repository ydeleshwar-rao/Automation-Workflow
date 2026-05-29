import axiosInstance from "@/src/services/apiClient";

export const getCustomFileds = async () => {
  const response = await axiosInstance.get("/leadshub/pipelines/all");
  return response.data.data;
};
