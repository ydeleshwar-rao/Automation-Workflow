import axiosInstance from "@/src/services/apiClient"
import { getActiveClientKey } from "@/src/store/localStorage"


export const getTags = async () => {
  const clientKey = getActiveClientKey()

  const response = await axiosInstance.get(
    "/leadshub/tags/all",
    { headers: { clientkey: clientKey } }
  )

  return response.data.data.tags;
}