import axiosInstance from "@/src/services/apiClient"
import { getActiveClientKey } from "@/src/store/localStorage"


export const getCustomFileds = async () => {
  const clientKey = getActiveClientKey()

  const response = await axiosInstance.get(
    "/leadshub/pipelines/all",
    { headers: { clientkey: clientKey } }
  )

  return response.data.data;
}