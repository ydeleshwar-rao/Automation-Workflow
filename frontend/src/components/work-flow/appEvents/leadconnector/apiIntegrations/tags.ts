import axiosInstance from "@/src/services/apiClient";

export const getTags = async () => {
  const response = await axiosInstance.get("/leadshub/tags/all");
  return response.data.data.tags;
};
